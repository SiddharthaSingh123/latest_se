# app.py
import os
import time
import stripe
from werkzeug.utils import secure_filename
from flask import abort, send_from_directory
from flask import current_app, url_for
from flask import Flask, request, jsonify
from flask_login import LoginManager, login_user, login_required, logout_user, current_user
from flask_cors import CORS
from config import Config
from models import db, User, Product
from datetime import datetime


def create_app():
    # Serve frontend static files from the frontend/ folder
    app = Flask(__name__, static_folder='frontend', static_url_path='')
    app.config.from_object(Config)

    # --- Upload configuration ---
    upload_folder = os.path.join(app.root_path, 'static', 'uploads')
    os.makedirs(upload_folder, exist_ok=True)
    app.config['UPLOAD_FOLDER'] = upload_folder
    ALLOWED_EXT = {'png', 'jpg', 'jpeg', 'gif', 'webp'}

    @app.route('/static/uploads/<path:filename>')
    def uploaded_file(filename):
        uploads_dir = os.path.join(app.root_path, 'static', 'uploads')
        return send_from_directory(uploads_dir, filename)

    def allowed_file(filename):
        return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXT

    db.init_app(app)

    # Use STRIPE_SECRET_KEY from config/environment
    cfg_key = app.config.get("STRIPE_SECRET_KEY")
    if cfg_key:
        stripe.api_key = cfg_key

    BASE_URL = app.config.get("BASE_URL", "http://127.0.0.1:5000")

    CORS(app, supports_credentials=True, resources={r"/api/*": {"origins": ["http://127.0.0.1:5000"]}})

    login_manager = LoginManager()
    login_manager.init_app(app)

    @login_manager.user_loader
    def load_user(user_id):
        try:
            return User.query.get(int(user_id))
        except Exception:
            return None

    with app.app_context():
        db.create_all()

    # --- API routes ---

    @app.route('/api/register', methods=['POST'])
    def register():
        data = request.get_json() or {}
        username = data.get('username')
        email = data.get('email')
        password = data.get('password')

        if not (username and email and password):
            return jsonify({'error': 'username, email and password required'}), 400

        if User.query.filter((User.username == username) | (User.email == email)).first():
            return jsonify({'error': 'user with that username or email already exists'}), 409

        user = User(username=username, email=email)
        user.set_password(password)
        db.session.add(user)
        db.session.commit()

        login_user(user)
        return jsonify({'message': 'registered', 'user': user.to_dict()}), 201

    @app.route('/api/login', methods=['POST'])
    def login():
        data = request.get_json() or {}
        email = data.get('email')
        password = data.get('password')
        remember = bool(data.get('remember', False))

        if not (email and password):
            return jsonify({'error': 'email and password required'}), 400

        user = User.query.filter_by(email=email).first()
        if user is None or not user.check_password(password):
            return jsonify({'error': 'invalid credentials'}), 401

        login_user(user, remember=remember)
        return jsonify({'message': 'logged in', 'user': user.to_dict()}), 200

    @app.route('/api/logout', methods=['POST'])
    @login_required
    def logout():
        logout_user()
        return jsonify({'message': 'logged out'}), 200

    @app.route('/api/user', methods=['GET'])
    def get_current_user():
        if current_user.is_authenticated:
            return jsonify({'authenticated': True, 'user': current_user.to_dict()}), 200
        else:
            return jsonify({'authenticated': False}), 200

    # ----------------- Product endpoints -----------------

    @app.route('/api/products', methods=['POST'])
    @login_required
    def create_product():
        """
        Accept either:
         - multipart/form-data with a file field named 'image', or
         - application/json with fields: title, description, price, image_url
        """
        title = None
        description = ''
        price = None
        image_url = ''

        content_type = request.content_type or ''
        if 'multipart/form-data' in content_type:
            form = request.form
            title = form.get('title') or form.get('prodName') or form.get('name')
            description = form.get('description') or form.get('prodDesc') or ''
            price = form.get('price') or form.get('prodPrice') or None

            file = request.files.get('image')
            if file and file.filename:
                if not allowed_file(file.filename):
                    return jsonify({'error': 'file type not allowed'}), 400
                filename = secure_filename(file.filename)
                prefix = str(int(time.time()))
                owner_part = f"_{current_user.id}" if getattr(current_user, 'id', None) else ""
                filename = f"{prefix}{owner_part}_{filename}"
                dest = os.path.join(app.config['UPLOAD_FOLDER'], filename)
                file.save(dest)
                image_url = url_for('uploaded_file', filename=filename, _external=False)
        else:
            data = request.get_json() or {}
            title = data.get('title') or data.get('prodName') or data.get('name')
            description = data.get('description', '')
            price = data.get('price')
            image_url = data.get('image_url') or data.get('dlink') or ''

        if not title:
            return jsonify({'error': 'title required'}), 400

        try:
            price_val = None
            if price is not None and price != '':
                price_val = float(price)
        except (ValueError, TypeError):
            return jsonify({'error': 'invalid price'}), 400

        product = Product(
            owner_id=current_user.id,
            title=title,
            description=description,
            price=price_val,
            image_url=image_url or None
        )
        db.session.add(product)
        db.session.commit()
        return jsonify({'message': 'product created', 'product': product.to_dict()}), 201

    @app.route('/api/products', methods=['GET'])
    def list_products():
        products = Product.query.order_by(Product.created_at.desc()).all()
        return jsonify([p.to_dict() for p in products]), 200

    @app.route('/api/my-products', methods=['GET'])
    @login_required
    def my_products():
        products = Product.query.filter_by(owner_id=current_user.id).order_by(Product.created_at.desc()).all()
        return jsonify([p.to_dict() for p in products]), 200

    # ----------------- Stripe Checkout -----------------
    @app.route('/api/create-checkout-session', methods=['POST'])
    @login_required
    def create_checkout_session():
        try:
            data = request.get_json() or {}
            items = data.get('items', [])
            success_url = data.get('success_url') or (BASE_URL + '/success.html')
            cancel_url = data.get('cancel_url') or (BASE_URL + '/cancel.html')

            if not items or not isinstance(items, list):
                return jsonify({'error': 'no items provided'}), 400

            line_items = []
            for item in items:
                title = item.get('title') or item.get('name') or 'Product'
                try:
                    price_val = float(item.get('price', 0))
                except (TypeError, ValueError):
                    price_val = 0
                qty = int(item.get('qty', 1) or 1)
                if price_val <= 0:
                    continue
                line_items.append({
                    'price_data': {
                        'currency': 'inr',
                        'product_data': {'name': title},
                        'unit_amount': int(price_val * 100)
                    },
                    'quantity': qty
                })

            if not line_items:
                return jsonify({'error': 'no valid line items (check price values)'}), 400

            session = stripe.checkout.Session.create(
                payment_method_types=['card'],
                line_items=line_items,
                mode='payment',
                success_url=success_url,
                cancel_url=cancel_url
            )

            return jsonify({'url': session.url}), 200

        except Exception as e:
            print("Stripe session creation error:", e)
            return jsonify({'error': str(e)}), 500

    # ----------------- Serve frontend static files -----------------
    @app.route('/', methods=['GET'])
    def serve_index():
        return app.send_static_file('index.html')

    @app.route('/<path:filename>', methods=['GET'])
    def serve_file(filename):
        if filename.startswith('api/'):
            return jsonify({'error': 'not found'}), 404
        return app.send_static_file(filename)

    return app


if __name__ == '__main__':
    app = create_app()
    app.run(host='0.0.0.0', port=5000, debug=True)
