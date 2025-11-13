# tests/test_licenses.py - Complete Content (Plain Text)

import unittest
import json
from datetime import datetime, timedelta
from app import create_app, db
from app.models import SoftwareLicense

class LicenseTestCase(unittest.TestCase):
    """
    Tests CRUD operations for the SoftwareLicense model.
    """

    def setUp(self):
        """Setup in-memory database and client for testing."""
        test_config = {
            'TESTING': True,
            'SQLALCHEMY_DATABASE_URI': 'sqlite:///:memory:',
            'SECRET_KEY': 'test_key'
        }
        self.app = create_app(test_config=test_config)
        self.app_context = self.app.app_context()
        self.app_context.push()
        db.create_all()
        self.client = self.app.test_client()

        # Helper: Create a dummy Asset to link licenses to (requires Asset model definition)
        from app.models import Asset
        self.dummy_asset = Asset(name="Test PC", purchase_date=datetime.utcnow().date())
        db.session.add(self.dummy_asset)
        db.session.commit()
        self.asset_id = self.dummy_asset.id

    def tearDown(self):
        """Clean up database and application context."""
        db.session.remove()
        db.drop_all()
        self.app_context.pop()

    def _create_license(self, key="TESTKEY-123"):
        """Helper to create a license via the API."""
        payload = {
            "software_name": "Adobe Creative Cloud",
            "license_key": key,
            "expiry_date": (datetime.now() + timedelta(days=365)).strftime('%Y-%m-%d'),
            "asset_id": self.asset_id
        }
        response = self.client.post('/licenses', data=json.dumps(payload), content_type='application/json')
        self.assertEqual(response.status_code, 201)
        return json.loads(response.get_data(as_text=True))

    # --- CREATE Tests ---

    def test_1_create_license_success(self):
        """Tests successful creation with all data."""
        license_info = self._create_license("LKEY-A")
        self.assertIn("License successfully recorded.", license_info['message'])
        
        # Verify persistence
        license_db = SoftwareLicense.query.get(license_info['license_id'])
        self.assertEqual(license_db.software_name, "Adobe Creative Cloud")
        self.assertEqual(license_db.asset_id, self.asset_id)

    def test_2_create_license_missing_field(self):
        """Tests failure when a mandatory field (license_key) is missing."""
        payload = {
            "software_name": "Win OS",
            "expiry_date": "2025-12-31"
        }
        response = self.client.post('/licenses', data=json.dumps(payload), content_type='application/json')
        self.assertEqual(response.status_code, 400)
        self.assertIn("Missing mandatory fields", response.get_data(as_text=True))


    # --- READ Tests ---

    def test_3_read_license_success(self):
        """Tests reading a license by its ID."""
        license_info = self._create_license("LKEY-B")
        license_id = license_info['license_id']

        response = self.client.get(f'/licenses/{license_id}')
        data = json.loads(response.get_data(as_text=True))

        self.assertEqual(response.status_code, 200)
        self.assertEqual(data['license_key'], "LKEY-B")
        self.assertEqual(data['asset_id'], self.asset_id)

    def test_4_read_license_not_found(self):
        """Tests failure when reading a non-existent license ID."""
        response = self.client.get('/licenses/999')
        self.assertEqual(response.status_code, 404)


    # --- UPDATE Tests ---

    def test_5_update_license_success(self):
        """Tests updating key and unassigning asset."""
        license_info = self._create_license("OLD-KEY")
        license_id = license_info['license_id']
        
        update_payload = {
            "license_key": "NEW-KEY-2025",
            "asset_id": None # Unassign from asset
        }

        response = self.client.put(
            f'/licenses/{license_id}',
            data=json.dumps(update_payload),
            content_type='application/json'
        )
        self.assertEqual(response.status_code, 200)

        # Verify update
        license_db = SoftwareLicense.query.get(license_id)
        self.assertEqual(license_db.license_key, "NEW-KEY-2025")
        self.assertIsNone(license_db.asset_id)

    # --- DELETE Tests ---

    def test_6_delete_license_success(self):
        """Tests deleting an existing license."""
        license_info = self._create_license("DELETE-ME")
        license_id = license_info['license_id']

        response = self.client.delete(f'/licenses/{license_id}')
        self.assertEqual(response.status_code, 200)

        # Verify deletion
        license_db = SoftwareLicense.query.get(license_id)
        self.assertIsNone(license_db)

    def test_7_delete_license_not_found(self):
        """Tests failure when deleting a non-existent license."""
        response = self.client.delete('/licenses/999')
        self.assertEqual(response.status_code, 404)