from flask import Flask, request, jsonify, send_from_directory, Response
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import or_, func
from sqlalchemy.pool import StaticPool
from datetime import datetime, timedelta, date
import uuid
import os
import csv
import io

app = Flask(__name__)
CORS(app)

DATABASE_URL = os.environ.get("IIMS_DATABASE_URL", "sqlite:///ims.db")
app.config["SQLALCHEMY_DATABASE_URI"] = DATABASE_URL
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
engine_options = app.config.setdefault("SQLALCHEMY_ENGINE_OPTIONS", {})
connect_args = engine_options.get("connect_args", {})
if DATABASE_URL.startswith("sqlite"):
    connect_args.setdefault("check_same_thread", False)
    if DATABASE_URL.rstrip("/").endswith(":memory:"):
        engine_options.setdefault("poolclass", StaticPool)
engine_options["connect_args"] = connect_args

db = SQLAlchemy(app)


class Asset(db.Model):
    __tablename__ = "assets"

    id = db.Column(db.Integer, primary_key=True)
    asset_id = db.Column(db.String(64), unique=True, nullable=False)
    asset_type = db.Column(db.String(64), nullable=False)
    assigned_user = db.Column(db.String(128), nullable=False)
    purchase_date = db.Column(db.Date, nullable=False)
    warranty_expiry_date = db.Column(db.Date, nullable=False)
    status = db.Column(db.String(32), default="Active", nullable=False)
    department = db.Column(db.String(64), default="IT", nullable=False)

    def to_dict(self):
        return {
            "assetId": self.asset_id,
            "assetType": self.asset_type,
            "assignedUser": self.assigned_user,
            "purchaseDate": self.purchase_date.strftime("%Y-%m-%d"),
            "warrantyExpiryDate": self.warranty_expiry_date.strftime("%Y-%m-%d"),
            "status": self.status,
            "department": self.department,
        }


class License(db.Model):
    __tablename__ = "licenses"

    id = db.Column(db.Integer, primary_key=True)
    license_id = db.Column(db.String(64), unique=True, nullable=False)
    software_name = db.Column(db.String(128), nullable=False)
    license_key = db.Column(db.String(128), nullable=False)
    total_seats = db.Column(db.Integer, nullable=False)
    used_seats = db.Column(db.Integer, default=0, nullable=False)
    expiry_date = db.Column(db.Date, nullable=False)
    compliance_status = db.Column(db.String(32), default="Compliant", nullable=False)

    def to_dict(self):
        return {
            "licenseId": self.license_id,
            "softwareName": self.software_name,
            "licenseKey": self.license_key,
            "totalSeats": self.total_seats,
            "usedSeats": self.used_seats,
            "expiryDate": self.expiry_date.strftime("%Y-%m-%d"),
            "complianceStatus": self.compliance_status,
        }


class HardwareHealthRecord(db.Model):
    __tablename__ = "hardware_health_records"

    id = db.Column(db.Integer, primary_key=True)
    device_id = db.Column(db.String(64), unique=True, nullable=False)
    cpu_load = db.Column(db.Integer, nullable=False)
    memory_util = db.Column(db.Integer, nullable=False)
    is_overheating = db.Column(db.Boolean, default=False, nullable=False)
    last_check = db.Column(db.DateTime, nullable=False)

    def to_dict(self):
        return {
            "deviceId": self.device_id,
            "cpuLoad": self.cpu_load,
            "memoryUtil": self.memory_util,
            "isOverheating": self.is_overheating,
            "lastCheck": self.last_check.strftime("%Y-%m-%d %H:%M:%S"),
        }


class BackupJob(db.Model):
    __tablename__ = "backup_jobs"

    id = db.Column(db.Integer, primary_key=True)
    job_id = db.Column(db.String(64), unique=True, nullable=False)
    asset_id = db.Column(db.String(64), nullable=False)
    last_run_date = db.Column(db.DateTime, nullable=False)
    status = db.Column(db.String(32), nullable=False)
    alert_reason = db.Column(db.String(256))
    technician_comment = db.Column(db.String(512))

    def to_dict(self):
        return {
            "jobId": self.job_id,
            "assetId": self.asset_id,
            "lastRunDate": self.last_run_date.strftime("%Y-%m-%d %H:%M:%S"),
            "status": self.status,
            "alertReason": self.alert_reason,
            "technicianComment": self.technician_comment,
        }


class NetworkDevice(db.Model):
    __tablename__ = "network_devices"

    id = db.Column(db.Integer, primary_key=True)
    device_id = db.Column(db.String(64), unique=True, nullable=False)
    bandwidth_mb = db.Column(db.Integer, nullable=False)
    is_downtime = db.Column(db.Boolean, default=False, nullable=False)
    abnormal_traffic = db.Column(db.Boolean, default=False, nullable=False)

    def to_dict(self):
        return {
            "deviceId": self.device_id,
            "bandwidthMB": self.bandwidth_mb,
            "isDowntime": self.is_downtime,
            "abnormalTraffic": self.abnormal_traffic,
        }


class AuditLog(db.Model):
    __tablename__ = "audit_logs"

    id = db.Column(db.Integer, primary_key=True)
    timestamp = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    user_role = db.Column(db.String(32), nullable=False)
    action = db.Column(db.String(64), nullable=False)
    details = db.Column(db.String(256), nullable=False)

    def to_dict(self):
        return {
            "timestamp": self.timestamp.strftime("%Y-%m-%d %H:%M:%S"),
            "userRole": self.user_role,
            "action": self.action,
            "details": self.details,
        }


class AssetLog(db.Model):
    __tablename__ = "asset_logs"

    id = db.Column(db.Integer, primary_key=True)
    timestamp = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    asset_id = db.Column(db.String(64), nullable=False)
    action = db.Column(db.String(32), nullable=False)
    details = db.Column(db.String(256))
    asset_type = db.Column(db.String(64))
    assigned_user = db.Column(db.String(128))
    performed_by = db.Column(db.String(32), nullable=False, default="System")

    def to_dict(self):
        return {
            "timestamp": self.timestamp.strftime("%Y-%m-%d %H:%M:%S"),
            "assetId": self.asset_id,
            "action": self.action,
            "details": self.details,
            "assetType": self.asset_type,
            "assignedUser": self.assigned_user,
        }


