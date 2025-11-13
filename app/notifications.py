import os
import io
import csv
from datetime import datetime, timedelta
from typing import Dict, List

from . import db
from .models import SoftwareLicense, AlertHistory


def _collect_license_notifications(days: int = 30) -> List[Dict]:
    threshold = datetime.utcnow().date() + timedelta(days=days)
    licenses = (
        db.session.query(SoftwareLicense)
        .filter(SoftwareLicense.expiry_date != None)  # noqa: E711
        .filter(SoftwareLicense.expiry_date <= threshold)
        .order_by(SoftwareLicense.expiry_date.asc())
        .all()
    )

    notifications = []
    for license in licenses:
        notifications.append({
            "type": "license_expiry",
            "id": license.id,
            "software_name": license.software_name,
            "expires_on": license.expiry_date.isoformat(),
            "asset_id": license.asset_id,
            "message": f"License '{license.software_name}' expires on {license.expiry_date.isoformat()}"
        })
    return notifications


def _collect_hardware_alerts() -> List[Dict]:
    alerts = (
        db.session.query(AlertHistory)
        .filter(AlertHistory.status == 'ACTIVE')
        .order_by(AlertHistory.timestamp.desc())
        .all()
    )

    notifications = []
    for alert in alerts:
        notifications.append({
            "type": "hardware_alert",
            "id": alert.id,
            "asset_id": alert.asset_id,
            "metric": alert.metric_type,
            "value": alert.triggered_value,
            "status": alert.status,
            "timestamp": alert.timestamp.isoformat(),
            "message": f"{alert.metric_type.upper()} alert on asset {alert.asset_id}"
        })
    return notifications


def _collect_backup_alerts(backup_dir: str = "backup_logs", threshold_hours: int = 2) -> List[Dict]:
    notifications = []

    if not os.path.exists(backup_dir) or not os.listdir(backup_dir):
        notifications.append({
            "type": "backup_alert",
            "message": "No backup logs found in the monitored directory."
        })
        return notifications

    log_paths = [
        os.path.join(backup_dir, file_name)
        for file_name in os.listdir(backup_dir)
        if file_name.endswith('.log')
    ]

    if not log_paths:
        notifications.append({
            "type": "backup_alert",
            "message": "No backup logs found in the monitored directory."
        })
        return notifications

    latest_log = max(log_paths, key=os.path.getmtime)
    last_modified = os.path.getmtime(latest_log)
    hours_since = (datetime.utcnow().timestamp() - last_modified) / 3600

    if hours_since > threshold_hours:
        notifications.append({
            "type": "backup_alert",
            "message": "Latest backup log is older than expected threshold."
        })

    try:
        with open(latest_log, 'r', encoding='utf-8') as handle:
            contents = handle.read().lower()
    except OSError:
        contents = ''

    if 'fail' in contents or 'error' in contents:
        notifications.append({
            "type": "backup_alert",
            "message": f"Issues detected in backup log {os.path.basename(latest_log)}"
        })

    return notifications


def generate_notifications(app, *, backup_dir: str = "backup_logs", license_days: int = 30, backup_threshold_hours: int = 2) -> Dict:
    with app.app_context():
        license_notices = _collect_license_notifications(days=license_days)
        hardware_notices = _collect_hardware_alerts()
        backup_notices = _collect_backup_alerts(backup_dir=backup_dir, threshold_hours=backup_threshold_hours)

    all_notifications = license_notices + hardware_notices + backup_notices

    return {
        "count": len(all_notifications),
        "notifications": all_notifications,
        "license_expiries": license_notices,
        "hardware_alerts": hardware_notices,
        "backup_alerts": backup_notices
    }


def notifications_to_csv(notifications: List[Dict]) -> str:
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(['type', 'message'])
    for notice in notifications:
        writer.writerow([
            notice.get('type', ''),
            notice.get('message', '')
        ])
    return output.getvalue()


def notifications_to_pdf(notifications: List[Dict]) -> bytes:
    lines = ['Notifications Report', '']
    for notice in notifications:
        message = notice.get('message') or ''
        lines.append(f"{notice.get('type', '').upper()}: {message}")

    body = '\n'.join(lines)
    pdf_content = (
        "%PDF-1.4\n"
        "% Centralized Notifications Report\n"
        f"{body}\n"
        "%%EOF"
    )
    return pdf_content.encode('utf-8')
