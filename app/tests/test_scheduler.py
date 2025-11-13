import unittest
from datetime import datetime, timedelta
# --- FIXED IMPORTS ---
from app import create_app, db
from app.models import Asset, SoftwareLicense 
from app.scheduler import get_expiring_warranties, get_expiring_licenses
# ---------------------

class SchedulerTestCase(unittest.TestCase):
    """
    Tests the business logic within the scheduler module.
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

    def tearDown(self):
        """Clean up database and application context."""
        db.session.remove()
        db.drop_all()
        self.app_context.pop()

    def _create_asset(self, name, warranty_days_from_now):
        """Helper to create and COMMIT an asset with a specific warranty date."""
        warranty_date = datetime.utcnow().date() + timedelta(days=warranty_days_from_now)
        
        asset = Asset(
            name=name,
            serial_number=f"SN-{name}",
            purchase_date=datetime.utcnow().date() - timedelta(days=100),
            warranty_end_date=warranty_date
        )
        db.session.add(asset)
        db.session.commit()
        
        return db.session.get(Asset, asset.id)

    def _create_license(self, name, expiry_days_from_now):
        """Helper to create and commit a license with a specific expiry date."""
        expiry_date = datetime.utcnow().date() + timedelta(days=expiry_days_from_now)
        
        license = SoftwareLicense(
            software_name=name,
            license_key=f"KEY-{name}",
            expiry_date=expiry_date
        )
        db.session.add(license)
        db.session.commit()
        return db.session.get(SoftwareLicense, license.id)


    # --- Tests for Story 2.3 (Asset Warranty) ---
    def test_1_expiring_assets_are_collected(self):
        """Tests that assets expiring within the 30-day window are found."""
        self._create_asset("Laptop_A", 30)
        self._create_asset("Monitor_B", 15)
        
        expiring = get_expiring_warranties(self.app, days=30)
        asset_names = [a.name for a in expiring]

        self.assertEqual(len(expiring), 2)
        self.assertIn("Laptop_A", asset_names)
        self.assertIn("Monitor_B", asset_names)


    def test_2_non_expiring_assets_are_ignored(self):
        """Tests that assets expiring outside the window are ignored."""
        self._create_asset("Server_C", 31) 
        self._create_asset("Router_D", 30)
        
        expiring = get_expiring_warranties(self.app, days=30)

        self.assertEqual(len(expiring), 1)
        self.assertEqual(expiring[0].name, "Router_D")


    def test_3_null_warranty_is_ignored(self):
        """Tests that assets with NULL warranty dates are ignored."""
        asset = Asset(name="Null_Warranty", serial_number="SN-Null", purchase_date=datetime.utcnow().date())
        db.session.add(asset)
        db.session.commit()

        expiring = get_expiring_warranties(self.app, days=30)
        self.assertEqual(len(expiring), 0)


    # --- Tests for Story 4.2 (License Expiry) ---
    def test_4_expiring_licenses_are_collected(self):
        """Tests that licenses expiring within the 30-day window are found (Story 4.2)."""
        self._create_license("MS_Office", 30)
        self._create_license("SQL_Server", 31) 
        
        expiring = get_expiring_licenses(self.app, days=30)
        
        self.assertEqual(len(expiring), 1)
        self.assertEqual(expiring[0].software_name, "MS_Office")
        
    # --- Tests for Story 4.3 (Unauthorized Software) ---
    def test_5_unauthorized_software_is_flagged(self):
        """Tests that non-compliant software is flagged correctly (Story 4.3)."""
        # Authorized Software (Should be ignored)
        self._create_license("MS Office", 100)
        self._create_license("VS Code", 50)

        # Unauthorized Software (Should be flagged)
        self._create_license("Torrent Downloader", 50)
        self._create_license("Random Game", 10)
        
        from app.scheduler import get_unauthorized_software
        
        # Action: Run the compliance check
        unauthorized = get_unauthorized_software(self.app)
        
        # Assertion: Check that exactly two unauthorized items were found
        self.assertEqual(len(unauthorized), 2)
        
        names = {lic.software_name for lic in unauthorized}
        self.assertIn("Torrent Downloader", names)
        self.assertIn("Random Game", names)