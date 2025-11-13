# app/routes.py - CLEANED, FINAL, AND TEST-PASSED VERSION (includes Story 8.2 Export Reports)

from flask import Blueprint, request, jsonify, make_response, send_file
from datetime import datetime, timedelta
from sqlalchemy import func, select
from flask import current_app as app
import os, time, csv
from io import BytesIO, StringIO
from fpdf import FPDF

# Import database and models
from . import db
from .models import Asset, SoftwareLicense, AssetMetric, AlertThreshold, AlertHistory
from .notifications import generate_notifications, notifications_to_csv, notifications_to_pdf

# --- Blueprint Definition ---
asset_bp = Blueprint("assets", __name__)

# =========================================================
#                ASSET MANAGEMENT ROUTES
# =========================================================

def validate_asset_data(data, existing_purchase_date=None, purchase_date_required=True):
    """Handles date validation and checks business logic for Assets."""
    errors = {}
    effective_purchase_date = existing_purchase_date
    purchase_date_obj = None

    if "purchase_date" in data:
        try:
            purchase_date_obj = datetime.strptime(data["purchase_date"], "%Y-%m-%d").date()
            effective_purchase_date = purchase_date_obj
        except ValueError:
            errors["purchase_date"] = "Invalid date format. Use YYYY-MM-DD."
    elif purchase_date_required and existing_purchase_date is None:
        errors["purchase_date"] = "Missing mandatory field: purchase_date."

    warranty_end_date_obj = None
    if "warranty_end_date" in data and data["warranty_end_date"]:
        try:
            warranty_end_date_obj = datetime.strptime(data["warranty_end_date"], "%Y-%m-%d").date()
        except ValueError:
            errors["warranty_end_date"] = "Invalid date format. Use YYYY-MM-DD."

    if effective_purchase_date and warranty_end_date_obj and warranty_end_date_obj < effective_purchase_date:
        errors["warranty_check"] = "Warranty end date cannot be before the purchase date."

    return errors, purchase_date_obj, warranty_end_date_obj


def validate_metric_data(data):
    """Validates metric data structure and checks value ranges (0.0 to 100.0)."""
    errors = {}
    required_fields = ["asset_id", "cpu_percent", "ram_percent", "disk_percent"]

    if not all(field in data for field in required_fields):
        return {"missing_fields": f"Missing required fields: {', '.join(required_fields)}"}, None

    try:
        validated_data = {
            "asset_id": int(data["asset_id"]),
            "cpu_percent": float(data["cpu_percent"]),
            "ram_percent": float(data["ram_percent"]),
            "disk_percent": float(data["disk_percent"]),
        }
    except ValueError:
        return {"data_type": "Metrics or Asset ID must be valid numbers."}, None

    for key in ["cpu_percent", "ram_percent", "disk_percent"]:
        value = validated_data[key]
        if not (0.0 <= value <= 100.0):
            errors[key] = f"{key} must be between 0.0 and 100.0."

    if errors:
        return errors, None

    return None, validated_data


# ----------------------------------------------------------------------
# --- ASSET CRUD (Stories 2.1, 2.2, 2.4) -------------------------------
# ----------------------------------------------------------------------

@asset_bp.route("/assets", methods=["POST"])
def create_asset():
    data = request.get_json()
    errors, purchase_date, warranty_expiry = validate_asset_data(data, purchase_date_required=True)
    if errors:
        return jsonify({"message": "Validation failed.", "errors": errors}), 400

    serial_number = data.get("serial_number")
    if serial_number and Asset.query.filter_by(serial_number=serial_number).first():
        return jsonify({"message": f"Asset with serial number {serial_number} already exists."}), 409

    new_asset = Asset(
        name=data.get("name"),
        serial_number=serial_number,
        purchase_date=purchase_date,
        warranty_end_date=warranty_expiry,
        assigned_user=data.get("assigned_user"),
    )

    try:
        db.session.add(new_asset)
        db.session.commit()
        return jsonify({"message": "Asset successfully created.", "asset_id": new_asset.id}), 201
    except Exception:
        db.session.rollback()
        return jsonify({"message": "Could not save asset due to a server error."}), 500


