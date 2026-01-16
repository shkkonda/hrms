#!/usr/bin/env python3
"""
HR Management System Backend API Testing
Tests all authentication, employee, payroll, and leave management endpoints
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
        """Test creating employee"""
        employee_email = f"john_{datetime.now().strftime('%H%M%S')}@company.com"
        employee_data = {
            "name": "John Doe",
            "email": employee_email,
            "department": "Engineering",
            "joining_date": "2024-01-15"
        }
        
        success, response, status = self.make_request('POST', '/employees', employee_data, self.admin_token, expect_status=200)
        if success and 'id' in response:
            self.test_employee_id = response['id']
            self.test_employee_email = employee_email  # Store for employee registration
            self.log_test("Create Employee", True)
            return True
        else:
            self.log_test("Create Employee", False, f"Status: {status}")
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

    def test_assign_payroll(self):
        """Test assigning payroll to employee"""
        if not self.test_employee_id:
            self.log_test("Assign Payroll", False, "No employee ID to test")
            return False
            
        payroll_data = {
            "employee_id": self.test_employee_id,
            "basic_salary": 5000.00,
            "allowances": 500.00,
            "deductions": 200.00
        }
        
        success, response, status = self.make_request('POST', '/payroll', payroll_data, self.admin_token, expect_status=200)
        if success and response.get('employee_id') == self.test_employee_id:
            self.log_test("Assign Payroll", True)
            return True
        else:
            self.log_test("Assign Payroll", False, f"Status: {status}")
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
        """Test creating leave policy"""
        policy_data = {
            "name": "Casual Leave",
            "days_per_year": 12
        }
        
        success, response, status = self.make_request('POST', '/leave-policies', policy_data, self.admin_token, expect_status=200)
        if success and 'id' in response:
            self.test_policy_id = response['id']
            self.log_test("Create Leave Policy", True)
            return True
        else:
            self.log_test("Create Leave Policy", False, f"Status: {status}")
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
        """Test creating leave request as employee"""
        if not self.test_policy_id:
            self.log_test("Create Leave Request", False, "No policy ID to test")
            return False
            
        request_data = {
            "leave_policy_id": self.test_policy_id,
            "start_date": "2024-02-01",
            "end_date": "2024-02-03",
            "reason": "Personal work"
        }
        
        success, response, status = self.make_request('POST', '/leave-requests', request_data, self.employee_token, expect_status=200)
        if success and 'id' in response:
            self.test_leave_request_id = response['id']
            self.log_test("Create Leave Request", True)
            return True
        else:
            self.log_test("Create Leave Request", False, f"Status: {status}")
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

    def run_all_tests(self):
        """Run comprehensive test suite"""
        print("🚀 Starting HR Management System Backend API Tests")
        print("=" * 60)
        
        # Authentication Tests
        print("\n📋 Authentication Tests")
        if not self.test_admin_registration():
            return False
        
        # Employee Management Tests (create employee first)
        print("\n👥 Employee Management Tests")
        self.test_create_employee()
        self.test_list_employees()
        self.test_get_employee()
        
        # Now test employee registration linking to existing record
        print("\n🔗 Employee Registration Linking Test")
        if not self.test_employee_registration():
            return False
            
        self.test_login()
        self.test_get_current_user()
        
        # Payroll Management Tests
        print("\n💰 Payroll Management Tests")
        self.test_assign_payroll()
        self.test_get_payroll()
        self.test_generate_payslip()
        self.test_get_employee_payslips()
        self.test_download_payslip()
        
        # Leave Management Tests
        print("\n📅 Leave Management Tests")
        self.test_create_leave_policy()
        self.test_list_leave_policies()
        self.test_create_leave_request()
        self.test_list_leave_requests()
        self.test_update_leave_request()
        self.test_get_leave_balance()
        self.test_delete_leave_policy()
        
        # Print Results
        print("\n" + "=" * 60)
        print(f"📊 Test Results: {self.tests_passed}/{self.tests_run} passed")
        
        if self.failed_tests:
            print("\n❌ Failed Tests:")
            for failure in self.failed_tests:
                print(f"  - {failure}")
        
        success_rate = (self.tests_passed / self.tests_run) * 100 if self.tests_run > 0 else 0
        print(f"\n✨ Success Rate: {success_rate:.1f}%")
        
        return success_rate >= 80  # Consider 80%+ as passing

def main():
    tester = HRAPITester()
    success = tester.run_all_tests()
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())