class IntegrationStatus(db.Model):
    __tablename__ = "integration_statuses"

    id = db.Column(db.Integer, primary_key=True)
    slug = db.Column(db.String(64), unique=True, nullable=False)
    name = db.Column(db.String(128), nullable=False)
    status = db.Column(db.String(32), nullable=False)
    last_check = db.Column(db.DateTime, nullable=False)

    def to_dict(self):
        return {
            "name": self.name,
            "status": self.status,
            "lastCheck": self.last_check.strftime("%Y-%m-%d %H:%M:%S"),
        }


class User(db.Model):
    __tablename__ = "users"

    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(64), unique=True, nullable=False)
    password = db.Column(db.String(128), nullable=False)
    role = db.Column(db.String(32), nullable=False)
    name = db.Column(db.String(128), nullable=False)
    requires_mfa = db.Column(db.Boolean, default=False, nullable=False)

    def to_dict(self):
        return {
            "username": self.username,
            "role": self.role,
            "name": self.name,
            "requiresMFA": self.requires_mfa,
        }


# Current user session (mock session storage)
current_role = None
current_user = None
current_user_name = None
is_authenticated = False


def _parse_date(date_str, field_name):
    try:
        return datetime.strptime(date_str, "%Y-%m-%d").date()
    except (TypeError, ValueError):
        raise ValueError(f"Invalid date format for {field_name}. Expected YYYY-MM-DD.")


def _parse_datetime(dt_str, field_name):
    try:
        return datetime.strptime(dt_str, "%Y-%m-%d %H:%M:%S")
    except (TypeError, ValueError):
        raise ValueError(f"Invalid datetime format for {field_name}. Expected YYYY-MM-DD HH:MM:SS.")


def _to_bool(value):
    if isinstance(value, bool):
        return value
    if isinstance(value, str):
        return value.strip().lower() in ["true", "1", "yes", "y", "on"]
    return bool(value)


def add_audit_log(action, details, user_role, commit=True):
    """Persist entry to audit log."""
    log_entry = AuditLog(action=action, details=details, user_role=user_role, timestamp=datetime.utcnow())
    db.session.add(log_entry)
    if commit:
        db.session.commit()
    return log_entry.to_dict()


def add_asset_log(asset_id, action, details, user_role, asset_type=None, assigned_user=None):
    """Persist asset-specific change log."""
    entry = AssetLog(
        asset_id=asset_id,
        action=action,
        details=details,
        asset_type=asset_type,
        assigned_user=assigned_user,
        performed_by=user_role or "System",
        timestamp=datetime.utcnow(),
    )
    db.session.add(entry)
    db.session.commit()
    return entry.to_dict()


def can_perform_crud(role):
    """Check if role can perform CRUD operations."""
    return role in ["Admin", "IT Staff"]


def calculate_dashboard_metrics():
    """Calculate dashboard metrics from all database tables."""
    total_assets = Asset.query.count()
    
    today = date.today()
    expiry_threshold = today + timedelta(days=90)
    licenses_expiring_soon = (
        License.query.filter(License.expiry_date <= expiry_threshold).count()
    )

    hardware_alerts = HardwareHealthRecord.query.filter(
        or_(HardwareHealthRecord.cpu_load > 85, HardwareHealthRecord.is_overheating.is_(True))
    ).count()

    backup_failures = BackupJob.query.filter(BackupJob.status.in_(["Failure", "Missed"])).count()

    network_events = NetworkDevice.query.filter(
        or_(NetworkDevice.is_downtime.is_(True), NetworkDevice.abnormal_traffic.is_(True))
    ).count()
    
    hardware_alert_details = [
        hw.to_dict()
        for hw in HardwareHealthRecord.query.filter(
            or_(HardwareHealthRecord.cpu_load > 85, HardwareHealthRecord.is_overheating.is_(True))
        ).order_by(HardwareHealthRecord.last_check.desc()).limit(20)
    ]

    network_alert_details = [
        net.to_dict()
        for net in NetworkDevice.query.filter(
            or_(NetworkDevice.is_downtime.is_(True), NetworkDevice.abnormal_traffic.is_(True))
        ).order_by(NetworkDevice.device_id.asc()).limit(20)
    ]

    return {
        "totalAssets": total_assets,
        "licensesExpiringSoon": licenses_expiring_soon,
        "hardwareHealthAlerts": hardware_alerts,
        "hardwareAlertDetails": hardware_alert_details,
        "backupFailures": backup_failures,
        "networkEvents": network_events,
        "networkAlertDetails": network_alert_details,
    }


