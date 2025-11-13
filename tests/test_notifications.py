import os
import tempfile
import unittest
from datetime import datetime, timedelta

from app import create_app, db
from app.models import SoftwareLicense, AlertHistory
from app.notifications import generate_notifications


class NotificationTestCase(unittest.TestCase):
    def setUp(self):
        test_config = {
            'TESTING': True,
            'SQLALCHEMY_DATABASE_URI': 'sqlite:///:memory:',
            'SECRET_KEY': 'notifications_test'
        }
        self.app_instance = create_app(test_config=test_config)
        self.client = self.app_instance.test_client()
        self.temp_dir = tempfile.TemporaryDirectory()
        self.app_instance.config['BACKUP_DIR'] = self.temp_dir.name

        with self.app_instance.app_context():
            db.create_all()

    def tearDown(self):
        with self.app_instance.app_context():
            db.session.remove()
            db.drop_all()
        self.temp_dir.cleanup()

    def _create_license(self, name='Test Suite', days_until_expiry=5):
        expiry_date = datetime.utcnow().date() + timedelta(days=days_until_expiry)
        license_obj = SoftwareLicense(
            software_name=name,
            license_key=f'{name}-KEY',
            expiry_date=expiry_date
        )
        db.session.add(license_obj)
        db.session.commit()
        return license_obj

    def _create_hardware_alert(self, asset_id=1, metric='cpu', value=95.0):
        alert = AlertHistory(
            asset_id=asset_id,
            metric_type=metric,
            triggered_value=value,
            status='ACTIVE'
        )
        db.session.add(alert)
        db.session.commit()
        return alert

    def _write_backup_log(self, contents='backup completed with error'):
        log_path = os.path.join(self.temp_dir.name, 'latest.log')
        with open(log_path, 'w', encoding='utf-8') as handle:
            handle.write(contents)
        return log_path

    def test_generate_notifications_returns_all_categories(self):
        with self.app_instance.app_context():
            self._create_license()
            self._create_hardware_alert()
        self._write_backup_log()

        summary = generate_notifications(self.app_instance, backup_dir=self.temp_dir.name)

        self.assertGreaterEqual(summary['count'], 3)
        notification_types = {notice['type'] for notice in summary['notifications']}
        self.assertIn('license_expiry', notification_types)
        self.assertIn('hardware_alert', notification_types)
        self.assertIn('backup_alert', notification_types)

    def test_notifications_route_returns_json_payload(self):
        with self.app_instance.app_context():
            self._create_license(name='Another Suite', days_until_expiry=1)
        self._write_backup_log('error: backup failed')

        response = self.client.get('/notifications')
        self.assertEqual(response.status_code, 200)

        payload = response.get_json()
        self.assertIsInstance(payload, dict)
        self.assertGreaterEqual(payload['count'], 1)
        self.assertTrue(any(note['type'] == 'license_expiry' for note in payload['notifications']))

    def test_no_notifications_returns_empty_list(self):
        summary = generate_notifications(self.app_instance, backup_dir=self.temp_dir.name)
        self.assertEqual(summary['count'], 0)
        self.assertEqual(summary['notifications'], [])

    def test_export_notifications_csv(self):
        with self.app_instance.app_context():
            self._create_license(name='CSV Suite', days_until_expiry=2)
        self._write_backup_log('error: backup failed')

        response = self.client.get('/notifications/export?format=csv')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.headers['Content-Type'], 'text/csv')
        self.assertIn('notifications.csv', response.headers['Content-Disposition'])
        body = response.get_data(as_text=True)
        self.assertIn('license_expiry', body)

    def test_export_notifications_pdf(self):
        with self.app_instance.app_context():
            self._create_license(name='PDF Suite', days_until_expiry=3)
        self._write_backup_log('error: backup failed')

        response = self.client.get('/notifications/export?format=pdf')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.headers['Content-Type'], 'application/pdf')
        self.assertIn('notifications.pdf', response.headers['Content-Disposition'])
        body = response.get_data()
        self.assertTrue(body.startswith(b'%PDF'))

    def test_export_notifications_rejects_unknown_format(self):
        response = self.client.get('/notifications/export?format=xml')
        self.assertEqual(response.status_code, 400)


if __name__ == '__main__':
    unittest.main()
