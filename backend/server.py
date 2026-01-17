from fastapi import FastAPI, APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.responses import StreamingResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr, ConfigDict
from typing import List, Optional, Literal
import uuid
from datetime import datetime, timezone, timedelta
from passlib.context import CryptContext
from jose import JWTError, jwt
import io
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_LEFT

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Security
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()
SECRET_KEY = os.getenv("JWT_SECRET_KEY", "your-secret-key-change-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 24 hours

# Create the main app
app = FastAPI()
api_router = APIRouter(prefix="/api")

# ============= MODELS =============

class UserRole(str):
    ADMIN = "admin"
    EMPLOYEE = "employee"

class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: EmailStr
    full_name: str
    role: Literal["admin", "employee"]
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    role: Literal["admin", "employee"] = "employee"

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str
    user: User

class Employee(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    employee_id: str = Field(default_factory=lambda: f"EMP{str(uuid.uuid4())[:8].upper()}")
    name: str
    email: EmailStr
    department: str
    joining_date: str
    reporting_manager_id: Optional[str] = None
    invited: bool = False
    user_id: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class EmployeeCreate(BaseModel):
    name: str
    email: EmailStr
    department: str
    joining_date: str
    reporting_manager_id: Optional[str] = None

class Payroll(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    employee_id: str
    payroll_structure_id: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class PayrollStructure(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    basic_salary: float
    allowances: float = 0.0
    deductions: float = 0.0
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class PayrollStructureCreate(BaseModel):
    name: str
    basic_salary: float
    allowances: float = 0.0
    deductions: float = 0.0

class PayrollCreate(BaseModel):
    employee_id: str
    payroll_structure_id: str

class Payslip(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    employee_id: str
    month: str  # Format: YYYY-MM
    basic_salary: float
    allowances: float
    deductions: float
    net_pay: float
    generated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class PayslipCreate(BaseModel):
    employee_id: str
    month: str

class LeavePolicy(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    days_per_year: int
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class LeavePolicyCreate(BaseModel):
    name: str
    days_per_year: int

class LeaveRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    employee_id: str
    leave_policy_id: str
    start_date: str
    end_date: str
    reason: str
    status: Literal["pending", "approved", "rejected"] = "pending"
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class LeaveRequestCreate(BaseModel):
    leave_policy_id: str
    start_date: str
    end_date: str
    reason: str

class LeaveRequestUpdate(BaseModel):
    status: Literal["approved", "rejected"]

class LeaveBalance(BaseModel):
    leave_policy_id: str
    leave_policy_name: str
    total_days: int
    used_days: int
    remaining_days: int

# ============= AUTH HELPERS =============

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
    )
    try:
        token = credentials.credentials
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if user is None:
        raise credentials_exception
    return User(**user)

async def get_admin_user(current_user: User = Depends(get_current_user)):
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    return current_user

# ============= AUTH ROUTES =============

@api_router.post("/auth/register", response_model=Token)
async def register(user_data: UserCreate):
    # Check if user exists
    existing = await db.users.find_one({"email": user_data.email}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Create user
    user = User(
        email=user_data.email,
        full_name=user_data.full_name,
        role=user_data.role
    )
    user_dict = user.model_dump()
    user_dict["hashed_password"] = get_password_hash(user_data.password)
    user_dict["created_at"] = user_dict["created_at"].isoformat()
    
    await db.users.insert_one(user_dict)
    
    # If user is employee, link to existing employee record if it exists
    if user.role == "employee":
        employee_record = await db.employees.find_one({"email": user_data.email}, {"_id": 0})
        if employee_record:
            await db.employees.update_one(
                {"email": user_data.email},
                {"$set": {"user_id": user.id}}
            )
    
    # Create token
    access_token = create_access_token(data={"sub": user.id, "role": user.role})
    return Token(access_token=access_token, token_type="bearer", user=user)

@api_router.post("/auth/login", response_model=Token)
async def login(credentials: UserLogin):
    user_doc = await db.users.find_one({"email": credentials.email}, {"_id": 0})
    if not user_doc:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    if not verify_password(credentials.password, user_doc["hashed_password"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    user = User(**user_doc)
    access_token = create_access_token(data={"sub": user.id, "role": user.role})
    return Token(access_token=access_token, token_type="bearer", user=user)

@api_router.get("/auth/me", response_model=User)
async def get_me(current_user: User = Depends(get_current_user)):
    return current_user

# ============= EMPLOYEE ROUTES =============

@api_router.post("/employees", response_model=Employee)
async def create_employee(employee_data: EmployeeCreate, admin: User = Depends(get_admin_user)):
    # Check if employee exists
    existing = await db.employees.find_one({"email": employee_data.email}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Employee with this email already exists")
    
    employee = Employee(**employee_data.model_dump())
    employee_dict = employee.model_dump()
    employee_dict["created_at"] = employee_dict["created_at"].isoformat()
    
    await db.employees.insert_one(employee_dict)
    
    # Dummy email invitation (Brevo disabled for now)
    logging.info(f"[DUMMY] Email invitation sent to {employee.email}")
    
    return employee

@api_router.get("/employees", response_model=List[Employee])
async def list_employees(current_user: User = Depends(get_current_user)):
    employees = await db.employees.find({}, {"_id": 0}).to_list(1000)
    for emp in employees:
        if isinstance(emp.get("created_at"), str):
            emp["created_at"] = datetime.fromisoformat(emp["created_at"])
    return employees

@api_router.get("/employees/{employee_id}", response_model=Employee)
async def get_employee(employee_id: str, current_user: User = Depends(get_current_user)):
    employee = await db.employees.find_one({"id": employee_id}, {"_id": 0})
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    if isinstance(employee.get("created_at"), str):
        employee["created_at"] = datetime.fromisoformat(employee["created_at"])
    return Employee(**employee)

# ============= PAYROLL ROUTES =============

@api_router.post("/payroll-structures", response_model=PayrollStructure)
async def create_payroll_structure(structure_data: PayrollStructureCreate, admin: User = Depends(get_admin_user)):
    structure = PayrollStructure(**structure_data.model_dump())
    structure_dict = structure.model_dump()
    structure_dict["created_at"] = structure_dict["created_at"].isoformat()
    
    await db.payroll_structures.insert_one(structure_dict)
    return structure

@api_router.get("/payroll-structures", response_model=List[PayrollStructure])
async def list_payroll_structures(admin: User = Depends(get_admin_user)):
    structures = await db.payroll_structures.find({}, {"_id": 0}).to_list(1000)
    for struct in structures:
        if isinstance(struct.get("created_at"), str):
            struct["created_at"] = datetime.fromisoformat(struct["created_at"])
    return structures

@api_router.post("/payroll", response_model=Payroll)
async def assign_payroll(payroll_data: PayrollCreate, admin: User = Depends(get_admin_user)):
    # Check if employee exists
    employee = await db.employees.find_one({"id": payroll_data.employee_id}, {"_id": 0})
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    
    # Check if payroll structure exists
    structure = await db.payroll_structures.find_one({"id": payroll_data.payroll_structure_id}, {"_id": 0})
    if not structure:
        raise HTTPException(status_code=404, detail="Payroll structure not found")
    
    # Check if payroll already exists for this employee
    existing = await db.payroll.find_one({"employee_id": payroll_data.employee_id}, {"_id": 0})
    if existing:
        # Update existing payroll
        await db.payroll.update_one(
            {"employee_id": payroll_data.employee_id},
            {"$set": {"payroll_structure_id": payroll_data.payroll_structure_id}}
        )
        updated = await db.payroll.find_one({"employee_id": payroll_data.employee_id}, {"_id": 0})
        if isinstance(updated.get("created_at"), str):
            updated["created_at"] = datetime.fromisoformat(updated["created_at"])
        return Payroll(**updated)
    
    payroll = Payroll(**payroll_data.model_dump())
    payroll_dict = payroll.model_dump()
    payroll_dict["created_at"] = payroll_dict["created_at"].isoformat()
    
    await db.payroll.insert_one(payroll_dict)
    return payroll

@api_router.get("/payroll/{employee_id}")
async def get_payroll(employee_id: str, admin: User = Depends(get_admin_user)):
    payroll = await db.payroll.find_one({"employee_id": employee_id}, {"_id": 0})
    if not payroll:
        return None
    if isinstance(payroll.get("created_at"), str):
        payroll["created_at"] = datetime.fromisoformat(payroll["created_at"])
    
    # Get payroll structure details
    structure = await db.payroll_structures.find_one({"id": payroll["payroll_structure_id"]}, {"_id": 0})
    if structure:
        return {
            **payroll,
            "structure": structure
        }
    return payroll

# ============= PAYSLIP ROUTES =============

@api_router.post("/payslips/generate", response_model=Payslip)
async def generate_payslip(payslip_data: PayslipCreate, admin: User = Depends(get_admin_user)):
    # Get employee
    employee = await db.employees.find_one({"id": payslip_data.employee_id}, {"_id": 0})
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    
    # Get payroll
    payroll = await db.payroll.find_one({"employee_id": payslip_data.employee_id}, {"_id": 0})
    if not payroll:
        raise HTTPException(status_code=404, detail="Payroll not assigned for this employee")
    
    # Check if payslip already exists for this month
    existing = await db.payslips.find_one(
        {"employee_id": payslip_data.employee_id, "month": payslip_data.month},
        {"_id": 0}
    )
    if existing:
        raise HTTPException(status_code=400, detail="Payslip already generated for this month")
    
    # Calculate net pay
    net_pay = payroll["basic_salary"] + payroll["allowances"] - payroll["deductions"]
    
    payslip = Payslip(
        employee_id=payslip_data.employee_id,
        month=payslip_data.month,
        basic_salary=payroll["basic_salary"],
        allowances=payroll["allowances"],
        deductions=payroll["deductions"],
        net_pay=net_pay
    )
    payslip_dict = payslip.model_dump()
    payslip_dict["generated_at"] = payslip_dict["generated_at"].isoformat()
    
    await db.payslips.insert_one(payslip_dict)
    return payslip

@api_router.get("/payslips/employee/{employee_id}", response_model=List[Payslip])
async def get_employee_payslips(employee_id: str, current_user: User = Depends(get_current_user)):
    # Employee can only view their own payslips
    if current_user.role == "employee":
        employee = await db.employees.find_one({"user_id": current_user.id}, {"_id": 0})
        if not employee or employee["id"] != employee_id:
            raise HTTPException(status_code=403, detail="Access denied")
    
    payslips = await db.payslips.find({"employee_id": employee_id}, {"_id": 0}).to_list(1000)
    for ps in payslips:
        if isinstance(ps.get("generated_at"), str):
            ps["generated_at"] = datetime.fromisoformat(ps["generated_at"])
    return sorted(payslips, key=lambda x: x["month"], reverse=True)

@api_router.get("/payslips/{payslip_id}/download")
async def download_payslip(payslip_id: str, current_user: User = Depends(get_current_user)):
    payslip = await db.payslips.find_one({"id": payslip_id}, {"_id": 0})
    if not payslip:
        raise HTTPException(status_code=404, detail="Payslip not found")
    
    # Employee can only download their own payslips
    if current_user.role == "employee":
        employee = await db.employees.find_one({"user_id": current_user.id}, {"_id": 0})
        if not employee or employee["id"] != payslip["employee_id"]:
            raise HTTPException(status_code=403, detail="Access denied")
    
    # Get employee details
    employee = await db.employees.find_one({"id": payslip["employee_id"]}, {"_id": 0})
    
    # Generate PDF
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter)
    elements = []
    styles = getSampleStyleSheet()
    
    # Title
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontSize=24,
        textColor=colors.HexColor('#1a1a1a'),
        spaceAfter=30,
        alignment=TA_CENTER
    )
    elements.append(Paragraph("PAYSLIP", title_style))
    elements.append(Spacer(1, 0.3*inch))
    
    # Employee details
    info_data = [
        ['Employee Name:', employee['name']],
        ['Email:', employee['email']],
        ['Department:', employee['department']],
        ['Month:', payslip['month']],
        ['Generated On:', datetime.fromisoformat(payslip['generated_at']).strftime('%Y-%m-%d') if isinstance(payslip['generated_at'], str) else payslip['generated_at'].strftime('%Y-%m-%d')],
    ]
    info_table = Table(info_data, colWidths=[2*inch, 4*inch])
    info_table.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (-1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 0), (-1, -1), 11),
        ('TEXTCOLOR', (0, 0), (0, -1), colors.HexColor('#4a4a4a')),
        ('TEXTCOLOR', (1, 0), (1, -1), colors.HexColor('#1a1a1a')),
        ('LEFTPADDING', (0, 0), (-1, -1), 0),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
    ]))
    elements.append(info_table)
    elements.append(Spacer(1, 0.5*inch))
    
    # Salary breakdown
    salary_data = [
        ['Description', 'Amount'],
        ['Basic Salary', f"${payslip['basic_salary']:.2f}"],
        ['Allowances', f"${payslip['allowances']:.2f}"],
        ['Deductions', f"-${payslip['deductions']:.2f}"],
        ['Net Pay', f"${payslip['net_pay']:.2f}"],
    ]
    salary_table = Table(salary_data, colWidths=[3*inch, 2*inch])
    salary_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#2a2a2a')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 11),
        ('ALIGN', (1, 0), (1, -1), 'RIGHT'),
        ('GRID', (0, 0), (-1, -1), 1, colors.HexColor('#cccccc')),
        ('BACKGROUND', (0, 4), (-1, 4), colors.HexColor('#f0f0f0')),
        ('FONTNAME', (0, 4), (-1, 4), 'Helvetica-Bold'),
        ('TOPPADDING', (0, 0), (-1, -1), 10),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 10),
    ]))
    elements.append(salary_table)
    
    doc.build(elements)
    buffer.seek(0)
    
    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=payslip_{payslip['month']}_{employee['name'].replace(' ', '_')}.pdf"}
    )

