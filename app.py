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

@app.route('/users/register', methods=['POST'])
def create_user():
    data = request.get_json()
    
    # Minimal required fields
    required_fields = ["email", "password"]
    for field in required_fields:
        if field not in data:
            return jsonify({"error": f"Missing field: {field}"}), 400

    # Add createdAt field
    data['createdAt'] = datetime.now()

    # If 'School' is missing, None, or an empty string, set it to 'public'
    school_value = data.get("School", "").strip()
    if not school_value:  # i.e. school_value is "" or None
        school_value = "public"
    data["School"] = school_value

    # Check if user already exists
    if users_collection.find_one({"email": data["email"]}):
        return jsonify({"error": "User already exists"}), 409

    result = users_collection.insert_one(data)
    
    return jsonify({
        "message": "User created successfully",
        "user_id": str(result.inserted_id)
    }), 201

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

@app.route('/logout', methods=['POST'])
def logout():
    session.clear()
    return jsonify({"message": "Logged out successfully"}), 200

@app.route('/users/me', methods=['GET'])
def get_current_user():
    if 'user_id' not in session:
        return jsonify({"error": "Not logged in"}), 401
    
    return jsonify({
        "user_id": session.get("user_id"),
        "email": session.get("email"),
        "school": session.get("school")
    }), 200

@app.route('/users/<string:user_id>/profile', methods=['GET'])
def get_profile(user_id):
    """
    Return the user's profile from MongoDB, 
    verifying that the user_id in the URL matches the session user.
    """

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


@app.route('/users/<string:user_id>/profile', methods=['PUT'])
def update_profile(user_id):
    """
    Update user fields in their MongoDB profile, e.g. phone, school_name, etc.
    """
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
# # Endpoint to retrieve and store tickets for a user
# @app.route('/tickets/list', methods=['POST'])
# def list_tickets():
#     print("list_tickets endpoint was called")
#     user_id = request.json.get("user_id")
#     season_code = request.json.get("season_code")

#     user = User.query.get(user_id)
#     if not user:
#         return jsonify({"error": "User not found"}), 404

#     # Authenticate with the mock API to get the token
#     token = get_mock_token()
#     if not token:
#         return jsonify({"error": "Unable to authenticate with mock Paciolan API"}), 500

#     # Get tickets for the user from the mock API
#     url = f"{MOCK_API_BASE_URL}/v2/patron/{user.paciolan_account_id}/orders/{season_code}"
#     headers = {
#         "Authorization": "MockAccessToken12345",
#         "PAC-Application-ID": "application.id",
#         "PAC-API-Key": "mock.api.key",
#         "PAC-Channel-Code": "mock.channel.code",
#         "PAC-Organization-ID": "OrganizationID",
#         "User-Agent": "StudentSection/v1.0",
#         "Accept": "application/json"
#     }
#     response = requests.get(url, headers=headers)
#     status = 'Success' if response.status_code == 200 else 'Error'
#     log_api_interaction(f'GET {url}', response.status_code, status)

#     if response.status_code != 200:
#         return jsonify({"error": "Failed to retrieve tickets"}), response.status_code

#     response_data = response.json()
#     tickets_data = response_data.get("orderLineItems", [])

#     for ticket_data in tickets_data:
#         event_item = ticket_data.get("item", {})
#         event_code = event_item.get("code", "Unknown Event")
#         event_name = event_item.get("name", "Unknown Event Name")
#         season = response_data.get("season", {})
#         season_code = season.get("code", "Unknown Season")

#         events = ticket_data.get("events", [])
#         for event in events:
#             is_transferrable = event.get("isTransferrable", False)
#             price = event.get("price", 0.0)
#             seats = event.get("seats", [])
#             for seat in seats:
#                 section = seat.get("section", "Unknown Section")
#                 row = seat.get("row", "Unknown Row")
#                 seat_number = seat.get("seat", "Unknown Seat")
#                 barcode = seat.get("barcode")

#                 # Check if the ticket already exists to avoid duplicates
#                 existing_ticket = Ticket.query.filter_by(
#                     event_code=event_code,
#                     section=section,
#                     row=row,
#                     seat_number=seat_number,
#                     owner_id=user_id
#                 ).first()

