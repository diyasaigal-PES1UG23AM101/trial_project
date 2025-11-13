import time
import unittest

from app import create_app, db


class PerformanceTestCase(unittest.TestCase):
    def setUp(self):
        config = {
            'TESTING': True,
            'SQLALCHEMY_DATABASE_URI': 'sqlite:///:memory:',
            'SECRET_KEY': 'perf_test'
        }
        self.app_instance = create_app(test_config=config)
        self.client = self.app_instance.test_client()

        with self.app_instance.app_context():
            db.create_all()

    def tearDown(self):
        with self.app_instance.app_context():
            db.session.remove()
            db.drop_all()

    def test_notifications_endpoint_within_five_seconds(self):
        start = time.perf_counter()
        response = self.client.get('/notifications')
        duration = time.perf_counter() - start

        self.assertEqual(response.status_code, 200)
        self.assertLess(duration, 5.0, msg=f"Notifications endpoint took {duration:.2f}s")

    def test_health_check_within_two_seconds(self):
        start = time.perf_counter()
        response = self.client.get('/api/health')
        duration = time.perf_counter() - start

        self.assertIn(response.status_code, (200, 500))
        self.assertLess(duration, 2.0, msg=f"Health check took {duration:.2f}s")


if __name__ == '__main__':
    unittest.main()
