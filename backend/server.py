from fastapi import FastAPI, APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.responses import StreamingResponse
from dotenv import load_dotenv
from uuid import uuid4
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
from jinja2 import Environment, BaseLoader, TemplateError
# from weasyprint import HTML, CSS

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

class Department(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    description: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class DepartmentCreate(BaseModel):
    name: str
    description: Optional[str] = None

class Employee(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    employee_id: str = Field(default_factory=lambda: f"EMP{str(uuid.uuid4())[:8].upper()}")
    name: str
    email: EmailStr
    department_id: Optional[str] = None
    department: Optional[str] = None  # Keep for backward compatibility
    joining_date: str
    reporting_manager_id: Optional[str] = None
    invited: bool = False
    user_id: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class EmployeeCreate(BaseModel):
    name: str
    email: EmailStr
    department_id: str
    joining_date: str
    reporting_manager_id: Optional[str] = None

class EmployeeUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    department_id: Optional[str] = None
    joining_date: Optional[str] = None
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
    salary_types: list
    net_salary: float
    employee_count: int=0
    print_format_id: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
class SalaryType(BaseModel):
    type: str
    amount: float
class PayrollStructureCreate(BaseModel):
    name: str
    salary_types: List[SalaryType]
    net_salary: float = 0.0
    employee_count: int=0
    print_format_id: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


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

class PrintFormat(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    template_html: str  # Jinja2 template HTML
    is_default: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class PrintFormatCreate(BaseModel):
    name: str
    template_html: str
    is_default: bool = False

class LeaveType(BaseModel):
    type: str  # e.g., "Casual Leave"
    days: int  # e.g., 12

class LeavePolicy(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str  # e.g., "Standard Employee Policy"
    leave_types: List[LeaveType]  # Multiple leave types in one policy
    description: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class LeavePolicyCreate(BaseModel):
    name: str
    leave_types: List[LeaveType]
    description: Optional[str] = None

class EmployeePolicyAssignment(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    employee_id: str
    leave_policy_id: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class EmployeePolicyAssignmentCreate(BaseModel):
    employee_id: str
    leave_policy_id: str

class LeaveRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    employee_id: str
    leave_type: str  # e.g., "Casual Leave" - now just a string
    start_date: str
    end_date: str
    reason: str
    status: Literal["pending", "approved", "rejected"] = "pending"
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class LeaveRequestCreate(BaseModel):
    leave_type: str
    start_date: str
    end_date: str
    reason: str

class LeaveRequestUpdate(BaseModel):
    status: Literal["approved", "rejected"]

class LeaveBalance(BaseModel):
    leave_type: str
    allocated_days: int
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

# ============= DEPARTMENT ROUTES =============
@api_router.get("/departments-with-count")
async def list_departments_with_count(admin: User = Depends(get_admin_user)):
    departments = await db.departments.find({}, {"_id": 0}).to_list(1000)

    for dept in departments:
        count = await db.employees.count_documents({"department_id": dept["id"]})
        dept["employee_count"] = count

    return departments

@api_router.post("/departments", response_model=Department)
async def create_department(dept_data: DepartmentCreate, admin: User = Depends(get_admin_user)):
    department = Department(**dept_data.model_dump())
    dept_dict = department.model_dump()
    dept_dict["created_at"] = dept_dict["created_at"].isoformat()
    
    await db.departments.insert_one(dept_dict)
    return department

@api_router.get("/departments", response_model=List[Department])
async def list_departments(current_user: User = Depends(get_current_user)):
    departments = await db.departments.find({}, {"_id": 0}).to_list(1000)
    for dept in departments:
        if isinstance(dept.get("created_at"), str):
            dept["created_at"] = datetime.fromisoformat(dept["created_at"])
    return departments
@api_router.delete("/departments/{department_id}")
async def delete_department(department_id: str, admin: User = Depends(get_admin_user)):
    emp_count = await db.employees.count_documents({"department_id": department_id})

    if emp_count > 0:
        raise HTTPException(
            status_code=400,
            detail="Cannot delete department with assigned employees"
        )

    result = await db.departments.delete_one({"id": department_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Department not found")

    return {"message": "Department deleted successfully"}

# ============= EMPLOYEE ROUTES =============
@api_router.delete("/employees/{employee_id}")
async def delete_employee(employee_id: str, admin: User = Depends(get_admin_user)):
    result = await db.employees.delete_one({"id": employee_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Employee not found")
    
    # Delete associated payroll record if it exists
    # This ensures the employee_count in payroll structures is updated correctly
    await db.payroll.delete_one({"employee_id": employee_id})
    
    return {"message": "Employee deleted successfully"}

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

@api_router.put("/employees/{employee_id}", response_model=Employee)
async def update_employee(employee_id: str, employee_data: EmployeeUpdate, admin: User = Depends(get_admin_user)):
    employee = await db.employees.find_one({"id": employee_id}, {"_id": 0})
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    
    update_data = {k: v for k, v in employee_data.model_dump().items() if v is not None}
    if update_data:
        await db.employees.update_one(
            {"id": employee_id},
            {"$set": update_data}
        )
    
    updated = await db.employees.find_one({"id": employee_id}, {"_id": 0})
    if isinstance(updated.get("created_at"), str):
        updated["created_at"] = datetime.fromisoformat(updated["created_at"])
    return Employee(**updated)

@api_router.get("/employees/{employee_id}/org-tree")
async def get_employee_org_tree(employee_id: str, current_user: User = Depends(get_current_user)):
    """Get organizational tree for an employee showing subordinates"""
    employee = await db.employees.find_one({"id": employee_id}, {"_id": 0})
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    
    # Get all subordinates recursively
    async def get_subordinates(manager_id):
        subordinates = await db.employees.find({"reporting_manager_id": manager_id}, {"_id": 0}).to_list(1000)
        result = []
        for sub in subordinates:
            sub_data = {
                **sub,
                "subordinates": await get_subordinates(sub["id"])
            }
            result.append(sub_data)
        return result
    
    org_tree = {
        **employee,
        "subordinates": await get_subordinates(employee_id)
    }
    
    return org_tree

# ============= PAYROLL ROUTES =============
@api_router.delete("/payroll-structures/{structure_id}")
async def delete_payroll_structure(
    structure_id: str,
    admin: User = Depends(get_admin_user)
):
    # 1. Check if any employee is using this payroll structure
    assigned_employee = await db.payroll.find_one(
        {"payroll_structure_id": structure_id}
    )

    if assigned_employee:
        raise HTTPException(
            status_code=400,
            detail="This payroll structure is assigned to employees and cannot be deleted."
        )

    # 2. If not assigned, allow deletion
    result = await db.payroll_structures.delete_one({"id": structure_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Structure not found")

    return {"message": "Payroll structure deleted successfully"}
@api_router.put("/payroll-structures/{structure_id}")
async def update_payroll_structure(
    structure_id: str,
    data: PayrollStructureCreate,
    admin: User = Depends(get_admin_user)
):
    net_salary = sum(item.amount for item in data.salary_types)
    
    update_data = {
        "name": data.name,
        "salary_types": [item.dict() for item in data.salary_types],
        "net_salary": net_salary,
    }
    
    # Add print_format_id if provided
    if data.print_format_id is not None:
        update_data["print_format_id"] = data.print_format_id
    
    result = await db.payroll_structures.update_one(
        {"id": structure_id},
        {"$set": update_data}
    )

    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Structure not found")

    return {"message": "Payroll structure updated"}
@api_router.post("/payroll-structures", response_model=PayrollStructure)
async def create_payroll_structure(
    structure_data: PayrollStructureCreate,
    admin: User = Depends(get_admin_user)
):
    total = sum(item.amount for item in structure_data.salary_types)

    structure = PayrollStructure(
        name=structure_data.name,
        salary_types=structure_data.salary_types,
        net_salary=total,
        print_format_id=structure_data.print_format_id
    )

    structure_dict = structure.model_dump()
    structure_dict["salary_types"] = [s.model_dump() for s in structure.salary_types]
    structure_dict["created_at"] = structure_dict["created_at"].isoformat()

    await db.payroll_structures.insert_one(structure_dict)
    return structure


@api_router.get("/payroll-structures", response_model=List[PayrollStructure])
async def list_payroll_structures(admin: User = Depends(get_admin_user)):
    structures = await db.payroll_structures.find({}, {"_id": 0}).to_list(1000)
    for struct in structures:
        count = await db.payroll.count_documents(
            {"payroll_structure_id": struct["id"]}
        )
        struct["employee_count"] = count
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

# ============= PRINT FORMAT ROUTES =============

@api_router.post("/print-formats", response_model=PrintFormat)
async def create_print_format(format_data: PrintFormatCreate, admin: User = Depends(get_admin_user)):
    # Validate Jinja2 template
    try:
        env = Environment(loader=BaseLoader())
        template = env.from_string(format_data.template_html)
        # Test render with dummy data
        template.render(
            employee_name="Test Employee",
            employee_id="EMP123",
            month="2025-01",
            basic_salary=5000,
            allowances=500,
            deductions=200,
            net_pay=5300,
            generated_date="2025-01-15"
        )
    except TemplateError as e:
        raise HTTPException(status_code=400, detail=f"Invalid Jinja2 template: {str(e)}")
    
    # If this is set as default, unset other defaults
    if format_data.is_default:
        await db.print_formats.update_many({}, {"$set": {"is_default": False}})
    
    print_format = PrintFormat(**format_data.model_dump())
    format_dict = print_format.model_dump()
    format_dict["created_at"] = format_dict["created_at"].isoformat()
    
    await db.print_formats.insert_one(format_dict)
    return print_format

@api_router.get("/print-formats", response_model=List[PrintFormat])
async def list_print_formats(admin: User = Depends(get_admin_user)):
    formats = await db.print_formats.find({}, {"_id": 0}).to_list(1000)
    for fmt in formats:
        if isinstance(fmt.get("created_at"), str):
            fmt["created_at"] = datetime.fromisoformat(fmt["created_at"])
    return formats

@api_router.get("/print-formats/{format_id}", response_model=PrintFormat)
async def get_print_format(format_id: str, admin: User = Depends(get_admin_user)):
    fmt = await db.print_formats.find_one({"id": format_id}, {"_id": 0})
    if not fmt:
        raise HTTPException(status_code=404, detail="Print format not found")
    if isinstance(fmt.get("created_at"), str):
        fmt["created_at"] = datetime.fromisoformat(fmt["created_at"])
    return PrintFormat(**fmt)

@api_router.put("/print-formats/{format_id}", response_model=PrintFormat)
async def update_print_format(format_id: str, format_data: PrintFormatCreate, admin: User = Depends(get_admin_user)):
    # Validate Jinja2 template
    try:
        env = Environment(loader=BaseLoader())
        template = env.from_string(format_data.template_html)
        template.render(
            employee_name="Test",
            employee_id="EMP123",
            month="2025-01",
            basic_salary=5000,
            allowances=500,
            deductions=200,
            net_pay=5300,
            generated_date="2025-01-15"
        )
    except TemplateError as e:
        raise HTTPException(status_code=400, detail=f"Invalid Jinja2 template: {str(e)}")
    
    # If this is set as default, unset other defaults
    if format_data.is_default:
        await db.print_formats.update_many({}, {"$set": {"is_default": False}})
    
    result = await db.print_formats.update_one(
        {"id": format_id},
        {"$set": format_data.model_dump()}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Print format not found")
    
    updated = await db.print_formats.find_one({"id": format_id}, {"_id": 0})
    if isinstance(updated.get("created_at"), str):
        updated["created_at"] = datetime.fromisoformat(updated["created_at"])
    return PrintFormat(**updated)

@api_router.delete("/print-formats/{format_id}")
async def delete_print_format(format_id: str, admin: User = Depends(get_admin_user)):
    result = await db.print_formats.delete_one({"id": format_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Print format not found")
    return {"message": "Print format deleted successfully"}

@api_router.post("/print-formats/{format_id}/preview")
async def preview_print_format(format_id: str, admin: User = Depends(get_admin_user)):
    """Preview print format with sample data"""
    from fastapi.responses import HTMLResponse
    
    fmt = await db.print_formats.find_one({"id": format_id}, {"_id": 0})
    if not fmt:
        raise HTTPException(status_code=404, detail="Print format not found")
    
    try:
        env = Environment(loader=BaseLoader())
        template = env.from_string(fmt["template_html"])
        html_content = template.render(
            employee_name="John Doe",
            employee_id="EMP12AB34CD",
            employee_email="john@company.com",
            department="Engineering",
            month="January 2025",
            basic_salary=50000.00,
            allowances=5000.00,
            deductions=2000.00,
            net_pay=53000.00,
            generated_date=datetime.now(timezone.utc).strftime("%B %d, %Y")
        )
        
        return HTMLResponse(content=html_content)
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Template rendering error: {str(e)}")

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
    
    # Get payroll structure
    structure = await db.payroll_structures.find_one({"id": payroll["payroll_structure_id"]}, {"_id": 0})
    if not structure:
        raise HTTPException(status_code=404, detail="Payroll structure not found")
    
    # Check if payslip already exists for this month
    existing = await db.payslips.find_one(
        {"employee_id": payslip_data.employee_id, "month": payslip_data.month},
        {"_id": 0}
    )
    if existing:
        raise HTTPException(status_code=400, detail="Payslip already generated for this month")
    
    # Calculate basic_salary, allowances, and deductions from salary_types
    salary_types = structure.get("salary_types", [])
    if not salary_types:
        raise HTTPException(status_code=400, detail="Payroll structure has no salary types defined")
    
    # Find basic salary (typically named "Basic", "Basic Salary", or first item)
    basic_salary = 0.0
    allowances = 0.0
    deductions = 0.0
    
    for salary_type in salary_types:
        # Handle both dict and object formats
        if isinstance(salary_type, dict):
            type_name = salary_type.get("type", "").lower()
            amount = float(salary_type.get("amount", 0))
        else:
            type_name = getattr(salary_type, "type", "").lower()
            amount = float(getattr(salary_type, "amount", 0))
        
        # Categorize salary types
        if "basic" in type_name:
            basic_salary += amount
        elif any(keyword in type_name for keyword in ["deduction", "tax", "pf", "esi", "loan"]):
            deductions += abs(amount)  # Ensure deductions are positive
        else:
            # Everything else is an allowance
            allowances += amount
    
    # If no basic salary found, use the first salary type as basic
    if basic_salary == 0 and salary_types:
        first_type = salary_types[0]
        if isinstance(first_type, dict):
            basic_salary = float(first_type.get("amount", 0))
        else:
            basic_salary = float(getattr(first_type, "amount", 0))
    
    # Calculate net pay
    net_pay = basic_salary + allowances - deductions
    
    payslip = Payslip(
        employee_id=payslip_data.employee_id,
        month=payslip_data.month,
        basic_salary=basic_salary,
        allowances=allowances,
        deductions=deductions,
        net_pay=net_pay
    )
    payslip_dict = payslip.model_dump()
    payslip_dict["generated_at"] = payslip_dict["generated_at"].isoformat()
    
    await db.payslips.insert_one(payslip_dict)
    return payslip

@api_router.get("/payslips", response_model=List[Payslip])
async def list_payslips(current_user: User = Depends(get_current_user)):
    """Get all payslips - admin can see all, employees see only their own"""
    if current_user.role == "admin":
        payslips = await db.payslips.find({}, {"_id": 0}).to_list(1000)
    else:
        # Employee can only view their own payslips
        employee = await db.employees.find_one({"user_id": current_user.id}, {"_id": 0})
        # If not found by user_id, try to find by email and link it
        if not employee:
            employee = await db.employees.find_one({"email": current_user.email}, {"_id": 0})
            if employee:
                # Link the employee record to the user
                await db.employees.update_one(
                    {"id": employee["id"]},
                    {"$set": {"user_id": current_user.id}}
                )
        
        if not employee:
            return []  # No employee profile found
        
        payslips = await db.payslips.find({"employee_id": employee["id"]}, {"_id": 0}).to_list(1000)
    
    for ps in payslips:
        if isinstance(ps.get("generated_at"), str):
            ps["generated_at"] = datetime.fromisoformat(ps["generated_at"])
    return sorted(payslips, key=lambda x: x["month"], reverse=True)

@api_router.get("/payslips/employee/{employee_id}", response_model=List[Payslip])
async def get_employee_payslips(employee_id: str, current_user: User = Depends(get_current_user)):
    # Employee can only view their own payslips
    if current_user.role == "employee":
        # Try to find employee by user_id first
        employee = await db.employees.find_one({"user_id": current_user.id}, {"_id": 0})
        
        # If not found by user_id, try to find by email and link it
        if not employee:
            employee = await db.employees.find_one({"email": current_user.email}, {"_id": 0})
            if employee:
                # Link the employee record to the user
                await db.employees.update_one(
                    {"id": employee["id"]},
                    {"$set": {"user_id": current_user.id}}
                )
        
        if not employee or employee["id"] != employee_id:
            raise HTTPException(status_code=403, detail="Access denied")
    
    payslips = await db.payslips.find({"employee_id": employee_id}, {"_id": 0}).to_list(1000)
    for ps in payslips:
        if isinstance(ps.get("generated_at"), str):
            ps["generated_at"] = datetime.fromisoformat(ps["generated_at"])
    return sorted(payslips, key=lambda x: x["month"], reverse=True)

@api_router.get("/payslips/{payslip_id}/download")
async def download_payslip(payslip_id: str, format_id: Optional[str] = None, current_user: User = Depends(get_current_user)):
    from fastapi.responses import HTMLResponse
    
    payslip = await db.payslips.find_one({"id": payslip_id}, {"_id": 0})
    if not payslip:
        raise HTTPException(status_code=404, detail="Payslip not found")
    
    # Employee can only download their own payslips
    if current_user.role == "employee":
        # Try to find employee by user_id first
        employee = await db.employees.find_one({"user_id": current_user.id}, {"_id": 0})
        # If not found by user_id, try to find by email and link it
        if not employee:
            employee = await db.employees.find_one({"email": current_user.email}, {"_id": 0})
            if employee:
                await db.employees.update_one(
                    {"id": employee["id"]},
                    {"$set": {"user_id": current_user.id}}
                )
        if not employee or employee["id"] != payslip["employee_id"]:
            raise HTTPException(status_code=403, detail="Access denied")
    
    # Get employee details
    employee = await db.employees.find_one({"id": payslip["employee_id"]}, {"_id": 0})
    
    # Get print format - priority: format_id > payroll structure format > default format
    print_format = None
    if format_id:
        print_format = await db.print_formats.find_one({"id": format_id}, {"_id": 0})
    else:
        # Try to get format from payroll structure
        payroll = await db.payroll.find_one({"employee_id": payslip["employee_id"]}, {"_id": 0})
        if payroll:
            structure = await db.payroll_structures.find_one({"id": payroll["payroll_structure_id"]}, {"_id": 0})
            if structure and structure.get("print_format_id"):
                print_format = await db.print_formats.find_one({"id": structure["print_format_id"]}, {"_id": 0})
        
        # If still no format, get default
        if not print_format:
            print_format = await db.print_formats.find_one({"is_default": True}, {"_id": 0})
    
    html_content = ""
    
    if print_format:
        # Use custom template
        try:
            env = Environment(loader=BaseLoader())
            template = env.from_string(print_format["template_html"])
            
            # Get department name
            department_name = "N/A"
            if employee.get("department_id"):
                dept = await db.departments.find_one({"id": employee["department_id"]}, {"_id": 0})
                if dept:
                    department_name = dept["name"]
            elif employee.get("department"):
                department_name = employee["department"]
            
            html_content = template.render(
                employee_name=employee["name"],
                employee_id=employee.get("employee_id", "N/A"),
                employee_email=employee["email"],
                department=department_name,
                month=payslip["month"],
                basic_salary=payslip["basic_salary"],
                allowances=payslip["allowances"],
                deductions=payslip["deductions"],
                net_pay=payslip["net_pay"],
                generated_date=datetime.fromisoformat(payslip["generated_at"]).strftime("%B %d, %Y") if isinstance(payslip["generated_at"], str) else payslip["generated_at"].strftime("%B %d, %Y")
            )
            
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Template rendering error: {str(e)}")
    else:
        # Fallback to simple default format
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body {{ font-family: Arial, sans-serif; padding: 40px; }}
                .header {{ text-align: center; margin-bottom: 30px; }}
                .header h1 {{ margin: 0; color: #333; }}
                .info {{ margin: 20px 0; }}
                .info-row {{ display: flex; margin: 10px 0; }}
                .info-label {{ width: 150px; font-weight: bold; color: #666; }}
                .info-value {{ color: #333; }}
                .salary-table {{ width: 100%; border-collapse: collapse; margin-top: 30px; }}
                .salary-table th {{ background: #333; color: white; padding: 12px; text-align: left; }}
                .salary-table td {{ padding: 12px; border-bottom: 1px solid #ddd; }}
                .total-row {{ font-weight: bold; background: #f5f5f5; }}
                @media print {{
                    body {{ margin: 0; padding: 20px; }}
                }}
            </style>
        </head>
        <body>
            <div class="header">
                <h1>PAYSLIP</h1>
            </div>
            <div class="info">
                <div class="info-row">
                    <div class="info-label">Employee Name:</div>
                    <div class="info-value">{employee["name"]}</div>
                </div>
                <div class="info-row">
                    <div class="info-label">Employee ID:</div>
                    <div class="info-value">{employee.get("employee_id", "N/A")}</div>
                </div>
                <div class="info-row">
                    <div class="info-label">Email:</div>
                    <div class="info-value">{employee["email"]}</div>
                </div>
                <div class="info-row">
                    <div class="info-label">Month:</div>
                    <div class="info-value">{payslip["month"]}</div>
                </div>
            </div>
            <table class="salary-table">
                <tr>
                    <th>Description</th>
                    <th style="text-align: right;">Amount (₹)</th>
                </tr>
                <tr>
                    <td>Basic Salary</td>
                    <td style="text-align: right;">₹{payslip["basic_salary"]:.2f}</td>
                </tr>
                <tr>
                    <td>Allowances</td>
                    <td style="text-align: right;">₹{payslip["allowances"]:.2f}</td>
                </tr>
                <tr>
                    <td>Deductions</td>
                    <td style="text-align: right;">-₹{payslip["deductions"]:.2f}</td>
                </tr>
                <tr class="total-row">
                    <td>Net Pay</td>
                    <td style="text-align: right;">₹{payslip["net_pay"]:.2f}</td>
                </tr>
            </table>
        </body>
        </html>
        """
    
    # Return HTML response (browser can print to PDF)
    return HTMLResponse(content=html_content)

# ============= LEAVE POLICY ROUTES =============

@api_router.post("/leave-policies", response_model=LeavePolicy)
async def create_leave_policy(policy_data: LeavePolicyCreate, admin: User = Depends(get_admin_user)):
    policy = LeavePolicy(**policy_data.model_dump())
    policy_dict = policy.model_dump()
    policy_dict["created_at"] = policy_dict["created_at"].isoformat()
    # Convert leave_types list of LeaveType objects to dicts
    policy_dict["leave_types"] = [lt.model_dump() if hasattr(lt, 'model_dump') else lt for lt in policy_dict["leave_types"]]
    
    await db.leave_policies.insert_one(policy_dict)
    return policy

@api_router.get("/leave-policies", response_model=List[LeavePolicy])
async def list_leave_policies(current_user: User = Depends(get_current_user)):
    policies = await db.leave_policies.find({}, {"_id": 0}).to_list(1000)
    for policy in policies:
        if isinstance(policy.get("created_at"), str):
            policy["created_at"] = datetime.fromisoformat(policy["created_at"])
        # Convert leave_types dicts back to LeaveType objects
        if "leave_types" in policy:
            policy["leave_types"] = [LeaveType(**lt) if isinstance(lt, dict) else lt for lt in policy["leave_types"]]
    return policies

@api_router.put("/leave-policies/{policy_id}", response_model=LeavePolicy)
async def update_leave_policy(
    policy_id: str,
    policy_data: LeavePolicyCreate,
    admin: User = Depends(get_admin_user)
):
    # Check if policy exists
    existing = await db.leave_policies.find_one({"id": policy_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Leave policy not found")
    
    # Update the policy
    policy_dict = policy_data.model_dump()
    # Convert leave_types list of LeaveType objects to dicts
    policy_dict["leave_types"] = [lt.model_dump() if hasattr(lt, 'model_dump') else lt for lt in policy_dict["leave_types"]]
    
    await db.leave_policies.update_one(
        {"id": policy_id},
        {"$set": policy_dict}
    )
    
    # Return updated policy
    updated = await db.leave_policies.find_one({"id": policy_id}, {"_id": 0})
    if isinstance(updated.get("created_at"), str):
        updated["created_at"] = datetime.fromisoformat(updated["created_at"])
    if "leave_types" in updated:
        updated["leave_types"] = [LeaveType(**lt) if isinstance(lt, dict) else lt for lt in updated["leave_types"]]
    return LeavePolicy(**updated)

@api_router.delete("/leave-policies/{policy_id}")
async def delete_leave_policy(policy_id: str, admin: User = Depends(get_admin_user)):
    # Check if policy exists
    existing = await db.leave_policies.find_one({"id": policy_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Leave policy not found")
    
    # Check if any employee is assigned to this policy
    assigned_employee = await db.employee_policy_assignments.find_one(
        {"leave_policy_id": policy_id}
    )
    
    if assigned_employee:
        raise HTTPException(
            status_code=400,
            detail="This leave policy is assigned to employees and cannot be deleted."
        )
    
    result = await db.leave_policies.delete_one({"id": policy_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Leave policy not found")
    return {"message": "Leave policy deleted successfully"}

@api_router.post("/employee-policy-assignments", response_model=EmployeePolicyAssignment)
async def assign_policy_to_employee(assignment_data: EmployeePolicyAssignmentCreate, admin: User = Depends(get_admin_user)):
    # Check if employee exists
    employee = await db.employees.find_one({"id": assignment_data.employee_id}, {"_id": 0})
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    
    # Check if policy exists
    policy = await db.leave_policies.find_one({"id": assignment_data.leave_policy_id}, {"_id": 0})
    if not policy:
        raise HTTPException(status_code=404, detail="Leave policy not found")
    
    # Check if assignment already exists
    existing = await db.employee_policy_assignments.find_one({
        "employee_id": assignment_data.employee_id
    }, {"_id": 0})
    
    if existing:
        # Update existing assignment
        await db.employee_policy_assignments.update_one(
            {"employee_id": assignment_data.employee_id},
            {"$set": {"leave_policy_id": assignment_data.leave_policy_id}}
        )
        updated = await db.employee_policy_assignments.find_one({
            "employee_id": assignment_data.employee_id
        }, {"_id": 0})
        if isinstance(updated.get("created_at"), str):
            updated["created_at"] = datetime.fromisoformat(updated["created_at"])
        return EmployeePolicyAssignment(**updated)
    
    assignment = EmployeePolicyAssignment(**assignment_data.model_dump())
    assignment_dict = assignment.model_dump()
    assignment_dict["created_at"] = assignment_dict["created_at"].isoformat()
    
    await db.employee_policy_assignments.insert_one(assignment_dict)
    return assignment

@api_router.get("/employee-policy-assignments/me")
async def get_my_policy_assignment(current_user: User = Depends(get_current_user)):
    """Get the current user's assigned leave policy"""
    if current_user.role != "employee":
        raise HTTPException(status_code=403, detail="Only employees can access their own policy")
    
    # Get employee ID from user
    employee = await db.employees.find_one({"user_id": current_user.id}, {"_id": 0})
    if not employee:
        return None
    
    assignment = await db.employee_policy_assignments.find_one({"employee_id": employee["id"]}, {"_id": 0})
    if not assignment:
        return None
    
    if isinstance(assignment.get("created_at"), str):
        assignment["created_at"] = datetime.fromisoformat(assignment["created_at"])
    
    # Get the full policy details
    policy = await db.leave_policies.find_one({"id": assignment["leave_policy_id"]}, {"_id": 0})
    if policy:
        if isinstance(policy.get("created_at"), str):
            policy["created_at"] = datetime.fromisoformat(policy["created_at"])
        if "leave_types" in policy:
            policy["leave_types"] = [LeaveType(**lt) if isinstance(lt, dict) else lt for lt in policy["leave_types"]]
        return {
            **assignment,
            "policy": policy
        }
    
    return assignment

@api_router.get("/employee-policy-assignments/employee/{employee_id}")
async def get_employee_policy_assignment(employee_id: str, current_user: User = Depends(get_current_user)):
    assignment = await db.employee_policy_assignments.find_one({"employee_id": employee_id}, {"_id": 0})
    if not assignment:
        return None
    
    if isinstance(assignment.get("created_at"), str):
        assignment["created_at"] = datetime.fromisoformat(assignment["created_at"])
    
    # Get the full policy details
    policy = await db.leave_policies.find_one({"id": assignment["leave_policy_id"]}, {"_id": 0})
    if policy:
        if isinstance(policy.get("created_at"), str):
            policy["created_at"] = datetime.fromisoformat(policy["created_at"])
        if "leave_types" in policy:
            policy["leave_types"] = [LeaveType(**lt) if isinstance(lt, dict) else lt for lt in policy["leave_types"]]
        return {
            **assignment,
            "policy": policy
        }
    
    return assignment

# ============= LEAVE REQUEST ROUTES =============

@api_router.post("/leave-requests", response_model=LeaveRequest)
async def create_leave_request(request_data: LeaveRequestCreate, current_user: User = Depends(get_current_user)):
    if current_user.role != "employee":
        raise HTTPException(status_code=403, detail="Only employees can apply for leave")
    
    # Try to find employee by user_id first
    employee = await db.employees.find_one({"user_id": current_user.id}, {"_id": 0})
    
    # If not found by user_id, try to find by email and link it
    if not employee:
        employee = await db.employees.find_one({"email": current_user.email}, {"_id": 0})
        if employee:
            # Link the employee record to the user
            await db.employees.update_one(
                {"id": employee["id"]},
                {"$set": {"user_id": current_user.id}}
            )
    
    if not employee:
        raise HTTPException(status_code=404, detail="Employee profile not found. Please contact your administrator.")
    
    # Verify employee has this leave type in their assigned policy
    policy_assignment = await db.employee_policy_assignments.find_one({"employee_id": employee["id"]}, {"_id": 0})
    if not policy_assignment:
        raise HTTPException(status_code=400, detail="No leave policy assigned to you")
    
    policy = await db.leave_policies.find_one({"id": policy_assignment["leave_policy_id"]}, {"_id": 0})
    if not policy:
        raise HTTPException(status_code=404, detail="Leave policy not found")
    
    # Check if the leave type exists in the policy
    leave_type_exists = any(lt["type"] == request_data.leave_type for lt in policy["leave_types"])
    if not leave_type_exists:
        raise HTTPException(status_code=400, detail=f"Leave type '{request_data.leave_type}' not available in your policy")
    
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
        # Try to find employee by user_id first
        employee = await db.employees.find_one({"user_id": current_user.id}, {"_id": 0})
        
        # If not found by user_id, try to find by email and link it
        if not employee:
            employee = await db.employees.find_one({"email": current_user.email}, {"_id": 0})
            if employee:
                # Link the employee record to the user
                await db.employees.update_one(
                    {"id": employee["id"]},
                    {"$set": {"user_id": current_user.id}}
                )
        
        if not employee:
            return []  # No employee profile found - return empty array
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
    
    # Try to find employee by user_id first
    employee = await db.employees.find_one({"user_id": current_user.id}, {"_id": 0})
    
    # If not found by user_id, try to find by email and link it
    if not employee:
        employee = await db.employees.find_one({"email": current_user.email}, {"_id": 0})
        if employee:
            # Link the employee record to the user
            await db.employees.update_one(
                {"id": employee["id"]},
                {"$set": {"user_id": current_user.id}}
            )
    
    if not employee:
        return []  # No employee profile found - return empty array instead of error
    
    # Get employee's assigned policy
    policy_assignment = await db.employee_policy_assignments.find_one({"employee_id": employee["id"]}, {"_id": 0})
    if not policy_assignment:
        return []  # No policy assigned yet
    
    policy = await db.leave_policies.find_one({"id": policy_assignment["leave_policy_id"]}, {"_id": 0})
    if not policy:
        return []
    
    # Ensure leave_types exists and is a list
    if "leave_types" not in policy or not isinstance(policy["leave_types"], list):
        return []
    
    balances = []
    
    for leave_type in policy["leave_types"]:
        # Handle both dict and object formats
        if isinstance(leave_type, dict):
            leave_type_name = leave_type.get("type")
            allocated_days = leave_type.get("days")
        else:
            # If it's already a LeaveType object
            leave_type_name = getattr(leave_type, "type", None)
            allocated_days = getattr(leave_type, "days", None)
        
        if not leave_type_name or allocated_days is None:
            continue  # Skip invalid leave types
        
        # Calculate used days from approved leave requests for this leave type
        approved_requests = await db.leave_requests.find({
            "employee_id": employee["id"],
            "leave_type": leave_type_name,
            "status": "approved"
        }, {"_id": 0}).to_list(1000)
        
        used_days = 0
        for req in approved_requests:
            try:
                start = datetime.strptime(req["start_date"], "%Y-%m-%d")
                end = datetime.strptime(req["end_date"], "%Y-%m-%d")
                used_days += (end - start).days + 1
            except (ValueError, KeyError):
                continue  # Skip invalid date formats
        
        balances.append(LeaveBalance(
            leave_type=leave_type_name,
            allocated_days=allocated_days,
            used_days=used_days,
            remaining_days=allocated_days - used_days
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
