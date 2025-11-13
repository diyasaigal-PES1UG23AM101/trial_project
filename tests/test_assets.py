import unittest
import json
from datetime import datetime, timedelta

from app import create_app, db
from app.models import Asset

class AssetTestCase(unittest.TestCase):
    def setUp(self):
        test_config = {'TESTING': True, 'SQLALCHEMY_DATABASE_URI': 'sqlite:///:memory:', 'SECRET_KEY': 'test_key'}
        self.app_instance = create_app(test_config=test_config)
        
        # WERKZEUG COMPATIBILITY PATCH
        try:
            self.app = self.app_instance.test_client()
        except (AttributeError, TypeError):
            self.app = self.app_instance.test_client(use_cookies=True) 
        
        with self.app_instance.app_context():
            db.create_all()

    def tearDown(self):
        with self.app_instance.app_context():
            db.session.remove()
            db.drop_all()

    def _create_test_asset(self, name, serial, purchase_date):
        asset_data = {"name": name, "serial_number": serial, "purchase_date": purchase_date, "assigned_user": "Test User"}
        response = self.app.post('/assets', data=json.dumps(asset_data), content_type='application/json')
        self.assertEqual(response.status_code, 201)
        return json.loads(response.get_data(as_text=True))


    def test_1_create_asset_success_full_data(self):
        today = datetime.now().strftime('%Y-%m-%d')
        next_year = (datetime.now() + timedelta(days=365)).strftime('%Y-%m-%d')
        asset_data = {"name": "Dell Laptop", "serial_number": "DL5420-SN-12345", "purchase_date": today, "warranty_end_date": next_year, "assigned_user": "Jane Doe"}
        response = self.app.post('/assets', data=json.dumps(asset_data), content_type='application/json')
        self.assertEqual(response.status_code, 201)

    def test_2_create_asset_success_minimum_data(self):
        today = datetime.now().strftime('%Y-%m-%d')
        asset_data = {"name": "Ethernet Switch", "purchase_date": today}
        response = self.app.post('/assets', data=json.dumps(asset_data), content_type='application/json')
        self.assertEqual(response.status_code, 201)

    def test_3_create_asset_missing_purchase_date(self):
        asset_data = {"name": "Missing Data Test"}
        response = self.app.post('/assets', data=json.dumps(asset_data), content_type='application/json')
        self.assertEqual(response.status_code, 400)

    def test_4_create_asset_invalid_date_format(self):
        asset_data = {"name": "Wrong Date Test", "purchase_date": "2024.01.01"}
        response = self.app.post('/assets', data=json.dumps(asset_data), content_type='application/json')
        self.assertEqual(response.status_code, 400)

    def test_5_create_asset_warranty_before_purchase(self):
        today = datetime.now().strftime('%Y-%m-%d')
        yesterday = (datetime.now() - timedelta(days=1)).strftime('%Y-%m-%d')
        asset_data = {"name": "Server Rack", "purchase_date": today, "warranty_end_date": yesterday}
        response = self.app.post('/assets', data=json.dumps(asset_data), content_type='application/json')
        self.assertEqual(response.status_code, 400)

    def test_6_create_asset_duplicate_serial_number(self):
        today = datetime.now().strftime('%Y-%m-%d')
        self._create_test_asset("Asset A", "DUPE-SN-001", today)
        duplicate_data = {"name": "Asset B", "serial_number": "DUPE-SN-001", "purchase_date": today}
        response = self.app.post('/assets', data=json.dumps(duplicate_data), content_type='application/json')
        self.assertEqual(response.status_code, 409)