#                 if not existing_ticket:
#                     new_ticket = Ticket(
#                         event_code=event_code,
#                         event_name=event_name,
#                         season_code=season_code,
#                         section=section,
#                         row=row,
#                         seat_number=seat_number,
#                         barcode=barcode,
#                         price=price,
#                         is_transferrable=is_transferrable,
#                         owner_id=user_id
#                     )
#                     db.session.add(new_ticket)

#     db.session.commit()
#     return jsonify({"message": "Tickets listed successfully"}), 201

# # Endpoint to get tickets for a user
# @app.route('/users/<int:user_id>/tickets', methods=['GET'])
# def get_user_tickets(user_id):
#     user = User.query.get(user_id)
#     if not user:
#         return jsonify({"error": "User not found"}), 404

#     tickets = Ticket.query.filter_by(owner_id=user_id).all()
#     tickets_list = []
#     for ticket in tickets:
#         tickets_list.append({
#             "ticket_id": ticket.ticket_id,
#             "event_name": ticket.event_name,
#             "section": ticket.section,
#             "row": ticket.row,
#             "seat_number": ticket.seat_number,
#             "price": ticket.price,
#             "is_listed": ticket.is_listed
#         })
#     return jsonify({"tickets": tickets_list}), 200

# # Endpoint to get user by email
# @app.route('/users/email/<string:email>', methods=['GET'])
# def get_user_by_email(email):
#     user = User.query.filter_by(email=email).first()
#     if not user:
#         return jsonify({"error": "User not found"}), 404

#     return jsonify({
#         "user_id": user.user_id,
#         "first_name": user.first_name,
#         "last_name": user.last_name
#     }), 200

# # Endpoint to create a ticket listing
# @app.route('/listings/create', methods=['POST'])
# def create_listing():
#     ticket_id = request.json.get('ticket_id')
#     seller_id = request.json.get('seller_id')
#     price = request.json.get('price')

#     # Retrieve the ticket and seller
#     ticket = Ticket.query.get(ticket_id)
#     if not ticket:
#         return jsonify({'error': 'Ticket not found'}), 404

#     if ticket.owner_id != seller_id:
#         return jsonify({'error': 'You do not own this ticket'}), 403

#     if ticket.is_listed:
#         return jsonify({'error': 'Ticket is already listed'}), 400

#     # Create the listing
#     new_listing = Listing(
#         ticket_id=ticket_id,
#         seller_id=seller_id,
#         price=price,
#         status='Available'
#     )
#     ticket.is_listed = True  # Update ticket status
#     db.session.add(new_listing)
#     db.session.commit()

#     return jsonify({'message': 'Ticket listed for sale successfully', 'listing_id': new_listing.listing_id}), 201

# # Endpoint to get all available listings
# @app.route('/listings', methods=['GET'])
# def get_listings():
#     listings = Listing.query.filter_by(status='Available').all()
#     listings_data = []

#     for listing in listings:
#         ticket = Ticket.query.get(listing.ticket_id)
#         seller = User.query.get(listing.seller_id)
#         listings_data.append({
#             'listing_id': listing.listing_id,
#             'ticket_id': ticket.ticket_id,
#             'event_name': ticket.event_name,
#             'section': ticket.section,
#             'row': ticket.row,
#             'seat_number': ticket.seat_number,
#             'price': listing.price,
#             'seller_name': f"{seller.first_name} {seller.last_name}"
#         })

#     return jsonify({'listings': listings_data}), 200

# # Endpoint to purchase a ticket
# @app.route('/transactions/purchase', methods=['POST'])
# def purchase_ticket():
#     listing_id = request.json.get('listing_id')
#     buyer_id = request.json.get('buyer_id')

#     # Retrieve listing, ticket, seller, and buyer
#     listing = Listing.query.get(listing_id)
#     if not listing or listing.status != 'Available':
#         return jsonify({'error': 'Listing not available'}), 404

#     ticket = Ticket.query.get(listing.ticket_id)
#     seller = User.query.get(listing.seller_id)
#     buyer = User.query.get(buyer_id)
#     if not buyer:
#         return jsonify({'error': 'Buyer not found'}), 404

