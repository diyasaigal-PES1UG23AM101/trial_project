# app/__init__.py
from flask import Flask
from flask_sqlalchemy import SQLAlchemy
import logging

db = SQLAlchemy()

def create_app(test_config=None):
    """
    Application factory function. Creates and configures the Flask app.
    """
    app = Flask(__name__, instance_relative_config=True)

    # --- Logging Configuration ---
    logging.basicConfig(level=logging.INFO)

    # --- Default Config ---
    app.config.from_mapping(
        SECRET_KEY='dev',
        SQLALCHEMY_DATABASE_URI='sqlite:///asset_management.db',
        SQLALCHEMY_TRACK_MODIFICATIONS=False,
    )

    # --- Test Configuration Override ---
    if test_config is not None:
        app.config.from_mapping(test_config)

    # --- Initialize Extensions ---
    db.init_app(app)

    # --- Start Scheduler (for Story 2.3 and License Expiry Checks) ---
    from .scheduler import start_scheduler
    start_scheduler(app)

    # --- Database Initialization Command ---
    @app.cli.command('init-db')
    def init_db_command():
        """Creates database tables if they don't exist."""
        with app.app_context():
            from . import models
            db.create_all()
            print('Database initialized (Tables created).')

    # --- Import Models and Routes ---
    from . import models  # noqa: F401
    from .routes import asset_bp  # single blueprint handles all routes
    app.register_blueprint(asset_bp)

    logging.info("✅ Flask app initialized successfully.")
    return app