@asset_bp.route("/assets/<int:asset_id>", methods=["PUT"])
def update_asset(asset_id):
    asset = db.session.get(Asset, asset_id)
    if asset is None:
        return jsonify({"message": f"Asset with ID {asset_id} not found."}), 404

    data = request.get_json()
    errors, purchase_date_obj, warranty_expiry_obj = validate_asset_data(
        data, existing_purchase_date=asset.purchase_date, purchase_date_required=False
    )
    if errors:
        return jsonify({"message": "Validation failed during update.", "errors": errors}), 400

    if "name" in data:
        asset.name = data["name"]
    if "serial_number" in data:
        asset.serial_number = data["serial_number"]
    if "assigned_user" in data:
        asset.assigned_user = data["assigned_user"]
    if purchase_date_obj:
        asset.purchase_date = purchase_date_obj
    if warranty_expiry_obj is not None or "warranty_end_date" in data:
        asset.warranty_end_date = warranty_expiry_obj

    try:
        db.session.commit()
        return jsonify({"message": f"Asset ID {asset_id} updated successfully."}), 200
    except Exception:
        db.session.rollback()
        return jsonify({"message": "Could not update asset due to a server error."}), 500


@asset_bp.route("/assets/<int:asset_id>", methods=["DELETE"])
def delete_asset(asset_id):
    asset = db.session.get(Asset, asset_id)
    if asset is None:
        return jsonify({"message": f"Asset with ID {asset_id} not found."}), 404
    try:
        db.session.delete(asset)
        db.session.commit()
        return jsonify({"message": f"Asset ID {asset_id} deleted successfully."}), 200
    except Exception:
        db.session.rollback()
        return jsonify({"message": "Could not delete asset due to a server error."}), 500


# ----------------------------------------------------------------------
# --- EMPLOYEE VIEW ----------------------------------------------------
# ----------------------------------------------------------------------

@asset_bp.route("/employee/assets/<string:user_name>", methods=["GET"])
def get_assigned_assets(user_name):
    assigned_assets = db.session.execute(
        db.select(Asset).where(func.lower(Asset.assigned_user) == user_name.lower())
    ).scalars().all()
    if not assigned_assets:
        return jsonify({"message": f"No assets assigned to user '{user_name}'."}), 404

    asset_list = []
    for asset in assigned_assets:
        asset_list.append({
            "id": asset.id,
            "name": asset.name,
            "serial_number": asset.serial_number,
            "purchase_date": asset.purchase_date.strftime("%Y-%m-%d"),
            "assigned_user": asset.assigned_user,
            "status": "In Use",
        })
    return jsonify({"user": user_name, "assets": asset_list}), 200


# ----------------------------------------------------------------------
# --- LICENSE CRUD (Story 4.1) -----------------------------------------
# ----------------------------------------------------------------------

@asset_bp.route("/licenses", methods=["POST"])
def create_license():
    def validate_license_data(data):
        errors = {}
        mandatory_fields = ["software_name", "license_key", "expiry_date"]
        if not all(field in data for field in mandatory_fields):
            errors["missing_fields"] = f"Missing mandatory fields: {', '.join(mandatory_fields)}"

        expiry_date_obj = None
        if "expiry_date" in data:
            try:
                expiry_date_obj = datetime.strptime(data["expiry_date"], "%Y-%m-%d").date()
            except ValueError:
                errors["expiry_date"] = "Invalid date format for expiry_date. Use YYYY-MM-DD."

        return errors, expiry_date_obj

    data = request.get_json()
    errors, expiry_date = validate_license_data(data)

    if errors:
        return jsonify({"message": "Validation failed.", "errors": errors}), 400

    if data.get("asset_id") and not db.session.get(Asset, data["asset_id"]):
        return jsonify({"message": f"Asset ID {data['asset_id']} not found."}), 404

    new_license = SoftwareLicense(
        software_name=data["software_name"],
        license_key=data["license_key"],
        expiry_date=expiry_date,
        purchase_date=datetime.strptime(data["purchase_date"], "%Y-%m-%d").date() if data.get("purchase_date") else None,
        asset_id=data.get("asset_id"),
    )

    try:
        db.session.add(new_license)
        db.session.commit()
        return jsonify({"message": "License successfully recorded.", "license_id": new_license.id}), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({"message": f"Could not save license: {e}"}), 500


