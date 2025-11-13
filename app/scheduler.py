from datetime import datetime, timedelta
import logging
from sqlalchemy import select, func, and_
from apscheduler.schedulers.background import BackgroundScheduler
from flask import Flask # Only used for type hinting

# Set up logging for the scheduler job
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

# --- AUTHORIZED SOFTWARE LIST (ASL) ---
# In a real application, this would be loaded from a database or configuration file.
AUTHORIZED_SOFTWARE = {
    "MS OFFICE", 
    "AUTOCAD", 
    "PHOTOSHOP", 
    "VS CODE", 
    "SQL SERVER"
}
# -------------------------------------


def get_expiring_warranties(app: Flask, days=30):
    """
    Queries the database for assets whose warranty is expiring within the next 'days' (Story 2.3).
    """
    from . import db
    from .models import Asset
    
    expiry_threshold = datetime.utcnow().date() + timedelta(days=days)
    app.logger.info(f"Scheduler checking for asset warranties expiring before {expiry_threshold}")
    
    with app.app_context():
        assets = db.session.execute(
            select(Asset)
            .where(
                and_(
                    Asset.warranty_end_date != None,
                    Asset.warranty_end_date <= expiry_threshold
                )
            )
        ).scalars().all()
        
        return assets

def get_expiring_licenses(app: Flask, days=30):
    """
    Queries the database for licenses expiring within the next 'days' (Story 4.2).
    """
    from . import db
    from .models import SoftwareLicense
    
    expiry_threshold = datetime.utcnow().date() + timedelta(days=days)
    app.logger.info(f"Scheduler checking for software licenses expiring before {expiry_threshold}")
    
    with app.app_context():
        licenses = db.session.execute(
            select(SoftwareLicense)
            .where(
                and_(
                    SoftwareLicense.expiry_date != None,
                    SoftwareLicense.expiry_date <= expiry_threshold
                )
            )
        ).scalars().all()
        
        return licenses
        
def get_unauthorized_software(app: Flask):
    """
    Queries the database for installed software that is NOT in the AUTHORIZED_SOFTWARE list (Story 4.3).
    """
    from . import db
    from .models import SoftwareLicense
    
    app.logger.info("Scheduler checking for unauthorized software compliance.")

    with app.app_context():
        # Get all unique software names currently recorded
        all_installed_software = db.session.execute(
            select(SoftwareLicense.software_name)
            .distinct()
        ).scalars().all()
        
        # Convert to uppercase set for case-insensitive checking
        installed_names_upper = {name.upper() for name in all_installed_software}
        authorized_names_upper = set(AUTHORIZED_SOFTWARE)
        
        # Determine unauthorized software
        unauthorized_names_upper = installed_names_upper - authorized_names_upper
        
        if not unauthorized_names_upper:
            return [] # Return empty list if everything is compliant
            
        # Get the full license objects for all unauthorized software names
        unauthorized_licenses = db.session.execute(
            select(SoftwareLicense)
            .where(
                func.upper(SoftwareLicense.software_name).in_(unauthorized_names_upper)
            )
        ).scalars().all()
        
        return unauthorized_licenses


def warranty_reminder_job(app: Flask):
    """
    The scheduled job function that runs all checks and generates notifications.
    """
    # Check 1: Asset Warranties (Story 2.3)
    expiring_assets = get_expiring_warranties(app)
    # ... (notification logic omitted for brevity, assumes you have it)
    if expiring_assets:
         app.logger.warning(f"ASSET ALERT: {len(expiring_assets)} ASSETS HAVE EXPIRING WARRANTIES")

    # Check 2: Software Licenses (Story 4.2)
    expiring_licenses = get_expiring_licenses(app)
    # ... (notification logic omitted for brevity, assumes you have it)
    if expiring_licenses:
         app.logger.critical(f"LICENSE ALERT: {len(expiring_licenses)} SOFTWARE LICENSES ARE EXPIRING")
    
    # Check 3: Unauthorized Software (Story 4.3)
    unauthorized_licenses = get_unauthorized_software(app)
    if unauthorized_licenses:
        app.logger.error(f"--- COMPLIANCE BREACH: {len(unauthorized_licenses)} UNAUTHORIZED SOFTWARE INSTANCES ---")
        for license in unauthorized_licenses:
            compliance_message = (
                f"UNAUTHORIZED: Software '{license.software_name}' "
                f"found on Asset ID: {license.asset_id}."
            )
            app.logger.error(compliance_message)
    else:
        app.logger.info("Compliance check complete. No unauthorized software detected.")


def start_scheduler(app: Flask):
    """
    Initializes and starts the APScheduler process.
    """
    scheduler = BackgroundScheduler()
    
    # Add the job: Run the combined warranty_reminder_job daily
    scheduler.add_job(
        func=warranty_reminder_job, 
        trigger="interval", 
        days=1, 
        args=[app],
        id="combined_expiry_check_daily",
        name="Combined Expiry Check"
    )
    
    # Start the scheduler
    scheduler.start()
    app.logger.info("Background Scheduler initialized and started.")