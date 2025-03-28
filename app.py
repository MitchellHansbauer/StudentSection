from flask import Flask, request, jsonify, session, redirect, url_for
from flask_session import Session
from datetime import datetime
import re
import os
import uuid
import requests
import redis
import bcrypt
import stripe
from flask_cors import CORS
from pymongo import MongoClient
from pymongo import UpdateOne
from bson import ObjectId
from datetime import timedelta
from schedule_parser import parse_html_schedule
from fuzzy_match import fuzzy_match_event

app = Flask(__name__)
app.config['SESSION_COOKIE_SECURE'] = False  # if you're on HTTP in dev
CORS(app, supports_credentials=True)

#Redis Integration - Secret Key
app.secret_key = os.getenv('SECRET_KEY', default='BAD_SECRET_KEY')
# Configure Redis for storing the session data on the server-side
app.config['SESSION_TYPE'] = 'redis'
app.config['SESSION_PERMANENT'] = True
app.config['PERMANENT_SESSION_LIFETIME'] = timedelta(hours=6)
app.config['SESSION_SERIALIZATION_FORMAT'] = 'json'
app.config['SESSION_USE_SIGNER'] = True
app.config['SESSION_REDIS'] = redis.from_url('redis://127.0.0.1:6379')
app.config['SESSION_COOKIE_SECURE'] = True # uses https or not
app.config['SESSION_COOKIE_SAMESITE'] = 'None'
#Connect to Redis
r = redis.Redis(host='localhost', port=6379, decode_responses=True)
#Session ID Generation
def generate_session_id():
    return str(uuid.uuid4())
# Create and initialize the Flask-Session object AFTER `app` has been configured
server_session = Session(app)

# Stripe Integration
os.environ["STRIPE_SECRET_KEY"] = "sk_test_51Qowe4R6XyVnHR5eZpehxe32nBhRjciGkrbojz4gV8DbbqLUtQl0RrfOso2Uc1Uq4G0SQTGSIFKdYuBPussu2Uap00mq5IVAwo"
stripe.api_key = os.getenv("STRIPE_SECRET_KEY")

# MongoDB connection
client = MongoClient('mongodb+srv://dbadmin:Time2add@studentsectiondemo.9mdru.mongodb.net/?retryWrites=true&w=majority&appName=StudentSectionDemo')
ssdb = client['student_section']
schedules_collection = ssdb['schedules']
users_collection = ssdb['users']
tickets_collection = ssdb['tickets']
apilogs_collection = ssdb['apilogs']

# Mock API base URL for Paciolan
# --- Configuration based on Mockoon config ---
MOCK_API_BASE_URL = "http://localhost:3003"
DISTRIBUTOR_CODE = "SS"
USER_AGENT = "StudentSection/v1.0"
PAC_CHANNEL_CODE = "mock.channel.code"
PAC_APP_ID = "application.id"
PAC_API_KEY = "mock.api.key"

MOCK_API_BASE_URL = "http://localhost:3003"

def log_mongo_debug(level: str, message: str, extra: dict = None):
    """
    Insert a debug log into the apilogs collection.
    :param level: e.g. "DEBUG", "INFO", "ERROR"
    :param message: A short log message or summary
    :param extra: Optional dict of additional details
    """
    if extra is None:
        extra = {}
    
    log_entry = {
        "timestamp": datetime.utcnow(),
        "level": level,
        "message": message,
        "extra": extra
    }
    apilogs_collection.insert_one(log_entry)

# Utility function to authenticate with the mock Paciolan API
def get_mock_token():
    print("get_token endpoint was called")
    url = f"{MOCK_API_BASE_URL}/v1/auth/token"
    headers = {
        "Content-Type": "application/json",
        "User-Agent": "MyApplication/1.0",
        "Accept": "application/json",
        "Request-ID": "d4f55f60-1a6d-4a3c-8f36-1f4e4a3a6b6c"
    }
    response = requests.post(url, headers=headers)
    status = 'Success' if response.status_code == 200 else 'Error'
    log_mongo_debug('POST /v1/auth/token', response.status_code, status)
    if response.status_code == 200:
        return response.json().get("accessToken")
    return None

