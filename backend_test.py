#!/usr/bin/env python3
"""
CRM Backend API Testing Suite
Tests all major API endpoints for the CRM system
"""

import requests
import sys
import json
from datetime import datetime, timedelta
from typing import Dict, Any, Optional

class CRMAPITester:
    def __init__(self, base_url="https://customer-360-7.preview.emergentagent.com"):
        self.base_url = base_url
        self.admin_token = None
        self.customer_token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []
        
        # Test data storage
        self.created_customer_id = None
        self.created_inquiry_id = None
        self.created_followup_id = None
        self.created_quotation_id = None
        self.created_inventory_id = None
        self.created_ticket_id = None

    def log_test(self, name: str, success: bool, details: str = ""):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
        
        result = {
            "test": name,
            "status": "PASS" if success else "FAIL",
            "details": details,
            "timestamp": datetime.now().isoformat()
        }
        self.test_results.append(result)
        
        status_icon = "✅" if success else "❌"
        print(f"{status_icon} {name}: {details}")

    def make_request(self, method: str, endpoint: str, data: Dict = None, 
                    token: str = None, expected_status: int = 200) -> tuple[bool, Dict]:
        """Make HTTP request with error handling"""
        url = f"{self.base_url}/api/{endpoint}"
        headers = {'Content-Type': 'application/json'}
        
        if token:
            headers['Authorization'] = f'Bearer {token}'
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, timeout=30)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers, timeout=30)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers, timeout=30)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers, timeout=30)
            else:
                return False, {"error": f"Unsupported method: {method}"}

            success = response.status_code == expected_status
            try:
                response_data = response.json()
            except:
                response_data = {"status_code": response.status_code, "text": response.text}
            
            return success, response_data
            
        except requests.exceptions.RequestException as e:
            return False, {"error": str(e)}

    def test_admin_login(self):
        """Test admin login"""
        success, data = self.make_request(
            'POST', 'auth/login',
            {"email": "admin@crm.com", "password": "Admin@123"}
        )
        
        if success and 'access_token' in data:
            self.admin_token = data['access_token']
            self.log_test("Admin Login", True, f"Logged in as {data['user']['name']}")
            return True
        else:
            self.log_test("Admin Login", False, f"Failed: {data}")
            return False

    def test_customer_registration(self):
        """Test customer registration"""
        customer_data = {
            "email": f"test_customer_{datetime.now().strftime('%H%M%S')}@test.com",
            "password": "TestPass123!",
            "name": "Test Customer",
            "phone": "+91-9876543210",
            "company": "Test Company"
        }
        
        success, data = self.make_request('POST', 'auth/register', customer_data, expected_status=200)
        
        if success and 'access_token' in data:
            self.customer_token = data['access_token']
            self.created_customer_id = data['user']['id']
            self.log_test("Customer Registration", True, f"Registered {data['user']['name']}")
            return True
        else:
            self.log_test("Customer Registration", False, f"Failed: {data}")
            return False

    def test_dashboard_stats(self):
        """Test dashboard stats endpoint"""
        success, data = self.make_request('GET', 'dashboard/stats', token=self.admin_token)
        
        if success and 'total_customers' in data:
            self.log_test("Dashboard Stats", True, f"Retrieved stats: {len(data)} metrics")
            return True
        else:
            self.log_test("Dashboard Stats", False, f"Failed: {data}")
            return False

    def test_create_customer_via_users(self):
        """Test creating customer via users endpoint (admin only)"""
        customer_data = {
            "email": f"admin_created_{datetime.now().strftime('%H%M%S')}@test.com",
            "password": "TestPass123!",
            "name": "Admin Created Customer",
            "role": "customer",
            "phone": "+91-9876543211",
            "company": "Admin Test Company"
        }
        
        success, data = self.make_request('POST', 'users', customer_data, token=self.admin_token)
        
        if success and '_id' in data:
            self.log_test("Create Customer (Admin)", True, f"Created customer {data['name']}")
            return True
        else:
            self.log_test("Create Customer (Admin)", False, f"Failed: {data}")
            return False

    def test_list_customers(self):
        """Test listing customers"""
        success, data = self.make_request('GET', 'customers', token=self.admin_token)
        
        if success and isinstance(data, list):
            self.log_test("List Customers", True, f"Retrieved {len(data)} customers")
            return True
        else:
            self.log_test("List Customers", False, f"Failed: {data}")
            return False

    def test_create_inquiry(self):
        """Test creating inquiry"""
        inquiry_data = {
            "title": "Test Inquiry",
            "description": "This is a test inquiry for API testing",
            "customer_name": "Test Customer",
            "customer_email": "test@example.com",
            "priority": "high",
            "source": "api_test"
        }
        
        success, data = self.make_request('POST', 'inquiries', inquiry_data, token=self.admin_token)
        
        if success and 'id' in data:
            self.created_inquiry_id = data['id']
            self.log_test("Create Inquiry", True, f"Created inquiry: {data['title']}")
            return True
        else:
            self.log_test("Create Inquiry", False, f"Failed: {data}")
            return False

    def test_list_inquiries(self):
        """Test listing inquiries"""
        success, data = self.make_request('GET', 'inquiries', token=self.admin_token)
        
        if success and isinstance(data, list):
            self.log_test("List Inquiries", True, f"Retrieved {len(data)} inquiries")
            return True
        else:
            self.log_test("List Inquiries", False, f"Failed: {data}")
            return False

    def test_create_followup(self):
        """Test creating follow-up"""
        followup_data = {
            "inquiry_id": self.created_inquiry_id,
            "customer_name": "Test Customer",
            "type": "call",
            "notes": "Follow up call scheduled",
            "due_date": (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%d")
        }
        
        success, data = self.make_request('POST', 'followups', followup_data, token=self.admin_token)
        
        if success and 'id' in data:
            self.created_followup_id = data['id']
            self.log_test("Create Follow-up", True, f"Created follow-up: {data['type']}")
            return True
        else:
            self.log_test("Create Follow-up", False, f"Failed: {data}")
            return False

    def test_create_quotation(self):
        """Test creating quotation"""
        quotation_data = {
            "customer_name": "Test Customer",
            "customer_email": "test@example.com",
            "customer_gst": "29ABCDE1234F1Z5",
            "billing_address": "123 Test Street, Test City",
            "items": [
                {
                    "name": "Test Product",
                    "description": "Test product description",
                    "quantity": 2,
                    "unit_price": 1000,
                    "gst_rate": 18
                }
            ],
            "valid_until": (datetime.now() + timedelta(days=30)).strftime("%Y-%m-%d"),
            "notes": "Test quotation",
            "status": "draft"
        }
        
        success, data = self.make_request('POST', 'quotations', quotation_data, token=self.admin_token)
        
        if success and 'id' in data:
            self.created_quotation_id = data['id']
            self.log_test("Create Quotation", True, f"Created quotation: {data['quotation_number']}")
            return True
        else:
            self.log_test("Create Quotation", False, f"Failed: {data}")
            return False

    def test_quotation_pdf(self):
        """Test quotation PDF generation"""
        if not self.created_quotation_id:
            self.log_test("Quotation PDF", False, "No quotation ID available")
            return False
        
        url = f"{self.base_url}/api/quotations/{self.created_quotation_id}/pdf"
        headers = {'Authorization': f'Bearer {self.admin_token}'}
        
        try:
            response = requests.get(url, headers=headers, timeout=30)
            success = response.status_code == 200 and response.headers.get('content-type') == 'application/pdf'
            
            if success:
                self.log_test("Quotation PDF", True, f"PDF generated, size: {len(response.content)} bytes")
                return True
            else:
                self.log_test("Quotation PDF", False, f"Status: {response.status_code}")
                return False
        except Exception as e:
            self.log_test("Quotation PDF", False, f"Error: {str(e)}")
            return False

    def test_create_inventory(self):
        """Test creating inventory item"""
        inventory_data = {
            "name": "Test Product",
            "sku": "TEST-001",
            "category": "Electronics",
            "description": "Test product for API testing",
            "quantity": 100,
            "unit_price": 1500,
            "gst_rate": 18,
            "hsn_code": "8517",
            "reorder_level": 10,
            "supplier": "Test Supplier"
        }
        
        success, data = self.make_request('POST', 'inventory', inventory_data, token=self.admin_token)
        
        if success and 'id' in data:
            self.created_inventory_id = data['id']
            self.log_test("Create Inventory", True, f"Created item: {data['name']}")
            return True
        else:
            self.log_test("Create Inventory", False, f"Failed: {data}")
            return False

    def test_list_inventory(self):
        """Test listing inventory"""
        success, data = self.make_request('GET', 'inventory', token=self.admin_token)
        
        if success and isinstance(data, list):
            self.log_test("List Inventory", True, f"Retrieved {len(data)} items")
            return True
        else:
            self.log_test("List Inventory", False, f"Failed: {data}")
            return False

    def test_create_ticket(self):
        """Test creating support ticket"""
        ticket_data = {
            "subject": "Test Support Ticket",
            "description": "This is a test support ticket for API testing",
            "priority": "medium"
        }
        
        success, data = self.make_request('POST', 'tickets', ticket_data, token=self.customer_token)
        
        if success and 'id' in data:
            self.created_ticket_id = data['id']
            self.log_test("Create Ticket", True, f"Created ticket: {data['subject']}")
            return True
        else:
            self.log_test("Create Ticket", False, f"Failed: {data}")
            return False

    def test_list_tickets(self):
        """Test listing tickets"""
        success, data = self.make_request('GET', 'tickets', token=self.admin_token)
        
        if success and isinstance(data, list):
            self.log_test("List Tickets", True, f"Retrieved {len(data)} tickets")
            return True
        else:
            self.log_test("List Tickets", False, f"Failed: {data}")
            return False

    def test_gst_rates(self):
        """Test GST rates endpoint"""
        success, data = self.make_request('GET', 'gst/rates', token=self.admin_token)
        
        if success and isinstance(data, list):
            self.log_test("GST Rates", True, f"Retrieved {len(data)} GST rates")
            return True
        else:
            self.log_test("GST Rates", False, f"Failed: {data}")
            return False

    def test_users_list(self):
        """Test listing users (admin only)"""
        success, data = self.make_request('GET', 'users', token=self.admin_token)
        
        if success and isinstance(data, list):
            self.log_test("List Users", True, f"Retrieved {len(data)} users")
            return True
        else:
            self.log_test("List Users", False, f"Failed: {data}")
            return False

    def run_all_tests(self):
        """Run all API tests"""
        print("🚀 Starting CRM Backend API Tests...")
        print(f"📍 Testing against: {self.base_url}")
        print("=" * 60)
        
        # Authentication tests
        if not self.test_admin_login():
            print("❌ Admin login failed - stopping tests")
            return False
        
        if not self.test_customer_registration():
            print("❌ Customer registration failed - continuing with admin tests")
        
        # Core functionality tests
        self.test_dashboard_stats()
        self.test_create_customer_via_users()
        self.test_list_customers()
        self.test_create_inquiry()
        self.test_list_inquiries()
        self.test_create_followup()
        self.test_create_quotation()
        self.test_quotation_pdf()
        self.test_create_inventory()
        self.test_list_inventory()
        self.test_create_ticket()
        self.test_list_tickets()
        self.test_gst_rates()
        self.test_users_list()
        
        # Print summary
        print("=" * 60)
        print(f"📊 Test Summary: {self.tests_passed}/{self.tests_run} tests passed")
        success_rate = (self.tests_passed / self.tests_run) * 100 if self.tests_run > 0 else 0
        print(f"📈 Success Rate: {success_rate:.1f}%")
        
        if self.tests_passed == self.tests_run:
            print("🎉 All tests passed!")
            return True
        else:
            print(f"⚠️  {self.tests_run - self.tests_passed} tests failed")
            return False

    def save_results(self, filename: str = "/app/test_reports/backend_api_results.json"):
        """Save test results to file"""
        results = {
            "summary": {
                "total_tests": self.tests_run,
                "passed_tests": self.tests_passed,
                "failed_tests": self.tests_run - self.tests_passed,
                "success_rate": (self.tests_passed / self.tests_run) * 100 if self.tests_run > 0 else 0,
                "timestamp": datetime.now().isoformat()
            },
            "test_results": self.test_results
        }
        
        try:
            with open(filename, 'w') as f:
                json.dump(results, f, indent=2)
            print(f"📄 Results saved to: {filename}")
        except Exception as e:
            print(f"❌ Failed to save results: {e}")

def main():
    """Main test execution"""
    tester = CRMAPITester()
    success = tester.run_all_tests()
    tester.save_results()
    
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())