@asset_bp.route("/licenses/<int:license_id>", methods=["GET"])
def get_license(license_id):
    license = db.session.get(SoftwareLicense, license_id)
    if license is None:
        return jsonify({"message": f"License ID {license_id} not found."}), 404

    return jsonify({
        "id": license.id,
        "software_name": license.software_name,
        "license_key": license.license_key,
        "expiry_date": license.expiry_date.strftime("%Y-%m-%d"),
        "purchase_date": license.purchase_date.strftime("%Y-%m-%d") if license.purchase_date else None,
        "asset_id": license.asset_id,
    }), 200


# ----------------------------------------------------------------------
# --- BACKUP LOGS ENDPOINT (Story 6.1) ---------------------------------
# ----------------------------------------------------------------------

@asset_bp.route("/api/backup/logs", methods=["GET"])
def get_backup_logs():
    """Return list of backup logs from backup_logs/ directory."""
    logs_dir = os.path.join(os.getcwd(), "backup_logs")

    if not os.path.exists(logs_dir) or not os.listdir(logs_dir):
        return jsonify({"message": "No backup logs found"}), 404

    logs = []
    for filename in os.listdir(logs_dir):
        if filename.endswith(".log"):
            file_path = os.path.join(logs_dir, filename)
            file_stat = os.stat(file_path)
            logs.append({
                "filename": filename,
                "size": file_stat.st_size,
                "last_modified": file_stat.st_mtime,
            })

    if not logs:
        return jsonify({"message": "No backup logs found"}), 404

    return jsonify({"logs": logs}), 200

import time

@asset_bp.route("/api/backup/alerts", methods=["GET"])
def check_backup_alerts():
    """Checks if a recent backup log exists; alerts if missed or failed."""
    backup_folder = "backup_logs"
    alert_threshold_hours = 2  # configurable time window
    now = time.time()

    if not os.path.exists(backup_folder) or not os.listdir(backup_folder):
        return jsonify({
            "status": "ALERT",
            "message": "No recent backup found in the last 2 hours."
        }), 200

    # Get latest log file modification time
    latest_log = max(
        [os.path.join(backup_folder, f) for f in os.listdir(backup_folder)],
        key=os.path.getmtime
    )
    last_modified = os.path.getmtime(latest_log)
    diff_hours = (now - last_modified) / 3600

    if diff_hours > alert_threshold_hours:
        return jsonify({
            "status": "ALERT",
            "message": "Backup seems missed — no log updated in last 2 hours."
        }), 200

    # Optional: Detect "fail" keyword in latest log
    with open(latest_log, "r", encoding="utf-8") as f:
        log_content = f.read().lower()
    if "fail" in log_content or "error" in log_content:
        return jsonify({
            "status": "ALERT",
            "message": f"Backup failed as per log: {os.path.basename(latest_log)}"
        }), 200

    return jsonify({
        "status": "OK",
        "message": f"Recent backup found: {os.path.basename(latest_log)}"
    }), 200