def get_auth_token():
    token = get_mock_token()  # Already defined in your app.py
    return f"Bearer {token}" if token else None

def generate_request_id():
    return str(uuid.uuid4())

def transfer_ticket_initialize(ticket, buyer):
    """
    Initiate the ticket transfer by calling the mock Paciolan transfer endpoint.
    The payload is constructed from the ticket's stored transfer data and buyer details.
    """
    payload = {
        "transferRequests": [
            {
                "Sender": ticket.get("transfer", {}).get("Sender", {}),
                "Recipient": {
                    # Update these fields with actual buyer info if available
                    "phone": buyer.get("phone"),
                    "email": buyer.get("email"),
                    "recipientFirstName": buyer.get("first_name"),
                    "recipientLastName": buyer.get("last_name")
                },
                "Seats": ticket.get("transfer", {}).get("Seats", [])
            }
        ]
    }
    url = f"{MOCK_API_BASE_URL}/v1/tickets/transfer?distributorCode={DISTRIBUTOR_CODE}"
    headers = {
        "User-Agent": USER_AGENT,
        "Authorization": get_auth_token(),
        "PAC-Channel-Code": PAC_CHANNEL_CODE,
        "PAC-Application-ID": PAC_APP_ID,
        "PAC-API-Key": PAC_API_KEY,
        "Request-ID": generate_request_id(),
        "Content-Type": "application/json"
    }
    response = requests.post(url, json=payload, headers=headers)
    if response.status_code == 200:
        data = response.json()
        # Expected fields: transferId and url as defined in the mock response
        return True, data.get("transferId"), data.get("url")
    else:
        # Optionally, log response details for debugging
        return False, None, None

def transfer_ticket_accept(transfer_id):
    """
    Confirm the ticket transfer by calling the mock Paciolan accept endpoint.
    """
    payload = {"transferId": transfer_id}
    url = f"{MOCK_API_BASE_URL}/v1/tickets/transfer/accept?distributorCode={DISTRIBUTOR_CODE}"
    headers = {
        "User-Agent": USER_AGENT,
        "Authorization": get_auth_token(),
        "PAC-Channel-Code": PAC_CHANNEL_CODE,
        "PAC-Application-ID": PAC_APP_ID,
        "PAC-API-Key": PAC_API_KEY,
        "Request-ID": generate_request_id(),
        "Content-Type": "application/json"
    }
    response = requests.post(url, json=payload, headers=headers)
    if response.status_code == 200:
        data = response.json()
        # Expected fields: transferId and confirmationCd from the mock response
        return True, data.get("transferId"), data.get("confirmationCd")
    else:
        return False, None, None

# ------------------------------
# Endpoint: POST /users/register
# Create a new user in MongoDB with email, password, and optional school name.
# If 'School' is missing, None, or an empty string, set it to 'public'.
# Check if the user already exists before creating a new user.
# ------------------------------
@app.route('/users/register', methods=['POST'])
def create_user():
    data = request.get_json()
    
    required_fields = ["email", "password"]
    for field in required_fields:
        if field not in data:
            return jsonify({"error": f"Missing field: {field}"}), 400

    # Add createdAt field
    data['createdAt'] = datetime.now()

    school_value = data.get("School", "").strip()
    if not school_value:  # i.e. school_value is "" or None
        school_value = "public"
    data["School"] = school_value

    if users_collection.find_one({"email": data["email"]}):
        return jsonify({"error": "User already exists"}), 409

    # Hash the password before storing it
    hashed_password = bcrypt.hashpw(data["password"].encode('utf-8'), bcrypt.gensalt())
    data["password"] = hashed_password.decode('utf-8')  # Store as a string

    result = users_collection.insert_one(data)
    
    return jsonify({
        "message": "User created successfully",
        "user_id": str(result.inserted_id)
    }), 201


