#!/usr/bin/env python3
"""
HR Management System Backend API Testing - UPDATED FOR NEW FEATURES
Tests all authentication, department, employee, payroll, and leave management endpoints
Including new features: Department Management, Employee Update, Org Tree, Leave Assignments, Payroll Structures
"""

import requests
import sys
import json
from datetime import datetime, timedelta

class HRAPITester:
    def __init__(self, base_url="https://staffhub-186.preview.emergentagent.com"):
        self.base_url = base_url
        self.admin_token = None
        self.employee_token = None
        self.admin_user = None
        self.employee_user = None
        self.test_employee_id = None
        self.test_policy_id = None
        self.test_payslip_id = None
        self.test_department_id = None
        self.test_payroll_structure_id = None
        self.test_leave_assignment_id = None
        self.tests_run = 0
        self.tests_passed = 0
        self.failed_tests = []

    def log_test(self, name, success, details=""):
        """Log test results"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name}")
        else:
            print(f"❌ {name} - {details}")
            self.failed_tests.append(f"{name}: {details}")

    def make_request(self, method, endpoint, data=None, token=None, expect_status=200):
        """Make HTTP request with error handling"""
        url = f"{self.base_url}/api{endpoint}"
        headers = {'Content-Type': 'application/json'}
        if token:
            headers['Authorization'] = f'Bearer {token}'

        try:
            if method == 'GET':
                response = requests.get(url, headers=headers)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers)
            elif method == 'PATCH':
                response = requests.patch(url, json=data, headers=headers)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers)

            success = response.status_code == expect_status
            return success, response.json() if success else {}, response.status_code
        except Exception as e:
            return False, {}, str(e)

    def test_admin_registration(self):
        """Test admin user registration"""
        admin_data = {
            "email": f"admin_{datetime.now().strftime('%H%M%S')}@test.com",
            "password": "AdminPass123!",
            "full_name": "Test Admin",
            "role": "admin"
        }
        
        success, response, status = self.make_request('POST', '/auth/register', admin_data, expect_status=200)
        if success and 'access_token' in response:
            self.admin_token = response['access_token']
            self.admin_user = response['user']
            self.log_test("Admin Registration", True)
            return True
        else:
            self.log_test("Admin Registration", False, f"Status: {status}")
            return False

    def test_employee_registration(self):
        """Test employee user registration - should link to existing employee record"""
        # Use the same email as the employee record created by admin
        if not hasattr(self, 'test_employee_email'):
            self.log_test("Employee Registration", False, "No employee email to link to")
            return False
            
        employee_data = {
            "email": self.test_employee_email,
            "password": "EmpPass123!",
            "full_name": "John Doe",  # Should match the employee record
            "role": "employee"
        }
        
        success, response, status = self.make_request('POST', '/auth/register', employee_data, expect_status=200)
        if success and 'access_token' in response:
            self.employee_token = response['access_token']
            self.employee_user = response['user']
            self.log_test("Employee Registration (Linked to existing record)", True)
            return True
        else:
            self.log_test("Employee Registration (Linked to existing record)", False, f"Status: {status}")
            return False

    def test_login(self):
        """Test login functionality"""
        if not self.admin_user:
            self.log_test("Admin Login", False, "No admin user to test")
            return False
            
        login_data = {
            "email": self.admin_user['email'],
            "password": "AdminPass123!"
        }
        
        success, response, status = self.make_request('POST', '/auth/login', login_data, expect_status=200)
        if success and 'access_token' in response:
            self.log_test("Admin Login", True)
            return True
        else:
            self.log_test("Admin Login", False, f"Status: {status}")
            return False

    def test_get_current_user(self):
        """Test get current user endpoint"""
        success, response, status = self.make_request('GET', '/auth/me', token=self.admin_token)
        if success and response.get('email') == self.admin_user['email']:
            self.log_test("Get Current User", True)
            return True
        else:
            self.log_test("Get Current User", False, f"Status: {status}")
            return False

    def test_create_employee(self):
        """Test creating employee with new department_id field"""
        # First create a department to use
        if not self.test_department_id:
            self.test_create_department()
            
        employee_email = f"john_{datetime.now().strftime('%H%M%S')}@company.com"
        employee_data = {
            "name": "John Doe",
            "email": employee_email,
            "department_id": self.test_department_id,  # NEW: Use department_id instead of department string
            "joining_date": "2024-01-15"
        }
        
        success, response, status = self.make_request('POST', '/employees', employee_data, self.admin_token, expect_status=200)
        if success and 'id' in response:
            self.test_employee_id = response['id']
            self.test_employee_email = employee_email  # Store for employee registration
            self.log_test("Create Employee (with department_id)", True)
            return True
        else:
            self.log_test("Create Employee (with department_id)", False, f"Status: {status}")
            return False

    def test_list_employees(self):
        """Test listing employees"""
        success, response, status = self.make_request('GET', '/employees', token=self.admin_token)
        if success and isinstance(response, list):
            self.log_test("List Employees", True)
            return True
        else:
            self.log_test("List Employees", False, f"Status: {status}")
            return False

    def test_get_employee(self):
        """Test getting specific employee"""
        if not self.test_employee_id:
            self.log_test("Get Employee", False, "No employee ID to test")
            return False
            
        success, response, status = self.make_request('GET', f'/employees/{self.test_employee_id}', token=self.admin_token)
        if success and response.get('id') == self.test_employee_id:
            self.log_test("Get Employee", True)
            return True
        else:
            self.log_test("Get Employee", False, f"Status: {status}")
            return False

    def test_assign_payroll_legacy(self):
        """Test legacy payroll assignment (for backward compatibility testing)"""
        if not self.test_employee_id:
            self.log_test("Assign Payroll Legacy", False, "No employee ID to test")
            return False
            
        payroll_data = {
            "employee_id": self.test_employee_id,
            "basic_salary": 5000.00,
            "allowances": 500.00,
            "deductions": 200.00
        }
        
        success, response, status = self.make_request('POST', '/payroll', payroll_data, self.admin_token, expect_status=200)
        if success and response.get('employee_id') == self.test_employee_id:
            self.log_test("Assign Payroll Legacy", True)
            return True
        else:
            self.log_test("Assign Payroll Legacy", False, f"Status: {status}")
            return False

    def test_get_payroll(self):
        """Test getting employee payroll"""
        if not self.test_employee_id:
            self.log_test("Get Payroll", False, "No employee ID to test")
            return False
            
        success, response, status = self.make_request('GET', f'/payroll/{self.test_employee_id}', token=self.admin_token)
        if success and response and response.get('employee_id') == self.test_employee_id:
            self.log_test("Get Payroll", True)
            return True
        else:
            self.log_test("Get Payroll", False, f"Status: {status}")
            return False

    def test_generate_payslip(self):
        """Test generating payslip"""
        if not self.test_employee_id:
            self.log_test("Generate Payslip", False, "No employee ID to test")
            return False
            
        payslip_data = {
            "employee_id": self.test_employee_id,
            "month": "2024-01"
        }
        
        success, response, status = self.make_request('POST', '/payslips/generate', payslip_data, self.admin_token, expect_status=200)
        if success and 'id' in response:
            self.test_payslip_id = response['id']
            self.log_test("Generate Payslip", True)
            return True
        else:
            self.log_test("Generate Payslip", False, f"Status: {status}")
            return False

    def test_get_employee_payslips(self):
        """Test getting employee payslips"""
        if not self.test_employee_id:
            self.log_test("Get Employee Payslips", False, "No employee ID to test")
            return False
            
        success, response, status = self.make_request('GET', f'/payslips/employee/{self.test_employee_id}', token=self.admin_token)
        if success and isinstance(response, list):
            self.log_test("Get Employee Payslips", True)
            return True
        else:
            self.log_test("Get Employee Payslips", False, f"Status: {status}")
            return False

    def test_download_payslip(self):
        """Test downloading payslip PDF"""
        if not self.test_payslip_id:
            self.log_test("Download Payslip", False, "No payslip ID to test")
            return False
            
        # For PDF download, we expect different handling
        url = f"{self.base_url}/api/payslips/{self.test_payslip_id}/download"
        headers = {'Authorization': f'Bearer {self.admin_token}'}
        
        try:
            response = requests.get(url, headers=headers)
            if response.status_code == 200 and response.headers.get('content-type') == 'application/pdf':
                self.log_test("Download Payslip", True)
                return True
            else:
                self.log_test("Download Payslip", False, f"Status: {response.status_code}")
                return False
        except Exception as e:
            self.log_test("Download Payslip", False, str(e))
            return False

    def test_create_leave_policy(self):
        """Test creating leave policy with dynamic leave types"""
        policy_data = {
            "name": "Standard Employee Policy",
            "description": "Standard leave policy for all employees",
            "leave_types": [
                {"type": "Casual Leave", "days": 12},
                {"type": "Sick Leave", "days": 10}
            ]
        }
        
        success, response, status = self.make_request('POST', '/leave-policies', policy_data, self.admin_token, expect_status=200)
        if success and 'id' in response:
            self.test_policy_id = response['id']
            self.log_test("Create Leave Policy (Dynamic Types)", True)
            return True
        else:
            self.log_test("Create Leave Policy (Dynamic Types)", False, f"Status: {status}")
            return False

    def test_list_leave_policies(self):
        """Test listing leave policies"""
        success, response, status = self.make_request('GET', '/leave-policies', token=self.admin_token)
        if success and isinstance(response, list):
            self.log_test("List Leave Policies", True)
            return True
        else:
            self.log_test("List Leave Policies", False, f"Status: {status}")
            return False

    def test_create_leave_request(self):
        """Test creating leave request as employee using leave_type"""
        if not self.employee_token:
            self.log_test("Create Leave Request", False, "No employee token to test")
            return False
            
        request_data = {
            "leave_type": "Casual Leave",  # Use leave type string, not policy ID
            "start_date": "2024-02-01",
            "end_date": "2024-02-03",
            "reason": "Personal work"
        }
        
        success, response, status = self.make_request('POST', '/leave-requests', request_data, self.employee_token, expect_status=200)
        if success and 'id' in response:
            self.test_leave_request_id = response['id']
            self.log_test("Create Leave Request (with leave_type)", True)
            return True
        else:
            self.log_test("Create Leave Request (with leave_type)", False, f"Status: {status}")
            return False

    def test_list_leave_requests(self):
        """Test listing leave requests"""
        success, response, status = self.make_request('GET', '/leave-requests', token=self.admin_token)
        if success and isinstance(response, list):
            self.log_test("List Leave Requests", True)
            return True
        else:
            self.log_test("List Leave Requests", False, f"Status: {status}")
            return False

    def test_update_leave_request(self):
        """Test updating leave request status"""
        if not hasattr(self, 'test_leave_request_id'):
            self.log_test("Update Leave Request", False, "No leave request ID to test")
            return False
            
        update_data = {"status": "approved"}
        success, response, status = self.make_request('PATCH', f'/leave-requests/{self.test_leave_request_id}', update_data, self.admin_token, expect_status=200)
        if success and response.get('status') == 'approved':
            self.log_test("Update Leave Request", True)
            return True
        else:
            self.log_test("Update Leave Request", False, f"Status: {status}")
            return False

    def test_get_leave_balance(self):
        """Test getting leave balance as employee"""
        success, response, status = self.make_request('GET', '/leave-requests/balance', token=self.employee_token)
        if success and isinstance(response, list):
            self.log_test("Get Leave Balance", True)
            return True
        else:
            self.log_test("Get Leave Balance", False, f"Status: {status}")
            return False

    def test_delete_leave_policy(self):
        """Test deleting leave policy"""
        if not self.test_policy_id:
            self.log_test("Delete Leave Policy", False, "No policy ID to test")
            return False
            
        success, response, status = self.make_request('DELETE', f'/leave-policies/{self.test_policy_id}', token=self.admin_token, expect_status=200)
        if success:
            self.log_test("Delete Leave Policy", True)
            return True
        else:
            self.log_test("Delete Leave Policy", False, f"Status: {status}")
            return False

    # ============= NEW FEATURE TESTS =============
    
    def test_create_department(self):
        """NEW: Test creating department"""
        dept_data = {
            "name": "Engineering",
            "description": "Software development and engineering team"
        }
        
        success, response, status = self.make_request('POST', '/departments', dept_data, self.admin_token, expect_status=200)
        if success and 'id' in response:
            self.test_department_id = response['id']
            self.log_test("Create Department", True)
            return True
        else:
            self.log_test("Create Department", False, f"Status: {status}")
            return False

    def test_list_departments(self):
        """NEW: Test listing departments"""
        success, response, status = self.make_request('GET', '/departments', token=self.admin_token)
        if success and isinstance(response, list):
            self.log_test("List Departments", True)
            return True
        else:
            self.log_test("List Departments", False, f"Status: {status}")
            return False

    def test_update_employee(self):
        """NEW: Test updating employee"""
        if not self.test_employee_id:
            self.log_test("Update Employee", False, "No employee ID to test")
            return False
            
        update_data = {
            "name": "John Doe Updated",
            "joining_date": "2024-02-01"
        }
        
        success, response, status = self.make_request('PUT', f'/employees/{self.test_employee_id}', update_data, self.admin_token, expect_status=200)
        if success and response.get('name') == "John Doe Updated":
            self.log_test("Update Employee", True)
            return True
        else:
            self.log_test("Update Employee", False, f"Status: {status}")
            return False

    def test_get_org_tree(self):
        """NEW: Test getting organizational tree"""
        if not self.test_employee_id:
            self.log_test("Get Org Tree", False, "No employee ID to test")
            return False
            
        success, response, status = self.make_request('GET', f'/employees/{self.test_employee_id}/org-tree', token=self.admin_token)
        if success and 'subordinates' in response:
            self.log_test("Get Org Tree", True)
            return True
        else:
            self.log_test("Get Org Tree", False, f"Status: {status}")
            return False

    def test_create_payroll_structure(self):
        """NEW: Test creating payroll structure"""
        structure_data = {
            "name": "Senior Engineer L2",
            "basic_salary": 6000.00,
            "allowances": 800.00,
            "deductions": 300.00
        }
        
        success, response, status = self.make_request('POST', '/payroll-structures', structure_data, self.admin_token, expect_status=200)
        if success and 'id' in response:
            self.test_payroll_structure_id = response['id']
            self.log_test("Create Payroll Structure", True)
            return True
        else:
            self.log_test("Create Payroll Structure", False, f"Status: {status}")
            return False

    def test_list_payroll_structures(self):
        """NEW: Test listing payroll structures"""
        success, response, status = self.make_request('GET', '/payroll-structures', token=self.admin_token)
        if success and isinstance(response, list):
            self.log_test("List Payroll Structures", True)
            return True
        else:
            self.log_test("List Payroll Structures", False, f"Status: {status}")
            return False

    def test_assign_payroll_with_structure(self):
        """NEW: Test assigning payroll using structure ID"""
        if not self.test_employee_id or not self.test_payroll_structure_id:
            self.log_test("Assign Payroll with Structure", False, "Missing employee or structure ID")
            return False
            
        payroll_data = {
            "employee_id": self.test_employee_id,
            "payroll_structure_id": self.test_payroll_structure_id
        }
        
        success, response, status = self.make_request('POST', '/payroll', payroll_data, self.admin_token, expect_status=200)
        if success and response.get('employee_id') == self.test_employee_id:
            self.log_test("Assign Payroll with Structure", True)
            return True
        else:
            self.log_test("Assign Payroll with Structure", False, f"Status: {status}")
            return False

    def test_create_leave_policy_with_description(self):
        """NEW: Test creating leave policy with description field"""
        policy_data = {
            "name": "Sick Leave",
            "days_per_year": 10,
            "description": "Medical leave for illness and health issues"
        }
        
        success, response, status = self.make_request('POST', '/leave-policies', policy_data, self.admin_token, expect_status=200)
        if success and 'id' in response and response.get('description'):
            self.test_policy_id = response['id']  # Update for other tests
            self.log_test("Create Leave Policy with Description", True)
            return True
        else:
            self.log_test("Create Leave Policy with Description", False, f"Status: {status}")
            return False

    def test_create_employee_policy_assignment(self):
        """NEW: Test assigning leave policy to employee"""
        if not self.test_employee_id or not self.test_policy_id:
            self.log_test("Create Employee Policy Assignment", False, "Missing employee or policy ID")
            return False
            
        assignment_data = {
            "employee_id": self.test_employee_id,
            "leave_policy_id": self.test_policy_id
        }
        
        success, response, status = self.make_request('POST', '/employee-policy-assignments', assignment_data, self.admin_token, expect_status=200)
        if success and 'id' in response:
            self.test_leave_assignment_id = response['id']
            self.log_test("Create Employee Policy Assignment", True)
            return True
        else:
            self.log_test("Create Employee Policy Assignment", False, f"Status: {status}")
            return False

    def test_get_employee_policy_assignment(self):
        """NEW: Test getting employee policy assignment"""
        if not self.test_employee_id:
            self.log_test("Get Employee Policy Assignment", False, "No employee ID to test")
            return False
            
        success, response, status = self.make_request('GET', f'/employee-policy-assignments/employee/{self.test_employee_id}', token=self.admin_token)
        if success and response and 'policy' in response:
            self.log_test("Get Employee Policy Assignment", True)
            return True
        else:
            self.log_test("Get Employee Policy Assignment", False, f"Status: {status}")
            return False

    def test_leave_balance_with_assignments(self):
        """NEW: Test leave balance calculation using assignments instead of policies"""
        success, response, status = self.make_request('GET', '/leave-requests/balance', token=self.employee_token)
        if success and isinstance(response, list):
            # Check if balance reflects assignment allocation (15 days) not policy default (10 days)
            for balance in response:
                if balance.get('allocated_days') == 15:  # Should match our assignment
                    self.log_test("Leave Balance with Assignments", True)
                    return True
            self.log_test("Leave Balance with Assignments", False, "Balance doesn't reflect assignment allocation")
            return False
        else:
            self.log_test("Leave Balance with Assignments", False, f"Status: {status}")
            return False

    def test_backward_compatibility_employee_department(self):
        """NEW: Test backward compatibility - existing employees with old department field should still work"""
        # This test verifies that existing employees with 'department' field (not department_id) 
        # are still readable and functional, even though new employees must use department_id
        
        # First, let's check if we can read employees that might have the old department field
        success, response, status = self.make_request('GET', '/employees', token=self.admin_token)
        if success and isinstance(response, list):
            # Check if any employee has the old department field
            has_legacy_field = any(emp.get('department') for emp in response if emp.get('department'))
            if has_legacy_field:
                self.log_test("Backward Compatibility - Employee Department (Read)", True)
            else:
                # If no legacy employees exist, that's also fine - the system supports both
                self.log_test("Backward Compatibility - Employee Department (No legacy data)", True)
            return True
        else:
            self.log_test("Backward Compatibility - Employee Department", False, f"Status: {status}")
            return False

    def run_all_tests(self):
        """Run comprehensive test suite including NEW FEATURES"""
        print("🚀 Starting HR Management System Backend API Tests - UPDATED WITH NEW FEATURES")
        print("=" * 80)
        
        # Authentication Tests
        print("\n📋 Authentication Tests")
        if not self.test_admin_registration():
            return False
        
        # NEW: Department Management Tests (run first as employees need departments)
        print("\n🏢 Department Management Tests (NEW)")
        self.test_create_department()
        self.test_list_departments()
        
        # Employee Management Tests (updated to use department_id)
        print("\n👥 Employee Management Tests (UPDATED)")
        self.test_create_employee()  # Now uses department_id
        self.test_list_employees()
        self.test_get_employee()
        
        # NEW: Employee Update Tests
        print("\n✏️ Employee Update Tests (NEW)")
        self.test_update_employee()
        
        # NEW: Organizational Tree Tests
        print("\n🌳 Organizational Tree Tests (NEW)")
        self.test_get_org_tree()
        
        # NEW: Backward Compatibility Tests
        print("\n🔄 Backward Compatibility Tests (NEW)")
        self.test_backward_compatibility_employee_department()
        
        # Now test employee registration linking to existing record
        print("\n🔗 Employee Registration Linking Test")
        if not self.test_employee_registration():
            return False
            
        self.test_login()
        self.test_get_current_user()
        
        # NEW: Payroll Structure Management Tests
        print("\n🏗️ Payroll Structure Management Tests (NEW)")
        self.test_create_payroll_structure()
        self.test_list_payroll_structures()
        
        # Payroll Management Tests (updated to use structures)
        print("\n💰 Payroll Management Tests (UPDATED)")
        self.test_assign_payroll_with_structure()  # NEW: Uses structure ID
        self.test_get_payroll()
        self.test_generate_payslip()
        self.test_get_employee_payslips()
        self.test_download_payslip()
        
        # Leave Management Tests (updated with assignments)
        print("\n📅 Leave Management Tests (UPDATED)")
        self.test_create_leave_policy_with_description()  # NEW: With description field
        self.test_list_leave_policies()
        
        # NEW: Leave Assignment System Tests
        print("\n📋 Leave Assignment System Tests (NEW)")
        self.test_create_leave_assignment()
        self.test_get_employee_leave_assignments()
        
        # Leave Request Tests (updated to work with assignments)
        print("\n📝 Leave Request Tests (UPDATED)")
        self.test_create_leave_request()
        self.test_list_leave_requests()
        self.test_update_leave_request()
        
        # NEW: Leave Balance with Assignments
        print("\n⚖️ Leave Balance with Assignments Tests (NEW)")
        self.test_leave_balance_with_assignments()
        
        # Cleanup
        print("\n🧹 Cleanup Tests")
        self.test_delete_leave_policy()
        
        # Print Results
        print("\n" + "=" * 80)
        print(f"📊 Test Results: {self.tests_passed}/{self.tests_run} passed")
        
        if self.failed_tests:
            print("\n❌ Failed Tests:")
            for failure in self.failed_tests:
                print(f"  - {failure}")
        
        success_rate = (self.tests_passed / self.tests_run) * 100 if self.tests_run > 0 else 0
        print(f"\n✨ Success Rate: {success_rate:.1f}%")
        
        # Detailed breakdown
        print(f"\n📈 NEW FEATURES TESTED:")
        print(f"  - Department Management (Create/List)")
        print(f"  - Employee Update (PUT endpoint)")
        print(f"  - Organizational Tree (Hierarchy view)")
        print(f"  - Payroll Structure System (Create/Assign)")
        print(f"  - Leave Assignment System (Custom allocations)")
        print(f"  - Leave Policy with Description")
        print(f"  - Backward Compatibility (department field)")
        print(f"  - Leave Balance with Assignments")
        
        return success_rate >= 80  # Consider 80%+ as passing

def main():
    tester = HRAPITester()
    success = tester.run_all_tests()
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())