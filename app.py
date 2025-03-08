from flask import Flask, request, jsonify, session, redirect, url_for
from flask_session import Session
from datetime import datetime
import re
import os
import uuid
import requests
import redis
import stripe
from flask_cors import CORS
from pymongo import MongoClient
from pymongo import UpdateOne
from bson import ObjectId
from datetime import timedelta
from schedule_parser import parse_html_schedule

app = Flask(__name__)
app.config['SESSION_COOKIE_SAMESITE'] = 'None'
app.config['SESSION_COOKIE_SECURE'] = False  # if you're on HTTP in dev
CORS(app, supports_credentials=True)

#Redis Integration - Secret Key
app.secret_key = os.getenv('SECRET_KEY', default='BAD_SECRET_KEY')
# Configure Redis for storing the session data on the server-side
app.config['SESSION_TYPE'] = 'redis'
app.config['SESSION_PERMANENT'] = True
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
os.environ["STRIPE_SECRET_KEY"] = "pk_test_51QonQAJa1VtbThKgAwsAb8RRx5Pi9tIv2C2bpCKk26eJjYdk912HoJDSZshm2iAlVN3G6Gr8hptknMINp27sob2E00BTXIUauL"
stripe.api_key = os.getenv("STRIPE_SECRET_KEY")

# MongoDB connection
client = MongoClient('mongodb+srv://dbadmin:Time2add@studentsectiondemo.9mdru.mongodb.net/?retryWrites=true&w=majority&appName=StudentSectionDemo')
ssdb = client['student_section']
schedules_collection = ssdb['schedules']
users_collection = ssdb['users']
tickets_collection = ssdb['tickets']
apilogs_collection = ssdb['apilogs']

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
    data = request.get_json()
    email = data.get("email")
    password = data.get("password")
    #Define Session Variables
    global sessionid
    global username

    if not email or not password:
        return jsonify({"error": "Email and password are required"}), 400

    # Look up the user by email and password (iIMPLEMENT COMPARING HASHED PASSWORDS)
    user = users_collection.find_one({"email": email, "password": password})
    
    if not user:
        return jsonify({"error": "Invalid email or password"}), 401

    # Once authenticated:
    session['user_id'] = str(user["_id"])
    session['email']   = user["email"]
    session['school']  = user.get("School")

    return jsonify({"message": "Login successful"}), 200


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
        return jsonify({"error": "Not logged in"}), 401
    
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
    # 1) Check if user_id is in the Flask session:
    if 'user_id' not in session:
        return jsonify({"error": "No session found"}), 401

    session_user_id = session['user_id']
    if session_user_id != user_id:
        return jsonify({"error": "Unauthorized - cannot view another user's profile"}), 403

    # 2) Lookup user by session_user_id in MongoDB
    user_doc = users_collection.find_one({"_id": ObjectId(session_user_id)})
    if not user_doc:
        return jsonify({"error": "User not found"}), 404

    # 3) Clean up sensitive fields
    user_doc['_id'] = str(user_doc['_id'])
    user_doc.pop('password', None)

    return jsonify({"profile": user_doc}), 200


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
# Endpoint: POST /tickets
# Create a ticket listing using schedule event details.
# ------------------------------
@app.route('/tickets', methods=['POST'])
def post_ticket():
    if 'user_id' not in session:
        return jsonify({"error": "Not authenticated"}), 401

    data = request.get_json()

    # Ensure required fields are provided from the schedule event and user input.
    required_fields = ['event_name', 'event_date', 'venue', 'price']
    for field in required_fields:
        if field not in data:
            return jsonify({"error": f"Missing field: {field}"}), 400

    try:
        # Expect event_date as ISO string (e.g., "2025-04-08T08:00:00")
        event_date = datetime.fromisoformat(data['event_date'])
    except Exception as e:
        return jsonify({"error": "Invalid event_date format"}), 400

    # For school_name, if the schedule event is public we use "public" or the user's school if set.
    school_name = "public"
    if session.get("school"):
        school_name = session["school"]

    ticket_doc = {
        "seller_id": ObjectId(session['user_id']),
        "school_name": school_name,
        "event_name": data.get("event_name", ""),
        "event_date": event_date,
        "venue": data.get("venue", ""),
        "price": data['price'],
        "currency": data.get("currency", "USD"),
        "status": "available",
        "is_transferrable": True,
        "created_at": datetime.utcnow()
    }

    result = tickets_collection.insert_one(ticket_doc)
    return jsonify({
        "message": "Ticket listed successfully",
        "ticket_id": str(result.inserted_id)
    }), 201


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
# Purchase a ticket – places a Stripe hold and (via placeholder) transfers the ticket.
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

    try:
        # Convert ticket price to cents (Stripe uses the smallest currency unit)
        amount = int(float(ticket["price"]) * 100)
        payment_intent = stripe.PaymentIntent.create(
            amount=amount,
            currency=ticket.get("currency", "usd"),
            capture_method="manual",  # Use manual capture for hold mechanism
            metadata={
                "ticket_id": ticket_id,
                "seller_id": str(ticket.get("seller_id")),
                "buyer_id": buyer_id
            }
        )
    except Exception as e:
        return jsonify({"error": "Stripe PaymentIntent creation failed", "details": str(e)}), 500

    # Mark the ticket as pending to prevent double-sale and record the buyer and payment intent
    update_result = tickets_collection.update_one(
        {"_id": ObjectId(ticket_id), "status": "available"},
        {"$set": {
            "status": "pending",
            "buyer_id": ObjectId(buyer_id),
            "payment_intent_id": payment_intent.id
        }}
    )
    if update_result.modified_count != 1:
        return jsonify({"error": "Ticket purchase could not be initiated; ticket may have been updated"}), 409

    # Placeholder: simulate ticket transfer via Paciolan
    def transfer_ticket_placeholder(ticket):
        # Future integration: call the Paciolan API to transfer the ticket
        # For now, assume success and return dummy values.
        return True, "dummy_transfer_id", "dummy_transfer_url"

    success, transfer_id, transfer_url = transfer_ticket_placeholder(ticket)
    if not success:
        stripe.PaymentIntent.cancel(payment_intent.id)
        tickets_collection.update_one(
            {"_id": ObjectId(ticket_id)},
            {"$set": {"status": "available"}, "$unset": {"buyer_id": "", "payment_intent_id": ""}}
        )
        return jsonify({"error": "Ticket transfer failed via Paciolan"}), 500

    # Capture the payment (finalize the hold)
    try:
        stripe.PaymentIntent.capture(payment_intent.id)
    except Exception as e:
        stripe.PaymentIntent.cancel(payment_intent.id)
        tickets_collection.update_one(
            {"_id": ObjectId(ticket_id)},
            {"$set": {"status": "available"}, "$unset": {"buyer_id": "", "payment_intent_id": ""}}
        )
        return jsonify({"error": "Failed to capture payment", "details": str(e)}), 500

    # Update ticket as sold and save transfer info
    tickets_collection.update_one(
        {"_id": ObjectId(ticket_id)},
        {"$set": {
            "status": "sold",
            "transfer_id": transfer_id,
            "transfer_url": transfer_url
        }}
    )
    return jsonify({"message": "Purchase successful, ticket transferred", "ticket_id": ticket_id}), 200


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