# ------------------------------
# Endpoint: POST, GET /users/login
# Log in a user by email and password, or get the current user's session data.
# once authenticated, store the user's ID in the Flask session.
# ------------------------------
@app.route('/users/login', methods=['POST', 'GET'])
def login():
    # Check if the user is already logged in
    if 'user_id' in session:
        return jsonify({
            "message": "User already logged in",
            "user_id": session.get("user_id"),
            "email": session.get("email"),
            "school": session.get("school")
        }), 200

    # Proceed with login if no active session
    data = request.get_json()
    email = data.get("email")
    password = data.get("password")

    if not email or not password:
        return jsonify({"error": "Email and password are required"}), 400

    # Look up the user by email
    user = users_collection.find_one({"email": email})
    if not user:
        return jsonify({"error": "Invalid email or password"}), 401

    # Verify the password
    if not bcrypt.checkpw(password.encode('utf-8'), user["password"].encode('utf-8')):
        return jsonify({"error": "Invalid email or password"}), 401

    # Clear any existing sessions for this user
    cursor = 0
    keys = r.scan(cursor=cursor, match="session:*")
    for key in keys[1]:
        session_data = r.get(key)
        if email in session_data:
            r.delete(key)

    # Create a new session
    session['user_id'] = str(user["_id"])
    session['email'] = user["email"]
    session['school'] = user.get("School")

    return jsonify({"message": "Login successful"}), 200

#Pull the new session for later use
def get_user_session(useremail):
    sessions=r.scan(cursor=0, match="session:*")
    for newsession in sessions[1]:
        session_data=r.get(newsession)
        if useremail in session_data:
            return newsession
        

# ------------------------------
# Endpoint: POST /logout
# Clear the session data to log out the user.
# ------------------------------
@app.route('/logout', methods=['POST'])
def logout():
    session.clear()
    return jsonify({"message": "Logged out successfully"}), 200


# ------------------------------
# Endpoint: GET /users/me
# Get the current user's session data, if logged in.
# ------------------------------
@app.route('/users/me', methods=['GET'])
def get_current_user():
    if 'user_id' not in session:
        return jsonify({"error": "Not authenticated"}), 401
    
    return jsonify({
        "user_id": session.get("user_id"),
        "email": session.get("email"),
        "school": session.get("school")
    }), 200


# ------------------------------
# Endpoint: GET /users/<string:user_id>/profile
# Return the user's profile from MongoDB, 
# verifying that the user_id in the URL matches the session user.
# ------------------------------
@app.route('/users/<string:user_id>/profile', methods=['GET'])
def get_profile(user_id):
    if 'user_id' not in session:
        return jsonify({"error": "No session found"}), 401

    session_user_id = session['user_id']

    # If the URL user_id == session user, return the full profile
    if session_user_id == user_id:
        user_doc = users_collection.find_one({"_id": ObjectId(session_user_id)})
        if not user_doc:
            return jsonify({"error": "User not found"}), 404

        user_doc['_id'] = str(user_doc['_id'])
        user_doc.pop('password', None)
        return jsonify({"profile": user_doc}), 200

    else:
        # If the URL user_id != session user, return only email
        user_doc = users_collection.find_one({"_id": ObjectId(user_id)})
        if not user_doc:
            return jsonify({"error": "User not found"}), 404

        # Return only the user’s email
        limited_profile = {"email": user_doc.get("email", None)}
        return jsonify({"profile": limited_profile}), 200


# ------------------------------
# Endpoint: PUT /users/<string:user_id>/profile
# Update user fields in their MongoDB profile, e.g. phone, school_name, etc.
# ------------------------------
@app.route('/users/<string:user_id>/profile', methods=['PUT'])
def update_profile(user_id):
    data = request.get_json()
    # Accept any fields that are safe to update. For example:
    updatable_fields = {"phone", "School", "FirstName", "LastName"}  # etc.
    
    to_update = {}
    for field in updatable_fields:
        if field in data:
            to_update[field] = data[field]

    if not to_update:
        return jsonify({"error": "No valid fields to update"}), 400
    
    result = users_collection.update_one(
        {"_id": ObjectId(user_id)},
        {"$set": to_update}
    )
    
    if result.modified_count == 1:
        return jsonify({"message": "Profile updated successfully"}), 200
    else:
        return jsonify({"error": "No changes or user not found"}), 400


