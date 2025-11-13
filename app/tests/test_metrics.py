# tests/test_metrics.py - COMPLETE AND FINAL CONTENT (FIXED)

import unittest
import json
from datetime import datetime, timedelta
from app import create_app, db
from app.models import AssetMetric
from app.models import Asset # Import Asset for setup

class MetricTestCase(unittest.TestCase):
    """
    Tests CRUD operations for the AssetMetric model.
    """
    DUMMY_METRICS = {"cpu_percent": 50.5, "ram_percent": 75.0, "disk_percent": 30.2}

    def setUp(self):
        """Setup in-memory database and client for testing."""
        test_config = {'TESTING': True, 'SQLALCHEMY_DATABASE_URI': 'sqlite:///:memory:', 'SECRET_KEY': 'test_key'}
        self.app = create_app(test_config=test_config)
        self.app_context = self.app.app_context()
        self.app_context.push()
        db.create_all()
        self.client = self.app.test_client()

        # Create a dummy Asset to link metrics to
        self.dummy_asset = Asset(name="Test Server", purchase_date=datetime.utcnow().date())
        db.session.add(self.dummy_asset)
        db.session.commit()
        self.asset_id = self.dummy_asset.id

    def tearDown(self):
        """Clean up database and application context."""
        db.session.remove()
        db.drop_all()
        self.app_context.pop()

    # --- POST METRICS Tests ---

    def test_1_post_metrics_success(self):
        """Tests successful submission of metric data for an existing asset."""
        payload = {"asset_id": self.asset_id}
        payload.update(self.DUMMY_METRICS)

        response = self.client.post('/metrics', data=json.dumps(payload), content_type='application/json')
        self.assertEqual(response.status_code, 201)

        # Verify persistence
        with self.app.app_context():
            metric = AssetMetric.query.filter_by(asset_id=self.asset_id).first()
            self.assertIsNotNone(metric)
            self.assertEqual(metric.cpu_percent, 50.5)

    def test_2_post_metrics_invalid_asset_id(self):
        """Tests failure when submitting data for a non-existent asset."""
        payload = {"asset_id": 9999}
        payload.update(self.DUMMY_METRICS)

        response = self.client.post('/metrics', data=json.dumps(payload), content_type='application/json')
        self.assertEqual(response.status_code, 404)

    def test_3_post_metrics_invalid_range(self):
        """Tests failure when a metric value is outside the 0-100 range."""
        payload = {"asset_id": self.asset_id, "cpu_percent": 101.0, "ram_percent": 50.0, "disk_percent": 20.0}
        
        response = self.client.post('/metrics', data=json.dumps(payload), content_type='application/json')
        self.assertEqual(response.status_code, 400)


    # --- GET METRICS Tests ---

    def test_4_get_metrics_history_success(self):
        """Tests retrieval of metric history, verifying DESCENDING order (Final Fix)."""
        # Setup: Submit two metric entries with deterministic timestamps
        time1 = datetime.utcnow()
        time2 = time1 + timedelta(seconds=1) # Ensure time2 is definitively newer

        metrics_data = [
            # Oldest entry (10.1)
            AssetMetric(asset_id=self.asset_id, cpu_percent=10.1, ram_percent=50.0, disk_percent=50.0, timestamp=time1),
            # Newest entry (20.2)
            AssetMetric(asset_id=self.asset_id, cpu_percent=20.2, ram_percent=50.0, disk_percent=50.0, timestamp=time2) 
        ]
        
        db.session.add_all(metrics_data)
        db.session.commit()

        # Action: GET history
        response = self.client.get(f'/assets/{self.asset_id}/metrics')
        data = json.loads(response.get_data(as_text=True))
        
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(data['history']), 2)
        # Check ordering (descending by timestamp) - the newest (20.2) MUST be first
        self.assertEqual(data['history'][0]['cpu_percent'], 20.2)
        self.assertEqual(data['history'][1]['cpu_percent'], 10.1)


    def test_5_get_metrics_not_found(self):
        """Tests failure when retrieving metrics for an asset with no history."""
        response = self.client.get(f'/assets/{self.asset_id}/metrics')
        self.assertEqual(response.status_code, 404)