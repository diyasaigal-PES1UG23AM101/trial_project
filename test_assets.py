import unittest
import json
from datetime import datetime, timedelta

from app import create_app, db
from app.models import Asset

class AssetTestCase(unittest.TestCase):
    """
    Tests CRUD operations for assets (Create, Update, Delete).
    """

    def setUp(self):
        """
        Setup a clean, isolated testing environment before each test.
        """
        test_config = {
            'TESTING': True,
            'SQLALCHEMY_DATABASE_URI': 'sqlite:///:memory:',
            'SECRET_KEY': 'test_key'
        }
        self.app_instance = create_app(test_config=test_config)
        
        # --- WERKZEUG COMPATIBILITY PATCH ---
        try:
            self.app = self.app_instance.test_client()
        except (AttributeError, TypeError):
            # Fallback for Windows/Python version conflicts
            self.app = self.app_instance.test_client(use_cookies=True) 
        # --- END WERKZEUG COMPATIBILITY PATCH ---
        
        with self.app_instance.app_context():
            db.create_all()

    def tearDown(self):
        """
        Clean up the database by dropping all tables after each test.
        """
        with self.app_instance.app_context():
            db.session.remove()
            db.drop_all()

    def _create_test_asset(self, name="Test Asset", serial="SN123", purchase_date="2024-01-01"):
        """Helper method to quickly create an asset for testing."""
        asset_data = {
            "name": name,
            "serial_number": serial,
            "purchase_date": purchase_date,
            "assigned_user": "Test User"
        }
        response = self.app.post('/assets', data=json.dumps(asset_data), content_type='application/json')
        self.assertEqual(response.status_code, 201)
        return json.loads(response.get_data(as_text=True))

    # --- CREATE Tests (Story 2.1) ---

    def test_1_create_asset_success_full_data(self):
        """ Tests successful creation with all fields. """
        today = datetime.now().strftime('%Y-%m-%d')
        next_year = (datetime.now() + timedelta(days=365)).strftime('%Y-%m-%d')
        asset_data = {
            "name": "Dell Laptop", "serial_number": "DL5420-SN-12345", 
            "purchase_date": today, "warranty_end_date": next_year, 
            "assigned_user": "Jane Doe"
        }
        response = self.app.post('/assets', data=json.dumps(asset_data), content_type='application/json')
        self.assertEqual(response.status_code, 201)
        
    def test_2_create_asset_success_minimum_data(self):
        """ Tests successful creation with only mandatory fields. """
        today = datetime.now().strftime('%Y-%m-%d')
        asset_data = {"name": "Ethernet Switch", "purchase_date": today}
        response = self.app.post('/assets', data=json.dumps(asset_data), content_type='application/json')
        self.assertEqual(response.status_code, 201)

    def test_3_create_asset_missing_purchase_date(self):
        """ Tests failure when a mandatory field is missing. """
        asset_data = {"name": "Missing Data Test"}
        response = self.app.post('/assets', data=json.dumps(asset_data), content_type='application/json')
        self.assertEqual(response.status_code, 400)

    def test_4_create_asset_invalid_date_format(self):
        """ Tests failure when date is in incorrect format. """
        asset_data = {"name": "Wrong Date Test", "purchase_date": "2024.01.01"}
        response = self.app.post('/assets', data=json.dumps(asset_data), content_type='application/json')
        self.assertEqual(response.status_code, 400)

    def test_5_create_asset_warranty_before_purchase(self):
        """ Tests failure due to business logic (warranty before purchase). """
        today = datetime.now().strftime('%Y-%m-%d')
        yesterday = (datetime.now() - timedelta(days=1)).strftime('%Y-%m-%d')
        asset_data = {"name": "Server Rack", "purchase_date": today, "warranty_end_date": yesterday}
        response = self.app.post('/assets', data=json.dumps(asset_data), content_type='application/json')
        self.assertEqual(response.status_code, 400)

    def test_6_create_asset_duplicate_serial_number(self):
        """ Tests failure when attempting to create an asset with a duplicate serial number. """
        today = datetime.now().strftime('%Y-%m-%d')
        self._create_test_asset("Asset A", "DUPE-SN-001", today)
        duplicate_data = {"name": "Asset B", "serial_number": "DUPE-SN-001", "purchase_date": today}
        response = self.app.post('/assets', data=json.dumps(duplicate_data), content_type='application/json')
        self.assertEqual(response.status_code, 409)


    # --- UPDATE Tests (Story 2.2) ---

    def test_7_update_asset_success(self):
        """Tests successful update of multiple fields (name and user)."""
        asset_info = self._create_test_asset("Old Laptop", "OLD-SN", "2023-01-01")
        asset_id = asset_info['asset_id']

        update_data = {"name": "New Laptop Model", "assigned_user": "Alan Turing"}

        response = self.app.put(
            f'/assets/{asset_id}',
            data=json.dumps(update_data),
            content_type='application/json'
        )

        self.assertEqual(response.status_code, 200)
        with self.app_instance.app_context():
            asset = Asset.query.get(asset_id)
            self.assertEqual(asset.name, "New Laptop Model")
            self.assertEqual(asset.assigned_user, "Alan Turing")


    def test_8_update_asset_not_found(self):
        """Tests failure when updating a non-existent asset ID."""
        response = self.app.put(
            '/assets/9999',
            data=json.dumps({"name": "Ghost"}),
            content_type='application/json'
        )
        self.assertEqual(response.status_code, 404)


    def test_9_update_asset_invalid_warranty_date(self):
        """Tests failure when an update violates business logic (warranty before purchase)."""
        asset_info = self._create_test_asset("Test Server", "SRV-TEST", "2024-10-01")
        asset_id = asset_info['asset_id']
        
        update_data = {"warranty_end_date": "2024-09-01"} 

        response = self.app.put(
            f'/assets/{asset_id}',
            data=json.dumps(update_data),
            content_type='application/json'
        )
        self.assertEqual(response.status_code, 400)


    # --- DELETE Tests (Story 2.2) ---

    def test_10_delete_asset_success(self):
        """Tests successful deletion of an existing asset."""
        asset_info = self._create_test_asset("Router X", "RTR-X", "2024-05-01")
        asset_id = asset_info['asset_id']

        response = self.app.delete(f'/assets/{asset_id}')

        self.assertEqual(response.status_code, 200)
        with self.app_instance.app_context():
            asset = Asset.query.get(asset_id)
            self.assertIsNone(asset)


    def test_11_delete_asset_not_found(self):
        """Tests failure when deleting a non-existent asset ID."""
        response = self.app.delete('/assets/9999')
        self.assertEqual(response.status_code, 404)