# ------------------------------
# Endpoint: POST /users/<string:user_id>/third_party
# Connect a third-party account to the user's profile, e.g. Paciolan.
# This example assumes the third-party account has a username and password.
# This example also assumes the third-party account has an ID that we need to store.
# ------------------------------
@app.route('/users/<string:user_id>/third_party', methods=['POST'])
def connect_third_party_account(user_id):
    # 1) Confirm session user matches the user_id
    if 'user_id' not in session or session['user_id'] != user_id:
        return jsonify({"error": "Not authenticated"}), 403

    data = request.get_json()
    # Example required fields, adjust as needed
    required_fields = ['userName', 'password']
    for field in required_fields:
        if field not in data:
            return jsonify({"error": f"Missing field: {field}"}), 400

    # 2) Get a mock token
    mock_token = get_mock_token()

    # 3) Build your GET request
    params = {
        'userName': data['userName']
    }
    headers = {
        'Authorization': f'Bearer {mock_token}',
        'PAC-Application-ID': 'application.id',
        'PAC-API-Key': 'applicmock.api.key',
        'PAC-Channel-Code': 'mock.channel.code',
        'PAC-Organization-ID': 'OrganizationID',
        'User-Agent': 'StudentSection/v1.0',
        'Accept': 'application/json'
    }
    if mock_token:
        headers['Authorization'] = f'Bearer {mock_token}'

    # 4) Make the request to the mock route
    response = requests.get("http://localhost:3003/v2/accounts", params=params, headers=headers)
    if response.status_code != 200:
        return jsonify({"error": "Unable to retrieve account from mock."}), 502

    account_data = response.json()

    # 5) Check if we got an account object. In your sample JSON, it's in .get("key", {}).get("id", ...)
    paciolan_id = account_data.get("key", {}).get("id")
    if not paciolan_id:
        return jsonify({"error": "No paciolan_id found in mock response."}), 404

    # 6) Store the third-party account details in MongoDB
    #    e.g. "third_party_account": { "paciolan_id": paciolan_id, "userName": data["userName"] }
    users_collection.update_one(
        {"_id": ObjectId(user_id)},
        {"$set": {
            "third_party_account": {
                "paciolan_id": paciolan_id,
                "userName": data["userName"]
            }
        }}
    )

    return jsonify({
        "message": "Third-party account connected successfully.",
        "paciolan_id": paciolan_id
    }), 200