#     resale_price = listing.price

#     # Authenticate with the mock API to get the token
#     token = get_mock_token()
#     if not token:
#         return jsonify({"error": "Unable to authenticate with mock Paciolan API"}), 500

#     # Simulate transfer initiation with mock API
#     url = f"{MOCK_API_BASE_URL}/v1/tickets/transfer"
#     headers = {
#         "Authorization": "MockAccessToken12345",
#         "PAC-Application-ID": "application.id",
#         "PAC-API-Key": "mock.api.key",
#         "PAC-Channel-Code": "mock.channel.code",
#         "PAC-Organization-ID": "OrganizationID",
#         "User-Agent": "StudentSection/v1.0",
#         "Accept": "application/json",
#         "Content-Type": "application/json"
#     }
#     data = {
#         "fromPatronId": seller.paciolan_account_id,
#         "toPatronId": buyer.paciolan_account_id,
#         "ticketIds": [ticket.barcode],
#         "recipientEmail": buyer.email
#     }
#     response = requests.post(url, headers=headers, json=data)
#     status = 'Success' if response.status_code == 200 else 'Error'
#     log_api_interaction(f'POST {url}', response.status_code, status)

#     if response.status_code == 200:
#         transfer_data = response.json()
#         new_transaction = Transaction(
#             ticket_id=ticket.ticket_id,
#             seller_id=seller.user_id,
#             buyer_id=buyer.user_id,
#             resale_price=resale_price,
#             transaction_amount=resale_price,
#             recipient_email=buyer.email,
#             transfer_id_api=transfer_data.get("transferId"),
#             transfer_url=transfer_data.get("url"),
#             transaction_status="Completed",
#             transfer_status="Accepted"
#         )
#         db.session.add(new_transaction)

#         # Update ticket ownership and listing status
#         ticket.owner_id = buyer.user_id
#         ticket.is_listed = False
#         listing.status = 'Sold'
#         db.session.commit()

#         return jsonify({
#             "message": "Purchase successful, transfer completed",
#             "transaction_id": new_transaction.transaction_id
#         }), 201
#     else:
#         return jsonify({"error": "Failed to initiate transfer", "details": response.text}), response.status_code

# # Endpoint to get user information
# @app.route('/users/<int:user_id>', methods=['GET'])
# def get_user(user_id):
#     user = User.query.get(user_id)
#     if not user:
#         return jsonify({"error": "User not found"}), 404

#     return jsonify({
#         "user_id": user.user_id,
#         "first_name": user.first_name,
#         "last_name": user.last_name,
#         "email": user.email,
#         "paciolan_account_id": user.paciolan_account_id
#     }), 200

# @app.route('/listings/delete', methods=['DELETE'])
# def delete_listing():
#     ticket_id = request.json.get('ticket_id')
#     user_id = request.json.get('user_id')  # Ensure the user owns the ticket

#     # Retrieve the listing and ticket
#     listing = Listing.query.filter_by(ticket_id=ticket_id).first()
#     ticket = Ticket.query.get(ticket_id)

#     if not ticket or not listing:
#         return jsonify({'error': 'Listing or ticket not found'}), 404

#     if ticket.owner_id != user_id:
#         return jsonify({'error': 'Unauthorized action'}), 403

#     # Delete the listing and update the ticket status
#     db.session.delete(listing)
#     ticket.is_listed = False
#     db.session.commit()

#     return jsonify({'message': 'Listing deleted successfully'}), 200

@app.route('/schedule/upload', methods=['POST'])
def upload_schedule():
    """
    Handles schedule upload from an HTML file, a URL, or a manually created schedule.
    Ensures that year and event_type are present; school_name is now optional.
    """

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

@app.route('/schedule/all', methods=['GET'])
def retrieve_all_schedules():
    """
    Retrieves all schedules grouped by school, returning "public" schedules for everyone,
    and also the user's school (if logged in).
    """
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

@app.route('/schedule/retrieve', methods=['GET'])
def retrieve_schedule():
    """
    Retrieves schedules based on filters: school name and event type,
    but always includes "public" schedules plus the user's own school if logged in.
    """
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