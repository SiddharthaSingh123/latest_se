# config.py
import os

class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY', 'dev-secret')
    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL', 'sqlite:///app.db')
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    # Stripe keys (test mode) – read only from environment
    STRIPE_SECRET_KEY = os.environ.get('STRIPE_SECRET_KEY')
    # STRIPE_WEBHOOK_SECRET = os.environ.get('STRIPE_WEBHOOK_SECRET')  # optional
    BASE_URL = os.environ.get('BASE_URL', 'http://127.0.0.1:5000')