# ------------------------------
# Endpoint: POST /tickets
# Create a ticket listing using schedule event details.
# This code ensures that if the school_name is 'University of Cincinnati', we confirm
# the requested event truly exists in the mock Paciolan system, and only then create
# the ticket doc with proper 'transfer' info.
# ------------------------------
@app.route('/tickets', methods=['POST'])
def post_ticket():
    if 'user_id' not in session:
        return jsonify({"error": "Not authenticated"}), 401
    
    user_id = session['user_id']
    user_doc = users_collection.find_one({"_id": ObjectId(user_id)})

    data = request.get_json() or {}

    # Basic validation
    required_fields = ['event_name', 'event_date', 'venue', 'price']
    for field in required_fields:
        if field not in data:
            return jsonify({"error": f"Missing field: {field}"}), 400

    # event_date as ISO8601
    try:
        event_date_dt = datetime.fromisoformat(data['event_date'])
    except (ValueError, TypeError):
        return jsonify({"error": "Invalid event_date format; must be ISO-8601"}), 400

    school_name = (data.get("school_name") or "").strip()
    if not school_name:
        school_name = "public"

    ticket_doc = None

    # ------------- Fuzzy matching block -------------
    if school_name.lower() == "university of cincinnati":
        # user must have a Paciolan ID
        paciolan_id = user_doc.get("third_party_account", {}).get("paciolan_id")
        if not paciolan_id:
            return jsonify({"error": "User does not have a linked UC account"}), 400

        token = get_mock_token()
        if not token:
            return jsonify({"error": "Unable to retrieve mock token"}), 500

        # Do fuzzy match using the user-provided event_name, event_date, and venue.
        matched_event = fuzzy_match_event(
            frontend_name=data["event_name"],
            frontend_venue=data["venue"],
            frontend_datetime=data["event_date"],
            paciolan_id=paciolan_id,
            token= f"Bearer {token}" # Use the token from get_mock_token()
        )
        if not matched_event:
            return jsonify({"error": "Unable to find Paciolan event that matches those details"}), 404

        # If matched_event is found, we proceed. 
        # For demonstration, let's say matched_event has "id" and "facility," etc.
        # We can also do a separate retrieval with matched_event["id"] if needed.

        # Example placeholder for seat info doc:
        seat_info_doc = {
            "level":  "Unknown",
            "section": "Unknown",
            "row":     0,
            "seats":   1,
            "soldFor": 0,
            "marketplace": "store"
        }

        # Build your final ticket doc
        ticket_doc = {
            "seller_id": ObjectId(user_id),
            "school_name": school_name,
            "event_name": data["event_name"],
            "event_date": event_date_dt,
            "venue": data["venue"],
            "price": data["price"],
            "currency": data.get("currency", "USD"),
            "status": "available",
            "is_transferrable": True,
            "created_at": datetime.utcnow(),
            "transfer": {
                "Sender": {
                    "patronId": paciolan_id
                },
                "Seats": [
                    {
                        "season": "TODO_SEASON_CODE",
                        "event":  matched_event.get("id", "Unknown"),
                        "priceLevel": "1",
                        "priceType": "A",
                        "seatInfo": seat_info_doc
                    }
                ]
            }
        }

    else:
        # Non-UC tickets => skip the fuzzy match logic
        ticket_doc = {
            "seller_id": ObjectId(user_id),
            "school_name": school_name,
            "event_name": data["event_name"],
            "event_date": event_date_dt,
            "venue": data["venue"],
            "price": data["price"],
            "currency": data.get("currency", "USD"),
            "status": "available",
            "is_transferrable": True,
            "created_at": datetime.utcnow(),
            "transfer": None
        }

    # Insert
    result = tickets_collection.insert_one(ticket_doc)

    return jsonify({
        "message": "Ticket created successfully",
        "ticket_id": str(result.inserted_id),
    }), 201


# ------------------------------
# Endpoint: GET /tickets
# List all available ticket listings (public endpoint)
# ------------------------------
@app.route('/tickets/mine', methods=['GET'])
def get_my_tickets():
    """
    Returns a list of the logged-in user's tickets from MongoDB.
    Uses session-based authentication.
    """
    if 'user_id' not in session:
        return jsonify({"error": "Not authenticated"}), 401

    user_id = session['user_id']
    # Query all tickets where seller_id matches the user's ObjectId
    tickets_cursor = tickets_collection.find({"seller_id": ObjectId(user_id)})

    # Convert the cursor into a list of dictionaries we can JSON-ify
    user_tickets = []
    for doc in tickets_cursor:
        # Convert ObjectIds or datetimes to strings if desired
        doc['_id'] = str(doc['_id'])
        doc['seller_id'] = str(doc['seller_id'])
        if 'created_at' in doc and isinstance(doc['created_at'], datetime):
            doc['created_at'] = doc['created_at'].isoformat()
        # same for event_date if it’s a datetime
        if 'event_date' in doc and isinstance(doc['event_date'], datetime):
            doc['event_date'] = doc['event_date'].isoformat()

        user_tickets.append(doc)

    return jsonify({"tickets": user_tickets}), 200


# ------------------------------
# Endpoint: GET /tickets
# List all available ticket listings (public endpoint)
# ------------------------------
@app.route('/tickets', methods=['GET'])
def list_tickets():
    tickets_cursor = tickets_collection.find({"status": "available"})
    tickets = []
    for t in tickets_cursor:
        ticket = {
            "ticket_id": str(t["_id"]),
            "seller_id": str(t["seller_id"]),
            "school_name": t.get("school_name", ""),
            "event_code": t.get("event_code", ""),
            "event_name": t.get("event_name", ""),
            "event_date": t["event_date"].isoformat() if "event_date" in t else "",
            "venue": t.get("venue", ""),
            "section": t.get("section", ""),
            "row": t.get("row", ""),
            "seat": t.get("seat", ""),
            "level": t.get("level", ""),
            "price": t.get("price", 0),
            "currency": t.get("currency", "USD")
        }
        tickets.append(ticket)
    return jsonify({"tickets": tickets}), 200


