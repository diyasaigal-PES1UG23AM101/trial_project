# app/models.py - COMPLETE AND FINAL CONTENT (FIXED)

from datetime import datetime
from . import db

# --- 1. ASSET MODEL (Stories 2.1, 2.2, 2.3, 2.4) ---
class Asset(db.Model):
    """Database model for an IT Infrastructure Asset."""
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    serial_number = db.Column(db.String(100), unique=True, nullable=True) 
    purchase_date = db.Column(db.Date, nullable=False)
    warranty_end_date = db.Column(db.Date)
    assigned_user = db.Column(db.String(100))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def __repr__(self):
        return f'<Asset {self.name} - SN: {self.serial_number}>'

# --- 2. SOFTWARE LICENSE MODEL (Story 4.1) ---
class SoftwareLicense(db.Model):
    """Database model for tracking software licenses and their expiry."""
    id = db.Column(db.Integer, primary_key=True)
    software_name = db.Column(db.String(100), nullable=False)
    license_key = db.Column(db.String(255), unique=True, nullable=False)
    expiry_date = db.Column(db.Date, nullable=False)
    purchase_date = db.Column(db.Date)
    
    asset_id = db.Column(db.Integer, db.ForeignKey('asset.id'), nullable=True) 
    asset = db.relationship('Asset', backref=db.backref('licenses', lazy=True))

    def __repr__(self):
        return f'<License {self.software_name} expires {self.expiry_date}>'

# --- 3. ASSET METRIC MODEL (Story 5.1) ---
class AssetMetric(db.Model):
    """Database model for time-series hardware metric data."""
    id = db.Column(db.Integer, primary_key=True)
    asset_id = db.Column(db.Integer, db.ForeignKey('asset.id'), nullable=False)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    
    cpu_percent = db.Column(db.Float, nullable=False)
    ram_percent = db.Column(db.Float, nullable=False)
    disk_percent = db.Column(db.Float, nullable=False)
    
    asset = db.relationship('Asset', backref=db.backref('metrics', lazy='dynamic'))

    def __repr__(self):
        return f'<Metric Asset:{self.asset_id} Time:{self.timestamp}>'

# --- 4. ALERT THRESHOLD MODEL (Story 5.2) ---
class AlertThreshold(db.Model):
    """Database model for defining performance alert thresholds."""
    id = db.Column(db.Integer, primary_key=True)
    metric_type = db.Column(db.String(10), nullable=False) # e.g., 'cpu', 'ram', 'disk'
    threshold_percent = db.Column(db.Float, nullable=False) # e.g., 90.0
    
    def __repr__(self):
        return f'<Threshold {self.metric_type} > {self.threshold_percent}%>'

# --- 5. ALERT HISTORY MODEL (Story 5.2) ---
class AlertHistory(db.Model):
    """Database model for tracking triggered alerts."""
    id = db.Column(db.Integer, primary_key=True)
    asset_id = db.Column(db.Integer, db.ForeignKey('asset.id'), nullable=False)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    metric_type = db.Column(db.String(10), nullable=False)
    triggered_value = db.Column(db.Float, nullable=False)
    status = db.Column(db.String(10), default='ACTIVE') # ACTIVE, RESOLVED
    
    asset = db.relationship('Asset', backref=db.backref('alerts', lazy=True))
    
    def __repr__(self):
        return f'<Alert {self.metric_type} on Asset:{self.asset_id}>'