# ----------------------------------------------------------------------
# --- DASHBOARD OVERVIEW (Story 8.1)
# ----------------------------------------------------------------------
@asset_bp.route("/api/dashboard/overview", methods=["GET"])
def get_dashboard_overview():
    """Fetch a summary of system status for admin dashboard."""
    total_assets = Asset.query.count()
    assigned_assets = Asset.query.filter(Asset.assigned_user.isnot(None)).count()
    expiring_assets = Asset.query.filter(
        Asset.warranty_end_date <= (datetime.utcnow().date() + timedelta(days=30))
    ).count()

    total_licenses = SoftwareLicense.query.count()
    expiring_licenses = SoftwareLicense.query.filter(
        SoftwareLicense.expiry_date <= (datetime.utcnow().date() + timedelta(days=30))
    ).count()

    backup_folder = "backup_logs"
    latest_backup = None
    last_status = "No backups found"

    if os.path.exists(backup_folder) and os.listdir(backup_folder):
        latest_log = max(
            [os.path.join(backup_folder, f) for f in os.listdir(backup_folder)],
            key=os.path.getmtime
        )
        last_modified = time.strftime('%Y-%m-%d %H:%M:%S', time.localtime(os.path.getmtime(latest_log)))
        latest_backup = os.path.basename(latest_log)
        with open(latest_log, "r", encoding="utf-8") as f:
            content = f.read().lower()
        if "fail" in content or "error" in content:
            last_status = "Failed"
        else:
            last_status = "Successful"

    latest_metric = AssetMetric.query.order_by(AssetMetric.timestamp.desc()).first()
    avg_cpu = avg_memory = "N/A"
    if latest_metric:
        avg_cpu = latest_metric.cpu_percent
        avg_memory = latest_metric.ram_percent

    dashboard_data = {
        "assets": {"total": total_assets, "assigned": assigned_assets, "expiring_soon": expiring_assets},
        "licenses": {"total": total_licenses, "expiring_soon": expiring_licenses},
        "backups": {
            "last_backup": latest_backup,
            "last_status": last_status,
            "last_modified": last_modified if latest_backup else None
        },
        "metrics": {"avg_cpu_usage": avg_cpu, "avg_memory_usage": avg_memory}
    }

    return jsonify(dashboard_data), 200


# ----------------------------------------------------------------------
# --- LICENSE REMINDERS / COMPLIANCE / METRICS -------------------------
# ----------------------------------------------------------------------

@asset_bp.route("/licenses/reminders", methods=["GET"])
def get_license_reminders():
    from .scheduler import get_expiring_licenses
    expiring_licenses = get_expiring_licenses(app)
    if not expiring_licenses:
        return jsonify({"message": "No software licenses are currently expiring soon."}), 200

    reminder_list = [{
        "id": license.id,
        "software_name": license.software_name,
        "license_key": license.license_key,
        "expiry_date": license.expiry_date.strftime("%Y-%m-%d"),
        "asset_id": license.asset_id,
        "status": "EXPIRING SOON",
    } for license in expiring_licenses]

    return jsonify({"count": len(reminder_list), "reminders": reminder_list}), 200


@asset_bp.route("/compliance/unauthorized", methods=["GET"])
def get_unauthorized_software_report():
    from .scheduler import get_unauthorized_software
    unauthorized_licenses = get_unauthorized_software(app)
    if not unauthorized_licenses:
        return jsonify({"message": "Compliance check passed. No unauthorized software found."}), 200

    report_list = [{
        "id": license.id,
        "software_name": license.software_name,
        "license_key": license.license_key,
        "asset_id": license.asset_id,
        "status": "NON-COMPLIANT",
    } for license in unauthorized_licenses]

    return jsonify({"count": len(report_list), "report": report_list}), 200


@asset_bp.route("/metrics", methods=["POST"])
def submit_metrics():
    data = request.get_json()
    errors, validated_data = validate_metric_data(data)

    if errors:
        return jsonify({"message": "Validation failed.", "errors": errors}), 400

    if not db.session.get(Asset, validated_data["asset_id"]):
        return jsonify({"message": f"Asset ID {validated_data['asset_id']} not found. Cannot record metrics."}), 404

    new_metric = AssetMetric(**validated_data)

    try:
        db.session.add(new_metric)
        db.session.commit()
        return jsonify({"message": "Metrics recorded successfully.", "asset_id": new_metric.asset_id}), 201
    except Exception:
        db.session.rollback()
        return jsonify({"message": "Could not save metrics due to a server error."}), 500


@asset_bp.route("/assets/<int:asset_id>/metrics", methods=["GET"])
def get_asset_metrics(asset_id):
    if not db.session.get(Asset, asset_id):
        return jsonify({"message": f"Asset ID {asset_id} not found."}), 404

    metrics = db.session.execute(
        select(AssetMetric).filter_by(asset_id=asset_id).order_by(AssetMetric.timestamp.desc())
    ).scalars().all()

    if not metrics:
        return jsonify({"message": f"No metric history found for Asset ID {asset_id}."}), 404

    metric_list = [{
        "timestamp": m.timestamp.isoformat(),
        "cpu_percent": m.cpu_percent,
        "ram_percent": m.ram_percent,
        "disk_percent": m.disk_percent,
    } for m in metrics]

    return jsonify({"asset_id": asset_id, "history": metric_list}), 200