# ------------------------------
# Endpoint: POST /tickets/<ticket_id>/purchase
# Purchase a ticket – marks the ticket as pending and calls the transfer initialization endpoint.
# ------------------------------
@app.route('/tickets/<ticket_id>/purchase', methods=['POST'])
def purchase_ticket(ticket_id):
    if 'user_id' not in session:
        return jsonify({"error": "Not authenticated"}), 401

    buyer_id = session['user_id']
    ticket = tickets_collection.find_one({"_id": ObjectId(ticket_id)})
    if not ticket:
        return jsonify({"error": "Ticket not found"}), 404
    if ticket.get("status") != "available":
        return jsonify({"error": "Ticket is not available"}), 400
    if str(ticket.get("seller_id")) == buyer_id:
        return jsonify({"error": "Cannot purchase your own ticket"}), 400

    # Mark the ticket as pending to prevent a double sale
    update_result = tickets_collection.update_one(
        {"_id": ObjectId(ticket_id), "status": "available"},
        {"$set": {
            "status": "pending",
            "buyer_id": ObjectId(buyer_id)
        }}
    )
    if update_result.modified_count != 1:
        return jsonify({"error": "Ticket purchase could not be initiated; ticket may have been updated"}), 409

    # Dummy buyer details; replace with real data from your user profile if available.
    buyer = {
        "email": "buyer@example.com",
        "first_name": "BuyerFirstName",
        "last_name": "BuyerLastName",
        "phone": None
    }
    success, transfer_id, transfer_url = transfer_ticket_initialize(ticket, buyer)
    if not success:
        return jsonify({"error": "Ticket transfer initialization failed"}), 500

    # Save the transfer details in the ticket document
    tickets_collection.update_one(
        {"_id": ObjectId(ticket_id)},
        {"$set": {
            "transfer.transferId": transfer_id,
            "transfer.url": transfer_url
        }}
    )
    return jsonify({"message": "Ticket purchase initiated", "transferUrl": transfer_url})

# ------------------------------
# Endpoint: POST /tickets/<ticket_id>/purchase/confirm
# Confirm a ticket purchase by accepting the transfer via the mock Paciolan API.
# ------------------------------
@app.route('/tickets/<ticket_id>/purchase/confirm', methods=['POST'])
def confirm_ticket_purchase(ticket_id):
    if 'user_id' not in session:
        return jsonify({"error": "Not authenticated"}), 401

    user_id = session['user_id']
    ticket = tickets_collection.find_one({"_id": ObjectId(ticket_id)})
    if not ticket:
        return jsonify({"error": "Ticket not found"}), 404
    if ticket.get("status") != "pending":
        return jsonify({"error": "Ticket is not pending"}), 400
    if str(ticket.get("seller_id")) != user_id:
        return jsonify({"error": "Ticket is not pending for this user"}), 400

    transfer_info = ticket.get("transfer", {})
    transfer_id = transfer_info.get("transferId")
    if not transfer_id:
        return jsonify({"error": "No transfer information found"}), 400

    success, confirmed_transfer_id, confirmationCd = transfer_ticket_accept(transfer_id)
    if not success:
        return jsonify({"error": "Ticket transfer confirmation failed"}), 500

    # Update ticket status to 'sold' and record the confirmation code
    finalize_result = tickets_collection.update_one(
        {"_id": ObjectId(ticket_id), "status": "pending"},
        {"$set": {
            "status": "sold",
            "transfer.confirmationCd": confirmationCd
        }}
    )
    if finalize_result.modified_count != 1:
        return jsonify({"error": "Ticket purchase could not be finalized; ticket may have been updated"}), 409

    return jsonify({"message": "Ticket purchase confirmed", "confirmationCd": confirmationCd})


