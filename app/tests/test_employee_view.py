# tests/test_employee_view.py - Complete Content

import unittest
import json
from datetime import datetime, timedelta
from app import create_app, db
from app.models import Asset
from sqlalchemy import func

class EmployeeViewTestCase(unittest.TestCase):
    """
    Tests the asset viewing endpoint restricted by assigned user.
    """

    def setUp(self):
        """Setup in-memory database and test context."""
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

        # Create base test user and another user
        today = datetime.utcnow().date()
        
        db.session.add_all([
            # Assets for 'Jane Doe' (mixed case)
            Asset(name="Desktop PC", serial_number="PC-001", purchase_date=today, assigned_user="Jane Doe"),
            Asset(name="Monitor", serial_number="MON-002", purchase_date=today, assigned_user="jane doe"),
            # Asset for 'John Smith'
            Asset(name="Server Access", serial_number="SRV-003", purchase_date=today, assigned_user="John Smith"),
            # Unassigned asset
            Asset(name="Spare Mouse", serial_number="ACC-004", purchase_date=today, assigned_user=None)
        ])
        db.session.commit()

    def tearDown(self):
        """Clean up database and application context."""
        db.session.remove()
        db.drop_all()
        self.app_context.pop()
        
    # --- Tests ---

    def test_1_view_assets_success_and_case_insensitive(self):
        """Tests that a user can view their assets regardless of case variation."""
        # Query using a different case (janE doE)
        response = self.client.get('/employee/assets/janE doE')
        data = json.loads(response.get_data(as_text=True))
        
        self.assertEqual(response.status_code, 200)
        self.assertEqual(data['user'], 'janE doE')
        self.assertEqual(len(data['assets']), 2)
        
        # Verify both assets belong to Jane Doe
        names = [a['name'] for a in data['assets']]
        self.assertIn("Desktop PC", names)
        self.assertIn("Monitor", names)


    def test_2_view_assets_not_found(self):
        """Tests failure when the user has no assets assigned."""
        response = self.client.get('/employee/assets/UserNotInDB')
        data = json.loads(response.get_data(as_text=True))

        self.assertEqual(response.status_code, 404)
        self.assertIn("No assets assigned", data['message'])

    def test_3_view_assets_unassigned_user(self):
        """Tests that querying for an unassigned user returns no results (no error)."""
        # Query for the unassigned asset's user (None)
        response = self.client.get('/employee/assets/John Smith')
        data = json.loads(response.get_data(as_text=True))
        
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(data['assets']), 1)
        self.assertEqual(data['assets'][0]['assigned_user'], 'John Smith')


    def test_4_serialization_accuracy(self):
        """Tests that the data returned for the employee view is correct."""
        response = self.client.get('/employee/assets/John Smith')
        data = json.loads(response.get_data(as_text=True))
        
        self.assertEqual(response.status_code, 200)
        asset = data['assets'][0]
        self.assertIn('status', asset)
        self.assertIn('In Use', asset['status'])
        self.assertNotIn('warranty_expiry', asset) # Warranty expiry should not be exposed here