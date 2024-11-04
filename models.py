from sqlalchemy import create_engine, Column, Integer, String, Float, DateTime, ForeignKey
from sqlalchemy.orm import declarative_base, relationship
from datetime import datetime

DATABASE_URL = 'sqlite:///student_section.db'
engine = create_engine(DATABASE_URL)
Base = declarative_base()

# Users Table
class User(Base):
    __tablename__ = 'users'
    
    user_id = Column(Integer, primary_key=True)
    student_id = Column(String(50), unique=True, nullable=False)
    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100), nullable=False)
    email = Column(String(100), unique=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

# Events Table
class Event(Base):
    __tablename__ = 'events'
    
    event_id = Column(Integer, primary_key=True)
    event_name = Column(String(255), nullable=False)
    event_date = Column(DateTime, nullable=False)
    event_time = Column(DateTime)
    location = Column(String(255), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

# Tickets Table
class Ticket(Base):
    __tablename__ = 'tickets'
    
    ticket_id = Column(Integer, primary_key=True)
    event_id = Column(Integer, ForeignKey('events.event_id'), nullable=False)
    owner_id = Column(Integer, ForeignKey('users.user_id'), nullable=False)
    barcode = Column(String(100), unique=True)
    unique_id = Column(String(100), unique=True)
    seat_number = Column(String(50))
    price = Column(Float, nullable=False)
    price_level = Column(String(50))
    price_type = Column(String(50))
    status = Column(String(50), default='Available')
    print_status = Column(String(50), default='Not Issued')
    section = Column(String(50))
    row = Column(String(50))
    seat = Column(String(50))
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

# Orders Table
class Order(Base):
    __tablename__ = 'orders'
    
    order_id = Column(Integer, primary_key=True)
    ticket_id = Column(Integer, ForeignKey('tickets.ticket_id'), nullable=False)
    seller_id = Column(Integer, ForeignKey('users.user_id'))
    buyer_id = Column(Integer, ForeignKey('users.user_id'))
    resale_price = Column(Float)
    transaction_amount = Column(Float, nullable=False)
    status = Column(String(50), default='Pending')
    transaction_date = Column(DateTime, default=datetime.utcnow)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

# API_Logs Table
class APILog(Base):
    __tablename__ = 'api_logs'
    
    log_id = Column(Integer, primary_key=True)
    request_type = Column(String(50), nullable=False)
    response_code = Column(Integer, nullable=False)
    status = Column(String(50), default='Success')
    timestamp = Column(DateTime, default=datetime.utcnow)

# Create tables in the database
Base.metadata.create_all(engine)
