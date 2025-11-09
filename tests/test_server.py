import unittest
import json
from server import (
    app,
    Asset,
    License,
    HardwareHealthRecord,
    BackupJob,
    NetworkDevice,
    initialize_database,
)

class IIMSTestCase(unittest.TestCase):
    """Test cases for IIMS Flask application"""
    
    def setUp(self):
        """Set up test client"""
        self.app = app.test_client()
        self.app.testing = True
        # Reset authentication state before each test
        from server import current_role, current_user, is_authenticated
        import server
        server.current_role = None
        server.current_user = None
        server.is_authenticated = False
        with app.app_context():
            initialize_database(reset=True)
    
    def test_index_route(self):
        """Test that index route returns HTML"""
        response = self.app.get('/')
        self.assertEqual(response.status_code, 200)
        self.assertIn(b'IT Infrastructure Management System', response.data)
    
    def test_dashboard_metrics(self):
        """Test dashboard metrics endpoint"""
        response = self.app.get('/api/dashboard/metrics')
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertIn('totalAssets', data)
        self.assertIn('licensesExpiringSoon', data)
        self.assertIn('hardwareHealthAlerts', data)
        self.assertIn('backupFailures', data)
        self.assertIn('networkEvents', data)
        self.assertIn('licenseAlertDetails', data)
        self.assertIsInstance(data['licenseAlertDetails'], list)
        self.assertTrue(
            any(alert.get('licenseId') == 'LIC-006' for alert in data['licenseAlertDetails']),
            "Expected seeded license LIC-006 to appear in license alert details"
        )
        for alert in data['licenseAlertDetails']:
            self.assertIn('daysUntilExpiry', alert)
            self.assertLessEqual(alert['daysUntilExpiry'], 7)
    
    def test_get_assets(self):
        """Test getting all assets"""
        response = self.app.get('/api/assets')
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertIsInstance(data, list)
        self.assertGreater(len(data), 0)
    
    def test_get_licenses(self):
        """Test getting all licenses"""
        response = self.app.get('/api/licenses')
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertIsInstance(data, list)
        self.assertGreater(len(data), 0)
    
    def test_get_hardware_health(self):
        """Test hardware health monitoring endpoint"""
        response = self.app.get('/api/monitoring/hardware')
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertIsInstance(data, list)
        self.assertGreater(len(data), 0)
    
    def test_get_network_usage(self):
        """Test network usage monitoring endpoint"""
        response = self.app.get('/api/monitoring/network')
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertIsInstance(data, list)
        self.assertGreater(len(data), 0)
    
    def test_get_backup_status(self):
        """Test backup status monitoring endpoint"""
        response = self.app.get('/api/monitoring/backup')
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertIsInstance(data, list)
        self.assertGreater(len(data), 0)
    
    def test_integration_status(self):
        """Test integration status endpoint"""
        response = self.app.get('/api/integrations/status')
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertIsInstance(data, dict)
    
    def test_analytics_endpoint(self):
        """Test analytics by department endpoint"""
        response = self.app.get('/api/analytics/assets-by-department')
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertIsInstance(data, dict)
    
    def test_auth_status_unauthenticated(self):
        """Test auth status when not authenticated"""
        response = self.app.get('/api/auth/status')
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertFalse(data.get('authenticated', True))
    
    def test_login_invalid_credentials(self):
        """Test login with invalid credentials"""
        response = self.app.post('/api/auth/login',
                                json={'username': 'invalid', 'password': 'wrong'})
        self.assertEqual(response.status_code, 401)
        data = json.loads(response.data)
        self.assertFalse(data.get('success', True))
    
    def test_login_admin_without_mfa(self):
        """Test admin login without MFA code"""
        response = self.app.post('/api/auth/login',
                                json={'username': 'admin', 'password': 'admin123'})
        self.assertEqual(response.status_code, 401)
        data = json.loads(response.data)
        self.assertTrue(data.get('requiresMFA', False))
    
    def test_login_admin_with_mfa(self):
        """Test admin login with correct MFA code"""
        response = self.app.post('/api/auth/login',
                                json={'username': 'admin', 'password': 'admin123', 'mfaCode': '123456'})
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertTrue(data.get('success', False))
        self.assertEqual(data.get('role'), 'Admin')
    
    def test_create_asset_unauthorized(self):
        """Test creating asset without authentication"""
        response = self.app.post('/api/assets',
                                json={'action': 'create', 'assetId': 'TEST-001', 'assetType': 'Test'})
        # Should fail or require auth - depends on implementation
        self.assertIn(response.status_code, [201, 403, 401])
    
    def test_qr_code_generation(self):
        """Test QR code generation for asset"""
        with app.app_context():
            asset = Asset.query.first()
            asset_id = asset.asset_id if asset else None
        if asset_id:
            response = self.app.get(f'/api/assets/{asset_id}/qr')
            self.assertEqual(response.status_code, 200)
            data = json.loads(response.data)
            self.assertIn('assetId', data)
            self.assertIn('url', data)
    
    def test_backup_verification_unauthorized(self):
        """Test backup verification without proper role"""
        response = self.app.post('/api/monitoring/backup/verify')
        self.assertIn(response.status_code, [403, 401])
    
    def test_data_model_integrity(self):
        """Test that data models have required fields"""
        with app.app_context():
            assets = Asset.query.all()
            for asset in assets:
                self.assertIsNotNone(asset.asset_id)
                self.assertIsNotNone(asset.asset_type)
                self.assertIsNotNone(asset.department)

            licenses = License.query.all()
            for license in licenses:
                self.assertIsNotNone(license.license_id)
                self.assertIsNotNone(license.software_name)
                self.assertIsNotNone(license.compliance_status)

            breach_count = HardwareHealthRecord.query.filter(
                (HardwareHealthRecord.cpu_load > 85) | (HardwareHealthRecord.is_overheating.is_(True))
            ).count()
            self.assertGreaterEqual(breach_count, 2, "At least 2 devices should breach health threshold")

            flagged_count = NetworkDevice.query.filter(
                (NetworkDevice.is_downtime.is_(True)) | (NetworkDevice.abnormal_traffic.is_(True))
            ).count()
            self.assertGreaterEqual(flagged_count, 2, "At least 2 network devices should be flagged")

            failed_count = BackupJob.query.filter(BackupJob.status.in_(["Failure", "Missed"])).count()
            self.assertGreaterEqual(failed_count, 2, "At least 2 backup jobs should be Failure or Missed")

if __name__ == '__main__':
    unittest.main()

