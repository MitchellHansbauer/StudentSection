from flask_sqlalchemy import SQLAlchemy
from datetime import datetime

db = SQLAlchemy()

class User(db.Model):
    __tablename__ = 'Users'
    user_id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    first_name = db.Column(db.String(50), nullable=False)
    last_name = db.Column(db.String(50), nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    paciolan_account_id = db.Column(db.String(120), unique=True, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    tickets = db.relationship('Ticket', backref='owner', lazy=True)
    sales = db.relationship('Transaction', foreign_keys='Transaction.seller_id', backref='seller', lazy=True)
    purchases = db.relationship('Transaction', foreign_keys='Transaction.buyer_id', backref='buyer', lazy=True)

class Ticket(db.Model):
    __tablename__ = 'Tickets'
    ticket_id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    event_code = db.Column(db.String(20), nullable=False)
    event_name = db.Column(db.String(100), nullable=False)
    season_code = db.Column(db.String(20), nullable=False)
    section = db.Column(db.String(10), nullable=False)
    row = db.Column(db.String(10), nullable=False)
    seat_number = db.Column(db.String(10), nullable=False)
    barcode = db.Column(db.String(50), unique=True)
    price = db.Column(db.Float, nullable=False)
    is_transferrable = db.Column(db.Boolean, default=False)
    is_listed = db.Column(db.Boolean, default=False)
    owner_id = db.Column(db.Integer, db.ForeignKey('Users.user_id'))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    transactions = db.relationship('Transaction', backref='ticket', lazy=True)

class Listing(db.Model):
    __tablename__ = 'Listings'
    listing_id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    ticket_id = db.Column(db.Integer, db.ForeignKey('Tickets.ticket_id'), nullable=False)
    seller_id = db.Column(db.Integer, db.ForeignKey('Users.user_id'), nullable=False)
    price = db.Column(db.Float, nullable=False)
    status = db.Column(db.String(20), default='Available')
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    ticket = db.relationship('Ticket', backref='listing', lazy=True)
    seller = db.relationship('User', backref='listings', lazy=True)
    
class Transaction(db.Model):
    __tablename__ = 'Transactions'
    transaction_id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    ticket_id = db.Column(db.Integer, db.ForeignKey('Tickets.ticket_id'), nullable=False)
    seller_id = db.Column(db.Integer, db.ForeignKey('Users.user_id'), nullable=False)
    buyer_id = db.Column(db.Integer, db.ForeignKey('Users.user_id'), nullable=False)
    resale_price = db.Column(db.Float, nullable=False)
    transaction_amount = db.Column(db.Float, nullable=False)
    transaction_status = db.Column(db.String(20), default='Pending')
    transfer_status = db.Column(db.String(20), default='Pending')
    recipient_email = db.Column(db.String(120), nullable=False)
    transfer_id_api = db.Column(db.String(120), unique=True)
    transfer_url = db.Column(db.String(255))
    transaction_date = db.Column(db.DateTime, default=datetime.utcnow)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class APILog(db.Model):
    __tablename__ = 'API_Logs'
    log_id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    request_type = db.Column(db.String(50), nullable=False)
    response_code = db.Column(db.Integer, nullable=False)
    status = db.Column(db.String(20), default='Success')
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)