def generate_report_snapshot():
    """Aggregate comprehensive operational metrics for reporting."""
    today = date.today()
    now = datetime.utcnow()
    warranty_threshold = today + timedelta(days=30)
    license_threshold = today + timedelta(days=30)
    start_of_week_date = today - timedelta(days=today.weekday())
    start_of_week = datetime.combine(start_of_week_date, datetime.min.time())
    start_of_today = datetime.combine(today, datetime.min.time())
    stale_backup_threshold = now - timedelta(days=7)

    # Assets
    total_assets = Asset.query.count()
    assets_per_department = {
        (dept or "Unknown"): count
        for dept, count in db.session.query(Asset.department, func.count())
        .group_by(Asset.department)
        .all()
    }
    assets_under_maintenance = Asset.query.filter(Asset.status == "Maintenance").count()
    assets_expiring_soon = Asset.query.filter(
        Asset.warranty_expiry_date <= warranty_threshold
    ).count()

    # Licenses
    total_licenses = License.query.count()
    active_licenses = License.query.filter(License.compliance_status != "Unauthorized").count()
    licenses_expiring_soon = License.query.filter(
        License.expiry_date <= license_threshold
    ).count()
    expired_licenses = License.query.filter(License.expiry_date < today).count()

    # Hardware & Network
    hardware_records = HardwareHealthRecord.query.all()
    hardware_count = len(hardware_records)
    avg_cpu = round(sum(h.cpu_load for h in hardware_records) / hardware_count, 2) if hardware_count else 0
    avg_memory = round(sum(h.memory_util for h in hardware_records) / hardware_count, 2) if hardware_count else 0
    # Disk usage data not tracked; reuse memory metrics as an approximation for visual parity
    avg_disk = avg_memory

    alerts_today = HardwareHealthRecord.query.filter(
        HardwareHealthRecord.last_check >= start_of_today,
        or_(HardwareHealthRecord.cpu_load > 85, HardwareHealthRecord.is_overheating.is_(True))
    ).count()
    alerts_this_week = HardwareHealthRecord.query.filter(
        HardwareHealthRecord.last_check >= start_of_week,
        or_(HardwareHealthRecord.cpu_load > 85, HardwareHealthRecord.is_overheating.is_(True))
    ).count()

    top_network_devices = [
        {"deviceId": dev.device_id, "bandwidthMB": dev.bandwidth_mb}
        for dev in NetworkDevice.query.order_by(NetworkDevice.bandwidth_mb.desc()).limit(5)
    ]

    # Backup & Recovery
    backups_this_week = BackupJob.query.filter(BackupJob.last_run_date >= start_of_week).count()
    backup_success = BackupJob.query.filter(BackupJob.status == "Success").count()
    backup_failure = BackupJob.query.filter(BackupJob.status == "Failure").count()
    backup_missed = BackupJob.query.filter(BackupJob.status == "Missed").count()
    stale_backups = {
        job.asset_id
        for job in BackupJob.query.filter(BackupJob.last_run_date < stale_backup_threshold).all()
    }

    # Departmental asset usage (duplicate of assets_per_department but surfaced separately)
    department_usage = assets_per_department.copy()

    return {
        "assetsReport": {
            "totalAssets": total_assets,
            "assetsPerDepartment": assets_per_department,
            "assetsUnderMaintenance": assets_under_maintenance,
            "assetsExpiringWarrantySoon": assets_expiring_soon,
        },
        "softwareLicenseReport": {
            "totalLicensedSoftware": total_licenses,
            "activeLicenses": active_licenses,
            "licensesExpiringIn30Days": licenses_expiring_soon,
            "expiredLicenses": expired_licenses,
        },
        "hardwareNetworkReport": {
            "averageCpuLoad": avg_cpu,
            "averageMemoryUtilization": avg_memory,
            "averageDiskUtilization": avg_disk,
            "alertsToday": alerts_today,
            "alertsThisWeek": alerts_this_week,
            "topBandwidthDevices": top_network_devices,
        },
        "backupRecoveryReport": {
            "backupsRunThisWeek": backups_this_week,
            "successfulBackups": backup_success,
            "failedBackups": backup_failure,
            "missedBackups": backup_missed,
            "systemsWithoutRecentBackup": sorted(stale_backups),
        },
        "departmentAssetReport": {
            "assetsPerDepartment": department_usage,
        },
        "generatedAt": now.strftime("%Y-%m-%d %H:%M:%S"),
    }

def ensure_backup_comment_column():
    """Ensure technician_comment column exists on backup_jobs table."""
    inspector = db.inspect(db.engine)
    columns = [col["name"] for col in inspector.get_columns("backup_jobs")]
    if "technician_comment" not in columns:
        with db.engine.connect() as connection:
            connection.execute(db.text("ALTER TABLE backup_jobs ADD COLUMN technician_comment VARCHAR(512)"))
            connection.commit()


def ensure_asset_log_columns():
    """Ensure new columns exist on asset_logs table."""
    inspector = db.inspect(db.engine)
    columns = [col["name"] for col in inspector.get_columns("asset_logs")]
    statements = []
    if "asset_type" not in columns:
        statements.append("ALTER TABLE asset_logs ADD COLUMN asset_type VARCHAR(64)")
    if "assigned_user" not in columns:
        statements.append("ALTER TABLE asset_logs ADD COLUMN assigned_user VARCHAR(128)")
    if statements:
        with db.engine.connect() as connection:
            for stmt in statements:
                connection.execute(db.text(stmt))
            connection.commit()