@asset_bp.route("/notifications", methods=["GET"])
def get_notifications():
    backup_dir = app.config.get("BACKUP_DIR", "backup_logs")
    notification_summary = generate_notifications(app, backup_dir=backup_dir)

    status = 200
    if notification_summary["count"] == 0:
        notification_summary["message"] = "No notifications at this time."

    return jsonify(notification_summary), status


@asset_bp.route("/notifications/export", methods=["GET"])
def export_notifications():
    backup_dir = app.config.get("BACKUP_DIR", "backup_logs")
    fmt = request.args.get("format", "csv").lower()
    summary = generate_notifications(app, backup_dir=backup_dir)
    notifications = summary["notifications"]

    if fmt == "csv":
        csv_content = notifications_to_csv(notifications)
        response = make_response(csv_content)
        response.headers['Content-Type'] = 'text/csv'
        response.headers['Content-Disposition'] = 'attachment; filename="notifications.csv"'
        return response

    if fmt == "pdf":
        pdf_bytes = notifications_to_pdf(notifications)
        response = make_response(pdf_bytes)
        response.headers['Content-Type'] = 'application/pdf'
        response.headers['Content-Disposition'] = 'attachment; filename="notifications.pdf"'
        return response

    return jsonify({"error": "Unsupported format. Use 'csv' or 'pdf'."}), 400


# ----------------------------------------------------------------------
# --- STORY 8.2 : EXPORT REPORTS ---------------------------------------
# ----------------------------------------------------------------------

@asset_bp.route("/api/reports/export", methods=["GET"])
def export_reports():
    """
    Exports asset and license summary in PDF or CSV format.
    Use ?format=pdf or ?format=csv
    """
    report_format = request.args.get("format", "csv").lower()

    # Fetch data
    assets = Asset.query.all()
    licenses = SoftwareLicense.query.all()

    if not assets and not licenses:
        return jsonify({"message": "No data available for report."}), 404

    # ---- CSV EXPORT ----
    if report_format == "csv":
        si = StringIO()
        writer = csv.writer(si)
        writer.writerow(["--- ASSET REPORT ---"])
        writer.writerow(["ID", "Name", "Serial No", "Assigned User", "Warranty End Date"])
        for a in assets:
            writer.writerow([a.id, a.name, a.serial_number, a.assigned_user, a.warranty_end_date])
        writer.writerow([])
        writer.writerow(["--- LICENSE REPORT ---"])
        writer.writerow(["ID", "Software", "License Key", "Expiry Date"])
        for l in licenses:
            writer.writerow([l.id, l.software_name, l.license_key, l.expiry_date])

        output = BytesIO()
        output.write(si.getvalue().encode("utf-8"))
        output.seek(0)
        return send_file(output, mimetype="text/csv", as_attachment=True, download_name="infrastructure_report.csv")

    # ---- PDF EXPORT ----
    elif report_format == "pdf":
        pdf = FPDF()
        pdf.add_page()
        pdf.set_font("Arial", "B", 16)
        pdf.cell(0, 10, "IT Infrastructure Report", ln=True, align="C")

        pdf.set_font("Arial", "", 12)
        pdf.ln(10)
        pdf.cell(0, 10, "Assets Summary:", ln=True)
        for a in assets:
            pdf.cell(0, 8, f"{a.id}. {a.name} - {a.assigned_user or 'Unassigned'}", ln=True)

        pdf.ln(8)
        pdf.cell(0, 10, "Software Licenses Summary:", ln=True)
        for l in licenses:
            pdf.cell(0, 8, f"{l.id}. {l.software_name} - Expires {l.expiry_date}", ln=True)

        pdf_buffer = BytesIO()
        pdf.output(pdf_buffer)
        pdf_buffer.seek(0)

        return send_file(
            pdf_buffer,
            mimetype="application/pdf",
            as_attachment=True,
            download_name="infrastructure_report.pdf"
        )

    else:
        return jsonify({"message": "Invalid format. Use ?format=pdf or ?format=csv."}), 400