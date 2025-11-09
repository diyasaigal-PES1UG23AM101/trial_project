import unittest
import json
from server import app, Asset, License, initialize_database

class IIMSExtendedTestCase(unittest.TestCase):
    """Extended test cases to increase code coverage"""
    
    def setUp(self):
        """Set up test client"""
        self.app = app.test_client()
        self.app.testing = True
        # Reset authentication state
        import server
        server.current_role = None
        server.current_user = None
        server.is_authenticated = False
        with app.app_context():
            initialize_database(reset=True)
    
    def test_login_itstaff(self):
        """Test IT Staff login (no MFA required)"""
        response = self.app.post('/api/auth/login',
                                json={'username': 'itstaff', 'password': 'it123'})
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertTrue(data.get('success', False))
        self.assertEqual(data.get('role'), 'IT Staff')
    
    def test_login_employee(self):
        """Test Employee login"""
        response = self.app.post('/api/auth/login',
                                json={'username': 'employee', 'password': 'emp123'})
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertTrue(data.get('success', False))
        self.assertEqual(data.get('role'), 'Employee')
    
    def test_logout(self):
        """Test logout functionality"""
        # First login
        self.app.post('/api/auth/login',
                     json={'username': 'itstaff', 'password': 'it123'})
        # Then logout
        response = self.app.post('/api/auth/logout')
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertTrue(data.get('success', False))
    
    def test_auth_status_authenticated(self):
        """Test auth status when authenticated"""
        # Login first
        self.app.post('/api/auth/login',
                     json={'username': 'itstaff', 'password': 'it123'})
        # Check status
        response = self.app.get('/api/auth/status')
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertTrue(data.get('authenticated', False))
        self.assertEqual(data.get('role'), 'IT Staff')
    
    def test_create_asset_authenticated(self):
        """Test creating asset with authentication"""
        # Login as IT Staff
        self.app.post('/api/auth/login',
                     json={'username': 'itstaff', 'password': 'it123'})
        # Create asset
        response = self.app.post('/api/assets',
                                json={
                                    'action': 'create',
                                    'assetId': 'TEST-NEW-001',
                                    'assetType': 'Test Device',
                                    'assignedUser': 'Test User',
                                    'purchaseDate': '2024-01-01',
                                    'warrantyExpiryDate': '2027-01-01',
                                    'department': 'IT',
                                    'status': 'Active'
                                })
        self.assertEqual(response.status_code, 201)
        data = json.loads(response.data)
        self.assertEqual(data['assetId'], 'TEST-NEW-001')
    
    def test_update_asset_authenticated(self):
        """Test updating asset with authentication"""
        # Login as IT Staff
        self.app.post('/api/auth/login',
                     json={'username': 'itstaff', 'password': 'it123'})
        # Update existing asset
        with app.app_context():
            asset = Asset.query.first()
        if asset:
            response = self.app.post('/api/assets',
                                    json={
                                        'action': 'update',
                                        'assetId': asset.asset_id,
                                        'assetType': 'Updated Type',
                                        'assignedUser': asset.assigned_user,
                                        'purchaseDate': asset.purchase_date.strftime('%Y-%m-%d'),
                                        'warrantyExpiryDate': asset.warranty_expiry_date.strftime('%Y-%m-%d'),
                                        'department': asset.department,
                                        'status': 'Maintenance'
                                    })
            self.assertEqual(response.status_code, 200)
            data = json.loads(response.data)
            self.assertEqual(data['status'], 'Maintenance')
    
    def test_delete_asset_authenticated(self):
        """Test deleting asset with authentication"""
        # Login as IT Staff
        self.app.post('/api/auth/login',
                     json={'username': 'itstaff', 'password': 'it123'})
        # Create a test asset first
        self.app.post('/api/assets',
                     json={
                         'action': 'create',
                         'assetId': 'TEST-DELETE-001',
                         'assetType': 'Test Device',
                         'assignedUser': 'Test User',
                         'purchaseDate': '2024-01-01',
                         'warrantyExpiryDate': '2027-01-01',
                         'department': 'IT',
                         'status': 'Active'
                     })
        # Delete it
        response = self.app.post('/api/assets',
                                json={'action': 'delete', 'assetId': 'TEST-DELETE-001'})
        self.assertEqual(response.status_code, 200)
    
    def test_create_license_authenticated(self):
        """Test creating license with authentication"""
        # Login as IT Staff
        self.app.post('/api/auth/login',
                     json={'username': 'itstaff', 'password': 'it123'})
        # Create license
        response = self.app.post('/api/licenses',
                                json={
                                    'action': 'create',
                                    'licenseId': 'TEST-LIC-001',
                                    'softwareName': 'Test Software',
                                    'licenseKey': 'TEST-KEY-001',
                                    'totalSeats': 10,
                                    'usedSeats': 5,
                                    'expiryDate': '2025-12-31',
                                    'complianceStatus': 'Compliant'
                                })
        self.assertEqual(response.status_code, 201)
        data = json.loads(response.data)
        self.assertEqual(data['licenseId'], 'TEST-LIC-001')
    
    def test_update_license_authenticated(self):
        """Test updating license with authentication"""
        # Login as IT Staff
        self.app.post('/api/auth/login',
                     json={'username': 'itstaff', 'password': 'it123'})
        # Update existing license
        with app.app_context():
            license_obj = License.query.first()
        if license_obj:
            response = self.app.post('/api/licenses',
                                    json={
                                        'action': 'update',
                                        'licenseId': license_obj.license_id,
                                        'softwareName': license_obj.software_name,
                                        'licenseKey': license_obj.license_key,
                                        'totalSeats': license_obj.total_seats,
                                        'usedSeats': 50,
                                        'expiryDate': license_obj.expiry_date.strftime('%Y-%m-%d'),
                                        'complianceStatus': license_obj.compliance_status
                                    })
            self.assertEqual(response.status_code, 200)
            data = json.loads(response.data)
            self.assertEqual(data['usedSeats'], 50)
    
    def test_delete_license_authenticated(self):
        """Test deleting license with authentication"""
        # Login as IT Staff
        self.app.post('/api/auth/login',
                     json={'username': 'itstaff', 'password': 'it123'})
        # Create a test license first
        self.app.post('/api/licenses',
                     json={
                         'action': 'create',
                         'licenseId': 'TEST-DEL-LIC-001',
                         'softwareName': 'Test Software',
                         'licenseKey': 'TEST-KEY',
                         'totalSeats': 10,
                         'usedSeats': 5,
                         'expiryDate': '2025-12-31',
                         'complianceStatus': 'Compliant'
                     })
        # Delete it
        response = self.app.post('/api/licenses',
                                json={'action': 'delete', 'licenseId': 'TEST-DEL-LIC-001'})
        self.assertEqual(response.status_code, 200)
    
    def test_backup_verification_authenticated(self):
        """Test backup verification with proper authentication"""
        # Login as Admin
        self.app.post('/api/auth/login',
                     json={'username': 'admin', 'password': 'admin123', 'mfaCode': '123456'})
        # Run verification
        response = self.app.post('/api/monitoring/backup/verify')
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertIn('verifiedJobs', data)
        self.assertIn('results', data)
    
    def test_employee_asset_filtering(self):
        """Test that Employee role only sees assigned assets"""
        # Login as Employee
        self.app.post('/api/auth/login',
                     json={'username': 'employee', 'password': 'emp123'})
        # Get assets
        response = self.app.get('/api/assets')
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        # All assets should be assigned to Alice Johnson
        for asset in data:
            self.assertEqual(asset['assignedUser'], 'Alice Johnson')
    
    def test_audit_log_access(self):
        """Admin should be able to access audit log"""
        # Login as Admin
        self.app.post('/api/auth/login',
                     json={'username': 'admin', 'password': 'admin123', 'mfaCode': '123456'})
        # Access audit log
        response = self.app.get('/api/audit-log')
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertIsInstance(data, list)

    def test_audit_log_itstaff_denied(self):
        """IT Staff should not see audit log"""
        self.app.post('/api/auth/login',
                     json={'username': 'itstaff', 'password': 'it123'})
        response = self.app.get('/api/audit-log')
        self.assertEqual(response.status_code, 403)
    
    def test_audit_log_employee_denied(self):
        """Test that Employee cannot access audit log"""
        # Login as Employee
        self.app.post('/api/auth/login',
                     json={'username': 'employee', 'password': 'emp123'})
        # Try to access audit log
        response = self.app.get('/api/audit-log')
        self.assertEqual(response.status_code, 403)
    
    def test_asset_not_found_update(self):
        """Test updating non-existent asset"""
        # Login as IT Staff
        self.app.post('/api/auth/login',
                     json={'username': 'itstaff', 'password': 'it123'})
        # Try to update non-existent asset
        response = self.app.post('/api/assets',
                                json={
                                    'action': 'update',
                                    'assetId': 'NON-EXISTENT-001',
                                    'assetType': 'Test'
                                })
        self.assertEqual(response.status_code, 404)
    
    def test_license_not_found_update(self):
        """Test updating non-existent license"""
        # Login as IT Staff
        self.app.post('/api/auth/login',
                     json={'username': 'itstaff', 'password': 'it123'})
        # Try to update non-existent license
        response = self.app.post('/api/licenses',
                                json={
                                    'action': 'update',
                                    'licenseId': 'NON-EXISTENT-001',
                                    'softwareName': 'Test'
                                })
        self.assertEqual(response.status_code, 404)
    
    def test_qr_code_invalid_asset(self):
        """Test QR code generation for non-existent asset"""
        response = self.app.get('/api/assets/INVALID-ASSET-001/qr')
        self.assertEqual(response.status_code, 404)
    
    def test_biometric_login_mock(self):
        """Test biometric login mock (should fail)"""
        response = self.app.post('/api/auth/login',
                                json={'username': 'admin', 'password': 'admin123', 'useBiometric': True})
        self.assertEqual(response.status_code, 400)
        data = json.loads(response.data)
        self.assertFalse(data.get('success', True))
    
    def test_admin_can_create_user(self):
        """Admin should be able to create new users with roles"""
        # Login as Admin
        self.app.post('/api/auth/login',
                     json={'username': 'admin', 'password': 'admin123', 'mfaCode': '123456'})
        # Create new user
        response = self.app.post('/api/users',
                                json={
                                    'username': 'newemployee',
                                    'password': 'emp456',
                                    'role': 'Employee',
                                    'name': 'New Employee',
                                    'requiresMFA': False
                                })
        self.assertEqual(response.status_code, 201)
        data = json.loads(response.data)
        self.assertEqual(data['username'], 'newemployee')
        self.assertEqual(data['role'], 'Employee')
        # Fetch user list
        list_response = self.app.get('/api/users')
        self.assertEqual(list_response.status_code, 200)
        users = json.loads(list_response.data)
        usernames = [user['username'] for user in users]
        self.assertIn('newemployee', usernames)
    
    def test_non_admin_cannot_create_user(self):
        """Non-admin roles should be denied user creation"""
        # Login as IT Staff
        self.app.post('/api/auth/login',
                     json={'username': 'itstaff', 'password': 'it123'})
        response = self.app.post('/api/users',
                                json={
                                    'username': 'blockeduser',
                                    'password': 'test123',
                                    'role': 'Employee'
                                })
        self.assertEqual(response.status_code, 403)
        # GET should also be forbidden
        response = self.app.get('/api/users')
        self.assertEqual(response.status_code, 403)

    def test_admin_can_view_employee_assets(self):
        """Admin should be able to view assets assigned to an employee"""
        # Login as Admin
        self.app.post('/api/auth/login',
                     json={'username': 'admin', 'password': 'admin123', 'mfaCode': '123456'})
        response = self.app.get('/api/users/employee/assets')
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertIsInstance(data, list)
        self.assertGreater(len(data), 0)
        for asset in data:
            self.assertEqual(asset['assignedUser'], 'Alice Johnson')

    def test_non_admin_cannot_view_employee_assets(self):
        """Only Admin can view employee assets"""
        # Login as IT Staff
        self.app.post('/api/auth/login',
                     json={'username': 'itstaff', 'password': 'it123'})
        response = self.app.get('/api/users/employee/assets')
        self.assertEqual(response.status_code, 403)

    def test_admin_can_generate_reports(self):
        """Admin should receive full report payload"""
        self.app.post('/api/auth/login',
                     json={'username': 'admin', 'password': 'admin123', 'mfaCode': '123456'})
        response = self.app.get('/api/reports/overview')
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        for key in [
            'assetsReport',
            'softwareLicenseReport',
            'hardwareNetworkReport',
            'backupRecoveryReport',
            'departmentAssetReport',
            'generatedAt'
        ]:
            self.assertIn(key, data)
        self.assertIn('totalAssets', data['assetsReport'])
        self.assertIn('totalLicensedSoftware', data['softwareLicenseReport'])
        self.assertIn('averageCpuLoad', data['hardwareNetworkReport'])
        self.assertIn('backupsRunThisWeek', data['backupRecoveryReport'])
        self.assertIn('assetsPerDepartment', data['departmentAssetReport'])

    def test_non_admin_cannot_generate_reports(self):
        """Only Admin role can access reports endpoint"""
        self.app.post('/api/auth/login',
                     json={'username': 'itstaff', 'password': 'it123'})
        response = self.app.get('/api/reports/overview')
        self.assertEqual(response.status_code, 403)

    def test_admin_can_download_report_csv(self):
        """Reports endpoint should support CSV output"""
        self.app.post('/api/auth/login',
                     json={'username': 'admin', 'password': 'admin123', 'mfaCode': '123456'})
        response = self.app.get('/api/reports/overview?format=csv')
        self.assertEqual(response.status_code, 200)
        self.assertIn('text/csv', response.headers.get('Content-Type', ''))
        content = response.data.decode('utf-8')
        self.assertIn('Assets Report', content)
        self.assertIn('Software License Report', content)
        self.assertIn('Hardware & Network Monitoring Report', content)

    def test_itstaff_can_comment_on_backup(self):
        """IT Staff can add technician comments to backup jobs"""
        self.app.post('/api/auth/login',
                     json={'username': 'itstaff', 'password': 'it123'})
        response = self.app.post('/api/monitoring/backup/comment',
                                json={'jobId': 'BK-001', 'comment': 'Re-run scheduled'})
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertEqual(data['technicianComment'], 'Re-run scheduled')

    def test_admin_cannot_comment_on_backup(self):
        """Admin role should be read-only for backup comments"""
        self.app.post('/api/auth/login',
                     json={'username': 'admin', 'password': 'admin123', 'mfaCode': '123456'})
        response = self.app.post('/api/monitoring/backup/comment',
                                json={'jobId': 'BK-001', 'comment': 'Should not be saved'})
        self.assertEqual(response.status_code, 403)

    def test_admin_can_view_asset_logs(self):
        """Admin should see asset logs when assets are modified"""
        self.app.post('/api/auth/login',
                     json={'username': 'admin', 'password': 'admin123', 'mfaCode': '123456'})
        self.app.post('/api/assets',
                     json={
                         'action': 'create',
                         'assetId': 'TEST-ASSET-001',
                         'assetType': 'Test Device',
                         'assignedUser': 'QA User',
                         'purchaseDate': '2024-01-01',
                         'warrantyExpiryDate': '2027-01-01',
                         'department': 'QA',
                         'status': 'Active'
                     })
        response = self.app.get('/api/assets/logs')
        self.assertEqual(response.status_code, 200)
        logs = json.loads(response.data)
        self.assertGreater(len(logs), 0)
        self.assertTrue(any(log['assetId'] == 'TEST-ASSET-001' and log['action'] == 'CREATE' for log in logs))

    def test_itstaff_cannot_view_asset_logs(self):
        """Only Admin can access asset logs"""
        self.app.post('/api/auth/login',
                     json={'username': 'itstaff', 'password': 'it123'})
        response = self.app.get('/api/assets/logs')
        self.assertEqual(response.status_code, 403)

    def test_employee_cannot_comment_on_backup(self):
        """Employees are denied backup comment updates"""
        self.app.post('/api/auth/login',
                     json={'username': 'employee', 'password': 'emp123'})
        response = self.app.post('/api/monitoring/backup/comment',
                                json={'jobId': 'BK-001', 'comment': 'Should fail'})
        self.assertEqual(response.status_code, 403)

if __name__ == '__main__':
    unittest.main()