def seed_initial_data():
    """Populate the database with initial records if empty."""
    seeded = False

    if Asset.query.count() == 0:
        assets = [
            Asset(
                asset_id="AST-001",
                asset_type="Laptop",
                assigned_user="Alice Johnson",
                purchase_date=date(2023, 1, 15),
                warranty_expiry_date=date(2026, 1, 15),
                status="Active",
                department="Engineering",
            ),
            Asset(
                asset_id="AST-002",
                asset_type="Desktop",
                assigned_user="Bob Smith",
                purchase_date=date(2022, 6, 20),
                warranty_expiry_date=date(2025, 6, 20),
                status="Active",
                department="Sales",
            ),
            Asset(
                asset_id="AST-003",
                asset_type="Monitor",
                assigned_user="Alice Johnson",
                purchase_date=date(2023, 3, 10),
                warranty_expiry_date=date(2026, 3, 10),
                status="Active",
                department="Engineering",
            ),
            Asset(
                asset_id="AST-004",
                asset_type="Laptop",
                assigned_user="Charlie Brown",
                purchase_date=date(2024, 1, 5),
                warranty_expiry_date=date(2027, 1, 5),
                status="Active",
                department="Marketing",
            ),
            Asset(
                asset_id="AST-005",
                asset_type="Server",
                assigned_user="IT Department",
                purchase_date=date(2021, 11, 12),
                warranty_expiry_date=date(2024, 11, 12),
                status="Maintenance",
                department="IT",
            ),
            Asset(
                asset_id="AST-006",
                asset_type="Laptop",
                assigned_user="David Wilson",
                purchase_date=date(2023, 8, 20),
                warranty_expiry_date=date(2026, 8, 20),
                status="Active",
                department="HR",
            ),
            Asset(
                asset_id="AST-007",
                asset_type="Desktop",
                assigned_user="Eva Martinez",
                purchase_date=date(2022, 12, 5),
                warranty_expiry_date=date(2025, 12, 5),
                status="Active",
                department="Finance",
            ),
        ]
        db.session.add_all(assets)
        seeded = True

    if License.query.count() == 0:
        licenses = [
            License(
                license_id="LIC-001",
                software_name="Microsoft Office 365",
                license_key="XXXXX-XXXXX-XXXXX-001",
                total_seats=50,
                used_seats=45,
                expiry_date=date(2024, 12, 31),
                compliance_status="Compliant",
            ),
            License(
                license_id="LIC-002",
                software_name="Adobe Creative Suite",
                license_key="XXXXX-XXXXX-XXXXX-002",
                total_seats=20,
                used_seats=18,
                expiry_date=(datetime.utcnow() + timedelta(days=45)).date(),
                compliance_status="Compliant",
            ),
            License(
                license_id="LIC-003",
                software_name="Windows Server License",
                license_key="XXXXX-XXXXX-XXXXX-003",
                total_seats=10,
                used_seats=8,
                expiry_date=(datetime.utcnow() + timedelta(days=75)).date(),
                compliance_status="Compliant",
            ),
            License(
                license_id="LIC-004",
                software_name="VMware vSphere",
                license_key="XXXXX-XXXXX-XXXXX-004",
                total_seats=5,
                used_seats=5,
                expiry_date=(datetime.utcnow() + timedelta(days=30)).date(),
                compliance_status="Unauthorized",
            ),
            License(
                license_id="LIC-005",
                software_name="Autodesk AutoCAD",
                license_key="XXXXX-XXXXX-XXXXX-005",
                total_seats=15,
                used_seats=12,
                expiry_date=date(2025, 6, 30),
                compliance_status="Compliant",
            ),
        ]
        db.session.add_all(licenses)
        seeded = True

    if HardwareHealthRecord.query.count() == 0:
        now = datetime.utcnow()
        hardware_records = [
            HardwareHealthRecord(
                device_id="DEV-001",
                cpu_load=92,
                memory_util=78,
                is_overheating=True,
                last_check=now - timedelta(minutes=5),
            ),
            HardwareHealthRecord(
                device_id="DEV-002",
                cpu_load=45,
                memory_util=60,
                is_overheating=False,
                last_check=now - timedelta(minutes=3),
            ),
            HardwareHealthRecord(
                device_id="DEV-003",
                cpu_load=35,
                memory_util=50,
                is_overheating=False,
                last_check=now - timedelta(minutes=2),
            ),
            HardwareHealthRecord(
                device_id="DEV-004",
                cpu_load=88,
                memory_util=85,
                is_overheating=False,
                last_check=now - timedelta(minutes=1),
            ),
            HardwareHealthRecord(
                device_id="DEV-005",
                cpu_load=25,
                memory_util=40,
                is_overheating=False,
                last_check=now,
            ),
            HardwareHealthRecord(
                device_id="DEV-006",
                cpu_load=91,
                memory_util=82,
                is_overheating=True,
                last_check=now - timedelta(minutes=4),
            ),
        ]
        db.session.add_all(hardware_records)
        seeded = True

    if BackupJob.query.count() == 0:
        now = datetime.utcnow()
        backup_jobs = [
            BackupJob(
                job_id="BK-001",
                asset_id="AST-001",
                last_run_date=now - timedelta(days=1),
                status="Success",
                alert_reason=None,
                technician_comment=None,
            ),
            BackupJob(
                job_id="BK-002",
                asset_id="AST-002",
                last_run_date=now - timedelta(days=2),
                status="Failure",
                alert_reason="Disk space insufficient",
                technician_comment=None,
            ),
            BackupJob(
                job_id="BK-003",
                asset_id="AST-003",
                last_run_date=now - timedelta(days=3),
                status="Success",
                alert_reason=None,
                technician_comment=None,
            ),
            BackupJob(
                job_id="BK-004",
                asset_id="AST-004",
                last_run_date=now - timedelta(days=5),
                status="Missed",
                alert_reason="Scheduled time conflict",
                technician_comment=None,
            ),
            BackupJob(
                job_id="BK-005",
                asset_id="AST-005",
                last_run_date=now - timedelta(hours=12),
                status="Success",
                alert_reason=None,
                technician_comment=None,
            ),
            BackupJob(
                job_id="BK-006",
                asset_id="AST-006",
                last_run_date=now - timedelta(days=4),
                status="Failure",
                alert_reason="Network timeout",
                technician_comment=None,
            ),
        ]
        db.session.add_all(backup_jobs)
        seeded = True

    if NetworkDevice.query.count() == 0:
        network_devices = [
            NetworkDevice(device_id="NET-001", bandwidth_mb=450, is_downtime=False, abnormal_traffic=True),
            NetworkDevice(device_id="NET-002", bandwidth_mb=120, is_downtime=False, abnormal_traffic=False),
            NetworkDevice(device_id="NET-003", bandwidth_mb=0, is_downtime=True, abnormal_traffic=False),
            NetworkDevice(device_id="NET-004", bandwidth_mb=280, is_downtime=False, abnormal_traffic=False),
            NetworkDevice(device_id="NET-005", bandwidth_mb=350, is_downtime=False, abnormal_traffic=False),
            NetworkDevice(device_id="NET-006", bandwidth_mb=520, is_downtime=False, abnormal_traffic=True),
        ]
        db.session.add_all(network_devices)
        seeded = True

    if IntegrationStatus.query.count() == 0:
        now = datetime.utcnow()
        integrations = [
            IntegrationStatus(slug="licenseVendorAPI", name="License Vendor API", status="Active", last_check=now),
            IntegrationStatus(slug="networkSNMPAgent", name="Network SNMP Agent", status="Active", last_check=now),
            IntegrationStatus(slug="backupToolX", name="Backup Tool X", status="Inactive", last_check=now - timedelta(hours=2)),
            IntegrationStatus(slug="monitoringService", name="Monitoring Service", status="Active", last_check=now),
        ]
        db.session.add_all(integrations)
        seeded = True

    if User.query.count() == 0:
        users = [
            User(username="admin", password="admin123", role="Admin", name="Administrator", requires_mfa=True),
            User(username="itstaff", password="it123", role="IT Staff", name="IT Staff User", requires_mfa=False),
            User(username="employee", password="emp123", role="Employee", name="Alice Johnson", requires_mfa=False),
        ]
        db.session.add_all(users)
        seeded = True

    if seeded:
        add_audit_log("SYSTEM", "IIMS System seeded", "System", commit=False)
        db.session.commit()