# ------------------------------
# Endpoint: POST /schedule/upload
# Upload a schedule from an HTML file, a URL, or a manually created schedule.
# Ensures that year and event_type are present; school_name is now optional (Defaults to "Public").
# ------------------------------
@app.route('/schedule/upload', methods=['POST'])
def upload_schedule():
    log_mongo_debug(
        level="INFO",
        message="upload_schedule endpoint invoked",
        extra={"method": request.method, "has_file": 'file' in request.files}
    )

    data = request.get_json()
    schedule_data = None

    try:
        # 1) Check for file upload
        if 'file' in request.files:
            file = request.files['file']
            if file.filename == '':
                log_mongo_debug(
                    level="ERROR",
                    message="No file selected",
                    extra={"file.filename": file.filename}
                )
                return jsonify({"error": "No file selected"}), 400

            if file and file.filename.endswith('.html'):
                html_content = file.read().decode('utf-8')
                schedule_data = parse_html_schedule(html_content)
                log_mongo_debug(
                    level="DEBUG",
                    message="Parsed HTML schedule from uploaded file",
                    extra={"filename": file.filename}
                )
            else:
                log_mongo_debug(
                    level="ERROR",
                    message="Invalid file type. Only .html files are allowed",
                    extra={"filename": file.filename}
                )
                return jsonify({"error": "Invalid file type. Only .html files are allowed"}), 400

        # 2) Check for URL
        elif 'url' in data:
            schedule_url = data['url']
            headers = {"User-Agent": "Mozilla/5.0"}
            response = requests.get(schedule_url, headers=headers)
            if response.status_code != 200:
                log_mongo_debug(
                    level="ERROR",
                    message="Failed to fetch schedule from URL",
                    extra={"url": schedule_url, "status_code": response.status_code}
                )
                return jsonify({"error": "Failed to fetch schedule from URL"}), 400

            html_content = response.text
            schedule_data = parse_html_schedule(html_content)
            log_mongo_debug(
                level="DEBUG",
                message="Parsed HTML schedule from URL",
                extra={"url": schedule_url}
            )

        # 3) Check for custom_schedule (manual HTML)
        elif 'custom_schedule' in data:
            raw_html = data['custom_schedule']
            schedule_data = parse_html_schedule(raw_html)
            log_mongo_debug(
                level="DEBUG",
                message="Parsed HTML schedule from custom_schedule",
                extra={"length_of_html": len(raw_html)}
            )

        # If still no schedule_data, return error
        if not schedule_data:
            log_mongo_debug(
                level="ERROR",
                message="Failed to parse or retrieve schedule",
                extra={"request_data": data}
            )
            return jsonify({"error": "Failed to parse or retrieve schedule"}), 400

        # Extract top-level fields
        school_name = schedule_data.get("school_name", "")  # Now optional
        year = schedule_data.get("year", "")
        event_type = schedule_data.get("event_type")

        # If event_type wasn't found, maybe it's in the first game's data
        if not event_type and schedule_data.get("games"):
            event_type = schedule_data["games"][0].get("event_type", "")

        # Check for missing required fields (remove school_name from this check)
        missing_fields = []
        if not year:
            missing_fields.append("year")
        if not event_type:
            missing_fields.append("event_type")

        if missing_fields:
            log_mongo_debug(
                level="INFO",
                message="Missing required fields for schedule",
                extra={"missing_fields": missing_fields}
            )
            return jsonify({
                "error": "Missing required fields",
                "missing_fields": missing_fields,
                "schedule_data": schedule_data
            }), 400

        # Store event_type at the schedule level
        schedule_data["event_type"] = event_type

        # Date parsing logic (still uses year)
        current_year = int(year)
        previous_dt = None

        for game in schedule_data.get("games", []):
            raw_date = game.get("date", "")
            if raw_date:
                # Remove any day-of-week info, e.g. "(Fri)"
                clean_date = re.sub(r'\s*\(.*\)', '', raw_date).strip()
                try:
                    dt = datetime.strptime(f"{clean_date} {current_year}", "%b %d %Y")
                    # If this date’s month is less than a previous date’s month, assume rollover to next year
                    if previous_dt and dt.month < previous_dt.month:
                        current_year += 1
                        dt = datetime.strptime(f"{clean_date} {current_year}", "%b %d %Y")
                except Exception as e:
                    log_mongo_debug(
                        level="ERROR",
                        message="Failed to parse game date",
                        extra={"raw_date": raw_date, "error": str(e)}
                    )
                    return jsonify({"error": f"Failed to parse game date '{raw_date}': {str(e)}"}), 400

                game["date"] = dt.strftime("%m/%d/%Y")
                previous_dt = dt

            # Remove event_type from individual games
            if "event_type" in game:
                game.pop("event_type")

        schedule_data["last_updated"] = datetime.utcnow()

        # Upsert logic: Check if an existing schedule with the same (school_name, event_type) pair exists
        # (If school_name is blank, that’s okay; it just means they’re “public” or unknown school events.)
        existing_schedule = schedules_collection.find_one(
            {"school_name": school_name, "event_type": event_type}
        )

        if existing_schedule:
            schedules_collection.update_one(
                {"school_name": school_name, "event_type": event_type},
                {"$set": schedule_data}
            )
            log_mongo_debug(
                level="INFO",
                message="Schedule updated successfully in MongoDB",
                extra={"school_name": school_name, "event_type": event_type}
            )
            return jsonify({"message": "Schedule updated successfully"}), 200
        else:
            schedules_collection.insert_one(schedule_data)
            log_mongo_debug(
                level="INFO",
                message="Schedule uploaded successfully into MongoDB",
                extra={"school_name": school_name, "event_type": event_type}
            )
            return jsonify({"message": "Schedule uploaded successfully"}), 201

    except Exception as e:
        log_mongo_debug(
            level="ERROR",
            message="Unhandled exception in upload_schedule",
            extra={"error": str(e)}
        )
        return jsonify({"error": "An unexpected error occurred"}), 500