# ============= LEAVE POLICY ROUTES =============

@api_router.post("/leave-policies", response_model=LeavePolicy)
async def create_leave_policy(policy_data: LeavePolicyCreate, admin: User = Depends(get_admin_user)):
    policy = LeavePolicy(**policy_data.model_dump())
    policy_dict = policy.model_dump()
    policy_dict["created_at"] = policy_dict["created_at"].isoformat()
    
    await db.leave_policies.insert_one(policy_dict)
    return policy

@api_router.get("/leave-policies", response_model=List[LeavePolicy])
async def list_leave_policies(current_user: User = Depends(get_current_user)):
    policies = await db.leave_policies.find({}, {"_id": 0}).to_list(1000)
    for policy in policies:
        if isinstance(policy.get("created_at"), str):
            policy["created_at"] = datetime.fromisoformat(policy["created_at"])
    return policies

@api_router.delete("/leave-policies/{policy_id}")
async def delete_leave_policy(policy_id: str, admin: User = Depends(get_admin_user)):
    result = await db.leave_policies.delete_one({"id": policy_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Leave policy not found")
    return {"message": "Leave policy deleted successfully"}

# ============= LEAVE REQUEST ROUTES =============

@api_router.post("/leave-requests", response_model=LeaveRequest)
async def create_leave_request(request_data: LeaveRequestCreate, current_user: User = Depends(get_current_user)):
    if current_user.role != "employee":
        raise HTTPException(status_code=403, detail="Only employees can apply for leave")
    
    # Get employee ID from user
    employee = await db.employees.find_one({"user_id": current_user.id}, {"_id": 0})
    if not employee:
        raise HTTPException(status_code=404, detail="Employee profile not found")
    
    # Verify leave policy exists
    policy = await db.leave_policies.find_one({"id": request_data.leave_policy_id}, {"_id": 0})
    if not policy:
        raise HTTPException(status_code=404, detail="Leave policy not found")
    
    leave_request = LeaveRequest(
        employee_id=employee["id"],
        **request_data.model_dump()
    )
    request_dict = leave_request.model_dump()
    request_dict["created_at"] = request_dict["created_at"].isoformat()
    
    await db.leave_requests.insert_one(request_dict)
    return leave_request

@api_router.get("/leave-requests", response_model=List[LeaveRequest])
async def list_leave_requests(current_user: User = Depends(get_current_user)):
    if current_user.role == "admin":
        requests = await db.leave_requests.find({}, {"_id": 0}).to_list(1000)
    else:
        employee = await db.employees.find_one({"user_id": current_user.id}, {"_id": 0})
        if not employee:
            return []
        requests = await db.leave_requests.find({"employee_id": employee["id"]}, {"_id": 0}).to_list(1000)
    
    for req in requests:
        if isinstance(req.get("created_at"), str):
            req["created_at"] = datetime.fromisoformat(req["created_at"])
    return sorted(requests, key=lambda x: x["created_at"], reverse=True)

@api_router.patch("/leave-requests/{request_id}", response_model=LeaveRequest)
async def update_leave_request(request_id: str, update_data: LeaveRequestUpdate, admin: User = Depends(get_admin_user)):
    result = await db.leave_requests.update_one(
        {"id": request_id},
        {"$set": {"status": update_data.status}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Leave request not found")
    
    updated = await db.leave_requests.find_one({"id": request_id}, {"_id": 0})
    if isinstance(updated.get("created_at"), str):
        updated["created_at"] = datetime.fromisoformat(updated["created_at"])
    return LeaveRequest(**updated)

@api_router.get("/leave-requests/balance", response_model=List[LeaveBalance])
async def get_leave_balance(current_user: User = Depends(get_current_user)):
    if current_user.role != "employee":
        raise HTTPException(status_code=403, detail="Only employees can view leave balance")
    
    employee = await db.employees.find_one({"user_id": current_user.id}, {"_id": 0})
    if not employee:
        raise HTTPException(status_code=404, detail="Employee profile not found")
    
    policies = await db.leave_policies.find({}, {"_id": 0}).to_list(1000)
    balances = []
    
    for policy in policies:
        # Calculate used days from approved leave requests
        approved_requests = await db.leave_requests.find({
            "employee_id": employee["id"],
            "leave_policy_id": policy["id"],
            "status": "approved"
        }, {"_id": 0}).to_list(1000)
        
        used_days = 0
        for req in approved_requests:
            # Simple day calculation (can be improved)
            from datetime import datetime
            start = datetime.strptime(req["start_date"], "%Y-%m-%d")
            end = datetime.strptime(req["end_date"], "%Y-%m-%d")
            used_days += (end - start).days + 1
        
        balances.append(LeaveBalance(
            leave_policy_id=policy["id"],
            leave_policy_name=policy["name"],
            total_days=policy["days_per_year"],
            used_days=used_days,
            remaining_days=policy["days_per_year"] - used_days
        ))
    
    return balances

# Include router
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