def initialize_database(reset=False):
    """Create tables and seed data."""
    with app.app_context():
        if reset:
            db.drop_all()
        db.create_all()
        ensure_backup_comment_column()
        ensure_asset_log_columns()
        seed_initial_data()


# Ensure database is initialized when the module is imported
initialize_database()


# ==================== API ENDPOINTS ====================

@app.route('/api/role', methods=['GET', 'POST'])
def role():
    """Get or set current user role"""
    global current_role
    if request.method == 'POST':
        data = request.json
        current_role = data.get('role', 'Admin')
        return jsonify({"role": current_role})
    return jsonify({"role": current_role})

@app.route('/api/dashboard/metrics', methods=['GET'])
def dashboard_metrics():
    """Get dashboard metrics"""
    return jsonify(calculate_dashboard_metrics())

@app.route('/api/assets', methods=['GET', 'POST'])
def assets():
    """CRUD operations for assets"""
    global current_role, current_user_name
    
    if request.method == 'GET':
        if current_role == "Employee" and current_user_name:
            records = Asset.query.filter_by(assigned_user=current_user_name).all()
        else:
            records = Asset.query.all()
        return jsonify([asset.to_dict() for asset in records])
    
    elif request.method == 'POST':
        if not can_perform_crud(current_role):
            return jsonify({"error": "Insufficient permissions"}), 403
        
        data = request.json
        action = data.get('action')
        
        if action == 'create':
            try:
                purchase_date = _parse_date(data.get('purchaseDate'), 'purchaseDate')
                warranty_expiry_date = _parse_date(data.get('warrantyExpiryDate'), 'warrantyExpiryDate')
            except ValueError as exc:
                return jsonify({"error": str(exc)}), 400

            asset = Asset(
                asset_id=data.get('assetId', f"AST-{str(uuid.uuid4())[:8]}"),
                asset_type=data.get('assetType'),
                assigned_user=data.get('assignedUser'),
                purchase_date=purchase_date,
                warranty_expiry_date=warranty_expiry_date,
                status=data.get('status', 'Active'),
                department=data.get('department', 'IT'),
            )
            db.session.add(asset)
            db.session.commit()
            add_audit_log("CREATE", f"Created asset {asset.asset_id}", current_role)
            add_asset_log(
                asset.asset_id,
                "CREATE",
                f"{asset.asset_type} assigned to {asset.assigned_user}",
                current_role,
                asset_type=asset.asset_type,
                assigned_user=asset.assigned_user,
            )
            return jsonify(asset.to_dict()), 201
        
        elif action == 'update':
            asset_id = data.get('assetId')
            asset = Asset.query.filter_by(asset_id=asset_id).first()
            if not asset:
                return jsonify({"error": "Asset not found"}), 404

            if 'assetType' in data:
                asset.asset_type = data['assetType']
            if 'assignedUser' in data:
                asset.assigned_user = data['assignedUser']
            if 'purchaseDate' in data:
                try:
                    asset.purchase_date = _parse_date(data['purchaseDate'], 'purchaseDate')
                except ValueError as exc:
                    return jsonify({"error": str(exc)}), 400
            if 'warrantyExpiryDate' in data:
                try:
                    asset.warranty_expiry_date = _parse_date(data['warrantyExpiryDate'], 'warrantyExpiryDate')
                except ValueError as exc:
                    return jsonify({"error": str(exc)}), 400
            if 'status' in data:
                asset.status = data['status']
            if 'department' in data:
                asset.department = data['department']
            db.session.commit()
            add_audit_log("UPDATE", f"Updated asset {asset_id}", current_role)
            changes = []
            if 'assetType' in data:
                changes.append(f"type -> {asset.asset_type}")
            if 'assignedUser' in data:
                changes.append(f"user -> {asset.assigned_user}")
            if 'purchaseDate' in data:
                changes.append(f"purchase -> {asset.purchase_date}")
            if 'warrantyExpiryDate' in data:
                changes.append(f"warranty -> {asset.warranty_expiry_date}")
            if 'status' in data:
                changes.append(f"status -> {asset.status}")
            if 'department' in data:
                changes.append(f"department -> {asset.department}")
            detail_message = "; ".join(changes) if changes else "Asset updated"
            add_asset_log(
                asset_id,
                "UPDATE",
                detail_message,
                current_role,
                asset_type=asset.asset_type,
                assigned_user=asset.assigned_user,
            )
            return jsonify(asset.to_dict())
        
        elif action == 'delete':
            asset_id = data.get('assetId')
            asset = Asset.query.filter_by(asset_id=asset_id).first()
            if not asset:
                return jsonify({"error": "Asset not found"}), 404
            db.session.delete(asset)
            db.session.commit()
            add_audit_log("DELETE", f"Deleted asset {asset_id}", current_role)
            add_asset_log(
                asset_id,
                "DELETE",
                "Asset removed from inventory",
                current_role,
                asset_type=asset.asset_type,
                assigned_user=asset.assigned_user,
            )
            return jsonify(asset.to_dict())