# ------------------------------
# Endpoint: GET /schedule/all
# Retrieve all schedules grouped by school, returning "public" schedules for everyone,
# and also the user's school (if logged in).
# ------------------------------
@app.route('/schedule/all', methods=['GET'])
def retrieve_all_schedules():
    try:
        # If the user is logged in, session['school'] is set
        user_school = session.get("school")

        # By default, show only 'public' schedules
        allowed_schools = ["public"]

        # If user_school is set and not 'public', include it
        if user_school and user_school.lower() != "public":
            allowed_schools.append(user_school)

        # 1) Create a match stage that includes only these schools
        match_stage = {
            "$match": {
                "school_name": {"$in": allowed_schools}
            }
        }

        # 2) Group by school_name
        group_stage = {
            "$group": {
                "_id": "$school_name",
                "events": {
                    "$push": {
                        "year": "$year",
                        "event_type": "$event_type",
                        "games": "$games"
                    }
                }
            }
        }

        pipeline = [match_stage, group_stage]
        schedules = list(schedules_collection.aggregate(pipeline))

        if not schedules:
            return jsonify({"message": "No schedules found"}), 404

        return jsonify({"schedules": schedules}), 200

    except Exception as e:
        return jsonify({"error": f"Failed to retrieve schedule data: {str(e)}"}), 500


# ------------------------------
# Endpoint: GET /schedule/retrieve
# Retrieve schedules based on filters: school name and event type,
# but always includes "public" schedules plus the user's own school if logged in.
# ------------------------------
@app.route('/schedule/retrieve', methods=['GET'])
def retrieve_schedule():
    try:
        user_school = session.get("school")
        allowed_schools = ["public"]
        if user_school and user_school.lower() != "public":
            allowed_schools.append(user_school)

        # Build the base query to match only the allowed schools
        query = {"school_name": {"$in": allowed_schools}}

        # If user supplies a 'school_name' query param, refine the match
        # (still must also be in allowed_schools)
        school_name_param = request.args.get('school_name')
        if school_name_param:
            # combine $in with regex:
            query["school_name"] = {
                "$in": allowed_schools,
                "$regex": school_name_param,
                "$options": "i"
            }

        event_type = request.args.get('event_type')
        if event_type:
            query["event_type"] = {"$regex": event_type, "$options": "i"}

        schedules = list(schedules_collection.find(query, {"_id": 0}))

        if not schedules:
            return jsonify({"message": "No matching schedules found"}), 404

        return jsonify({"schedules": schedules}), 200

    except Exception as e:
        return jsonify({"error": f"Failed to retrieve schedule data: {str(e)}"}), 500

if __name__ == '__main__':
    with app.app_context():
        app.run(debug=True)