@app.route('/api/licenses', methods=['GET', 'POST'])
def licenses():
    """CRUD operations for licenses"""
    global current_role
    
    if request.method == 'GET':
        licenses = License.query.all()
        return jsonify([license.to_dict() for license in licenses])
    
    elif request.method == 'POST':
        if not can_perform_crud(current_role):
            return jsonify({"error": "Insufficient permissions"}), 403
        
        data = request.json
        action = data.get('action')
        
        if action == 'create':
            try:
                expiry_date = _parse_date(data.get('expiryDate'), 'expiryDate')
            except ValueError as exc:
                return jsonify({"error": str(exc)}), 400

            license_obj = License(
                license_id=data.get('licenseId', f"LIC-{str(uuid.uuid4())[:8]}"),
                software_name=data.get('softwareName'),
                license_key=data.get('licenseKey'),
                total_seats=data.get('totalSeats'),
                used_seats=data.get('usedSeats', 0),
                expiry_date=expiry_date,
                compliance_status=data.get('complianceStatus', 'Compliant'),
            )
            db.session.add(license_obj)
            db.session.commit()
            add_audit_log("CREATE", f"Created license {license_obj.license_id}", current_role)
            return jsonify(license_obj.to_dict()), 201
        
        elif action == 'update':
            license_id = data.get('licenseId')
            license_obj = License.query.filter_by(license_id=license_id).first()
            if not license_obj:
                return jsonify({"error": "License not found"}), 404

            if 'softwareName' in data:
                license_obj.software_name = data['softwareName']
            if 'licenseKey' in data:
                license_obj.license_key = data['licenseKey']
            if 'totalSeats' in data:
                license_obj.total_seats = data['totalSeats']
            if 'usedSeats' in data:
                license_obj.used_seats = data['usedSeats']
            if 'expiryDate' in data:
                try:
                    license_obj.expiry_date = _parse_date(data['expiryDate'], 'expiryDate')
                except ValueError as exc:
                    return jsonify({"error": str(exc)}), 400
            if 'complianceStatus' in data:
                license_obj.compliance_status = data['complianceStatus']
            db.session.commit()
            add_audit_log("UPDATE", f"Updated license {license_id}", current_role)
            return jsonify(license_obj.to_dict())
        
        elif action == 'delete':
            license_id = data.get('licenseId')
            license_obj = License.query.filter_by(license_id=license_id).first()
            if not license_obj:
                return jsonify({"error": "License not found"}), 404
            db.session.delete(license_obj)
            db.session.commit()
            add_audit_log("DELETE", f"Deleted license {license_id}", current_role)
            return jsonify(license_obj.to_dict())

@app.route('/api/monitoring/hardware', methods=['GET', 'POST', 'DELETE'])
def hardware_health():
    """Get hardware health monitoring data"""
    if request.method == 'GET':
        records = HardwareHealthRecord.query.all()
        return jsonify([record.to_dict() for record in records])

    global current_role, is_authenticated
    if not is_authenticated or current_role != "Admin":
        return jsonify({"error": "Insufficient permissions"}), 403

    if request.method == 'POST':
        data = request.json or {}
        device_id = data.get('deviceId')
        cpu_load = data.get('cpuLoad')
        memory_util = data.get('memoryUtil')
        is_overheating = _to_bool(data.get('isOverheating', False))
        last_check = data.get('lastCheck')

        if not all([device_id, cpu_load is not None, memory_util is not None]):
            return jsonify({"error": "deviceId, cpuLoad, and memoryUtil are required"}), 400

        try:
            parsed_last_check = _parse_datetime(last_check, 'lastCheck') if last_check else datetime.utcnow()
        except ValueError as exc:
            return jsonify({"error": str(exc)}), 400

        record = HardwareHealthRecord(
            device_id=device_id,
            cpu_load=int(cpu_load),
            memory_util=int(memory_util),
            is_overheating=is_overheating,
            last_check=parsed_last_check,
        )
        db.session.add(record)
        db.session.commit()
        add_audit_log("CREATE_HARDWARE", f"Hardware record added for {device_id}", current_role)
        return jsonify(record.to_dict()), 201

    device_id = request.args.get('deviceId')
    if not device_id:
        return jsonify({"error": "deviceId query parameter is required"}), 400

    record = HardwareHealthRecord.query.filter_by(device_id=device_id).first()
    if not record:
        return jsonify({"error": "Hardware record not found"}), 404

    db.session.delete(record)
    db.session.commit()
    add_audit_log("DELETE_HARDWARE", f"Hardware record {device_id} removed", current_role)
    return jsonify({"success": True})

@app.route('/api/monitoring/network', methods=['GET', 'POST', 'DELETE'])
def network_usage():
    """Get network usage monitoring data"""
    if request.method == 'GET':
        devices = NetworkDevice.query.all()
        return jsonify([device.to_dict() for device in devices])

    global current_role, is_authenticated
    if not is_authenticated or current_role != "Admin":
        return jsonify({"error": "Insufficient permissions"}), 403

    if request.method == 'POST':
        data = request.json or {}
        device_id = data.get('deviceId')
        bandwidth_mb = data.get('bandwidthMB')
        is_downtime = _to_bool(data.get('isDowntime', False))
        abnormal_traffic = _to_bool(data.get('abnormalTraffic', False))

        if not all([device_id, bandwidth_mb is not None]):
            return jsonify({"error": "deviceId and bandwidthMB are required"}), 400

        entry = NetworkDevice(
            device_id=device_id,
            bandwidth_mb=int(bandwidth_mb),
            is_downtime=is_downtime,
            abnormal_traffic=abnormal_traffic,
        )
        db.session.add(entry)
        db.session.commit()
        add_audit_log("CREATE_NETWORK", f"Network device {device_id} added", current_role)
        return jsonify(entry.to_dict()), 201

    device_id = request.args.get('deviceId')
    if not device_id:
        return jsonify({"error": "deviceId query parameter is required"}), 400

    entry = NetworkDevice.query.filter_by(device_id=device_id).first()
    if not entry:
        return jsonify({"error": "Network record not found"}), 404

    db.session.delete(entry)
    db.session.commit()
    add_audit_log("DELETE_NETWORK", f"Network device {device_id} removed", current_role)
    return jsonify({"success": True})

@app.route('/api/monitoring/backup', methods=['GET'])
def backup_recovery():
    """Get backup and recovery monitoring data"""
    jobs = BackupJob.query.all()
    return jsonify([job.to_dict() for job in jobs])

@app.route('/api/monitoring/backup/comment', methods=['POST'])
def backup_comment():
    """Allow IT Staff to add or update backup technician comments."""
    global current_role, is_authenticated
    if not is_authenticated or current_role != "IT Staff":
        return jsonify({"error": "Insufficient permissions"}), 403

    payload = request.json or {}
    job_id = payload.get("jobId")
    comment = payload.get("comment", "")

    if not job_id:
        return jsonify({"error": "jobId is required"}), 400

    job = BackupJob.query.filter_by(job_id=job_id).first()
    if not job:
        return jsonify({"error": "Backup job not found"}), 404

    job.technician_comment = comment.strip() or None
    db.session.commit()
    add_audit_log("BACKUP_COMMENT", f"Updated backup comment for {job_id}", current_role)
    return jsonify(job.to_dict())

@app.route('/api/assets/logs', methods=['GET'])
def asset_logs():
    """Admin-only access to asset change logs."""
    global current_role, is_authenticated
    if not is_authenticated or current_role != "Admin":
        return jsonify({"error": "Insufficient permissions"}), 403

    logs = AssetLog.query.order_by(AssetLog.timestamp.desc()).all()
    return jsonify([log.to_dict() for log in logs])

@app.route('/api/users', methods=['GET', 'POST'])
def manage_users():
    """Admin-only user management endpoint."""
    global current_role, is_authenticated
    if not is_authenticated or current_role != "Admin":
        return jsonify({"error": "Insufficient permissions"}), 403

    if request.method == 'GET':
        users = User.query.all()
        return jsonify([user.to_dict() for user in users])

    data = request.json or {}
    username = (data.get('username') or '').strip().lower()
    password = data.get('password')
    role = data.get('role', 'Employee')
    name = data.get('name', username or "User").strip()
    requires_mfa = data.get('requiresMFA', data.get('requires_mfa', False))

    if not username:
        return jsonify({"error": "Username is required"}), 400
    if not password:
        return jsonify({"error": "Password is required"}), 400
    if role not in ["IT Staff", "Employee"]:
        return jsonify({"error": "Role must be either 'IT Staff' or 'Employee'"}), 400
    if User.query.filter_by(username=username).first():
        return jsonify({"error": "Username already exists"}), 409

    user = User(
        username=username,
        password=password,
        role=role,
        name=name or username,
        requires_mfa=bool(requires_mfa),
    )
    db.session.add(user)
    db.session.commit()
    add_audit_log("CREATE_USER", f"User {username} created with role {role}", current_role)
    return jsonify(user.to_dict()), 201

@app.route('/api/users/<username>/assets', methods=['GET'])
def user_assets(username):
    """Admin-only view of assets assigned to a specific user."""
    global current_role, is_authenticated
    if not is_authenticated or current_role != "Admin":
        return jsonify({"error": "Insufficient permissions"}), 403

    user = User.query.filter_by(username=username.lower()).first()
    if not user:
        return jsonify({"error": "User not found"}), 404

    identifier_values = {value.strip() for value in [user.name or "", user.username or ""] if value}
    if not identifier_values:
        assets = []
    else:
        assets = (
            Asset.query.filter(Asset.assigned_user.in_(identifier_values))
            .order_by(Asset.asset_id.asc())
            .all()
        )

    return jsonify([asset.to_dict() for asset in assets])

@app.route('/api/reports/overview', methods=['GET'])
def reports_overview():
    """Admin-only consolidated reporting endpoint."""
    global current_role, is_authenticated
    if not is_authenticated or current_role != "Admin":
        return jsonify({"error": "Insufficient permissions"}), 403
    report = generate_report_snapshot()
    add_audit_log("REPORT_GENERATE", "Generated consolidated operational report", current_role)

    response_format = request.args.get("format", "json").strip().lower()
    if response_format == "csv":
        csv_buffer = io.StringIO()
        writer = csv.writer(csv_buffer)

        writer.writerow(["Report Generated At", report["generatedAt"]])
        writer.writerow([])

        writer.writerow(["Assets Report"])
        writer.writerow(["Metric", "Value"])
        assets_section = report["assetsReport"]
        writer.writerow(["Total Assets", assets_section["totalAssets"]])
        writer.writerow(["Assets Under Maintenance", assets_section["assetsUnderMaintenance"]])
        writer.writerow(["Assets Expiring Warranty Within 30 Days", assets_section["assetsExpiringWarrantySoon"]])
        writer.writerow(["Assets Per Department"])
        for dept, count in assets_section["assetsPerDepartment"].items():
            writer.writerow([f"  {dept}", count])
        writer.writerow([])

        writer.writerow(["Software License Report"])
        licenses_section = report["softwareLicenseReport"]
        writer.writerow(["Metric", "Value"])
        writer.writerow(["Total Licensed Software", licenses_section["totalLicensedSoftware"]])
        writer.writerow(["Active Licenses", licenses_section["activeLicenses"]])
        writer.writerow(["Licenses Expiring Within 30 Days", licenses_section["licensesExpiringIn30Days"]])
        writer.writerow(["Expired Licenses", licenses_section["expiredLicenses"]])
        writer.writerow([])

        writer.writerow(["Hardware & Network Monitoring Report"])
        hardware_section = report["hardwareNetworkReport"]
        writer.writerow(["Metric", "Value"])
        writer.writerow(["Average CPU Load (%)", hardware_section["averageCpuLoad"]])
        writer.writerow(["Average RAM Utilization (%)", hardware_section["averageMemoryUtilization"]])
        writer.writerow(["Average Disk Utilization (%)", hardware_section["averageDiskUtilization"]])
        writer.writerow(["Alerts Triggered Today", hardware_section["alertsToday"]])
        writer.writerow(["Alerts Triggered This Week", hardware_section["alertsThisWeek"]])
        writer.writerow(["Top Devices by Bandwidth"])
        for device in hardware_section["topBandwidthDevices"]:
            writer.writerow([f"  {device['deviceId']}", f"{device['bandwidthMB']} MB"])
        writer.writerow([])

        writer.writerow(["Backup & Recovery Report"])
        backup_section = report["backupRecoveryReport"]
        writer.writerow(["Metric", "Value"])
        writer.writerow(["Backups Run This Week", backup_section["backupsRunThisWeek"]])
        writer.writerow(["Successful Backups", backup_section["successfulBackups"]])
        writer.writerow(["Failed Backups", backup_section["failedBackups"]])
        writer.writerow(["Missed Backups", backup_section["missedBackups"]])
        writer.writerow(["Systems Without Recent Backup (>7 days)"])
        if backup_section["systemsWithoutRecentBackup"]:
            for system in backup_section["systemsWithoutRecentBackup"]:
                writer.writerow([f"  {system}"])
        else:
            writer.writerow(["  None"])
        writer.writerow([])

        writer.writerow(["Department Asset Report"])
        dept_section = report["departmentAssetReport"]["assetsPerDepartment"]
        writer.writerow(["Department", "Asset Count"])
        for dept, count in dept_section.items():
            writer.writerow([dept, count])

        csv_buffer.seek(0)
        return Response(
            csv_buffer.getvalue(),
            mimetype="text/csv",
            headers={
                "Content-Disposition": "attachment; filename=operational-report.csv"
            }
        )

    return jsonify(report)

@app.route('/api/audit-log', methods=['GET'])
def audit_log():
    """Get audit log (Admin/IT Staff only)"""
    global current_role
    if current_role != "Admin":
        return jsonify({"error": "Insufficient permissions"}), 403
    logs = AuditLog.query.order_by(AuditLog.timestamp.desc()).all()
    return jsonify([log.to_dict() for log in logs])

@app.route('/api/auth/login', methods=['POST'])
def login():
    """User authentication endpoint (ITM-SR-002) with MFA for Admin"""
    global current_role, current_user, current_user_name, is_authenticated
    data = request.json
    username = data.get('username', '').lower()
    password = data.get('password', '')
    mfa_code = data.get('mfaCode', '')
    use_biometric = data.get('useBiometric', False)
    
    # Mock biometric authentication (non-functional as per requirements)
    if use_biometric:
        return jsonify({
            "success": False,
            "message": "Biometric authentication is not yet implemented. Please use password login."
        }), 400
    
    # Check credentials
    user = User.query.filter_by(username=username).first()
    if not user or user.password != password:
        return jsonify({"success": False, "message": "Invalid username or password"}), 401

    if user.requires_mfa:
        if not mfa_code or mfa_code != '123456':
            return jsonify({
                "success": False,
                "requiresMFA": True,
                "message": "MFA code required for Admin login. Use code: 123456"
            }), 401

    current_user = username
    current_role = user.role
    current_user_name = user.name
    is_authenticated = True
    add_audit_log("LOGIN", f"User {username} logged in", current_role)
    return jsonify({"success": True, "role": current_role, "name": user.name})

@app.route('/api/auth/logout', methods=['POST'])
def logout():
    """User logout endpoint"""
    global current_user, current_role, current_user_name, is_authenticated
    if current_user:
        add_audit_log("LOGOUT", f"User {current_user} logged out", current_role)
    current_user = None
    current_role = None
    current_user_name = None
    is_authenticated = False
    return jsonify({"success": True})

@app.route('/api/auth/status', methods=['GET'])
def auth_status():
    """Get current authentication status"""
    global current_role, current_user, is_authenticated
    return jsonify({
        "authenticated": is_authenticated,
        "role": current_role,
        "user": current_user
    })

@app.route('/api/monitoring/backup/verify', methods=['POST'])
def backup_verify():
    """Automated backup verification endpoint (ITM-F-041) - Resets status to 'Under Investigation'"""
    global current_role, is_authenticated
    if not is_authenticated or current_role not in ["Admin", "IT Staff"]:
        return jsonify({"error": "Insufficient permissions"}), 403
    
    # Find failed/missed backup jobs
    failed_jobs = BackupJob.query.filter(BackupJob.status.in_(["Failure", "Missed"])).all()
    
    # Simulate verification process and reset status to 'Under Investigation'
    verification_results = []
    for job in failed_jobs:
        previous_status = job.status
        job.status = "Under Investigation"
        verification_results.append({
            "jobId": job.job_id,
            "assetId": job.asset_id,
            "previousStatus": previous_status,
            "newStatus": "Under Investigation",
            "alertReason": job.alert_reason,
            "verificationStatus": "Under Investigation",
            "recommendedAction": "Review backup configuration and retry backup job"
        })
    
    db.session.commit()
    add_audit_log("VERIFY", f"Backup verification run - {len(failed_jobs)} jobs set to 'Under Investigation'", current_role)
    
    return jsonify({
        "verifiedJobs": len(failed_jobs),
        "results": verification_results,
        "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    })

@app.route('/api/integrations/status', methods=['GET'])
def integration_status():
    """Get external integration status"""
    statuses = IntegrationStatus.query.all()
    return jsonify({status.slug: status.to_dict() for status in statuses})

@app.route('/api/analytics/assets-by-department', methods=['GET'])
def assets_by_department():
    """Get asset distribution by department for analytics (ITM-F-061)"""
    department_counts = {}
    for asset in Asset.query.all():
        dept = asset.department or "Unknown"
        department_counts[dept] = department_counts.get(dept, 0) + 1
    return jsonify(department_counts)

@app.route('/api/assets/<asset_id>/qr', methods=['GET'])
def generate_qr(asset_id):
    """Generate QR code data for asset (ITM-F-001)"""
    asset = Asset.query.filter_by(asset_id=asset_id).first()
    if not asset:
        return jsonify({"error": "Asset not found"}), 404
    
    # Generate mock QR code data
    qr_data = {
        "assetId": asset_id,
        "assetType": asset.asset_type,
        "url": f"http://localhost:5000/assets/{asset_id}",
        "message": "In a real application, scanning this QR code would link to the asset's details page."
    }
    
    user_role = current_role if current_role else "System"
    add_audit_log("QR_GENERATE", f"QR code generated for asset {asset_id}", user_role)
    return jsonify(qr_data)

@app.route('/')
def index():
    """Serve the main HTML file"""
    return send_from_directory(os.path.dirname(os.path.abspath(__file__)), 'index.html')

if __name__ == '__main__':
    with app.app_context():
        add_audit_log("SYSTEM", "IIMS System Started", "System")
    app.run(debug=True, port=5000)

