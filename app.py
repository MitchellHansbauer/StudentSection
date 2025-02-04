from flask import Flask, request, jsonify
from models import db, User, Ticket, Listing, Transaction, APILog
from datetime import datetime
import requests
from flask_cors import CORS
from pymongo import MongoClient
from schedule_parser import parse_html_schedule

app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///student_section.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db.init_app(app)
CORS(app)  # Enable CORS

# MongoDB connection
client = MongoClient('mongodb+srv://dbadmin:Time2add@studentsectiondemo.9mdru.mongodb.net/?retryWrites=true&w=majority&appName=StudentSectionDemo')
db = client['student_section']
schedules_collection = db['schedules']

MOCK_API_BASE_URL = "http://localhost:3003"

# Function to log API interactions
def log_api_interaction(request_type, response_code, status):
    api_log = APILog(
        request_type=request_type,
        response_code=response_code,
        status=status
    )
    db.session.add(api_log)
    db.session.commit()

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
    log_api_interaction('POST /v1/auth/token', response.status_code, status)
    if response.status_code == 200:
        return response.json().get("accessToken")
    return None

# Endpoint to retrieve and store tickets for a user
@app.route('/tickets/list', methods=['POST'])
def list_tickets():
    print("list_tickets endpoint was called")
    user_id = request.json.get("user_id")
    season_code = request.json.get("season_code")

    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": "User not found"}), 404

    # Authenticate with the mock API to get the token
    token = get_mock_token()
    if not token:
        return jsonify({"error": "Unable to authenticate with mock Paciolan API"}), 500

    # Get tickets for the user from the mock API
    url = f"{MOCK_API_BASE_URL}/v2/patron/{user.paciolan_account_id}/orders/{season_code}"
    headers = {
        "Authorization": "MockAccessToken12345",
        "PAC-Application-ID": "application.id",
        "PAC-API-Key": "mock.api.key",
        "PAC-Channel-Code": "mock.channel.code",
        "PAC-Organization-ID": "OrganizationID",
        "User-Agent": "StudentSection/v1.0",
        "Accept": "application/json"
    }
    response = requests.get(url, headers=headers)
    status = 'Success' if response.status_code == 200 else 'Error'
    log_api_interaction(f'GET {url}', response.status_code, status)

    if response.status_code != 200:
        return jsonify({"error": "Failed to retrieve tickets"}), response.status_code

    response_data = response.json()
    tickets_data = response_data.get("orderLineItems", [])

    for ticket_data in tickets_data:
        event_item = ticket_data.get("item", {})
        event_code = event_item.get("code", "Unknown Event")
        event_name = event_item.get("name", "Unknown Event Name")
        season = response_data.get("season", {})
        season_code = season.get("code", "Unknown Season")

        events = ticket_data.get("events", [])
        for event in events:
            is_transferrable = event.get("isTransferrable", False)
            price = event.get("price", 0.0)
            seats = event.get("seats", [])
            for seat in seats:
                section = seat.get("section", "Unknown Section")
                row = seat.get("row", "Unknown Row")
                seat_number = seat.get("seat", "Unknown Seat")
                barcode = seat.get("barcode")

                # Check if the ticket already exists to avoid duplicates
                existing_ticket = Ticket.query.filter_by(
                    event_code=event_code,
                    section=section,
                    row=row,
                    seat_number=seat_number,
                    owner_id=user_id
                ).first()

                if not existing_ticket:
                    new_ticket = Ticket(
                        event_code=event_code,
                        event_name=event_name,
                        season_code=season_code,
                        section=section,
                        row=row,
                        seat_number=seat_number,
                        barcode=barcode,
                        price=price,
                        is_transferrable=is_transferrable,
                        owner_id=user_id
                    )
                    db.session.add(new_ticket)

    db.session.commit()
    return jsonify({"message": "Tickets listed successfully"}), 201

# Endpoint to get tickets for a user
@app.route('/users/<int:user_id>/tickets', methods=['GET'])
def get_user_tickets(user_id):
    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": "User not found"}), 404

    tickets = Ticket.query.filter_by(owner_id=user_id).all()
    tickets_list = []
    for ticket in tickets:
        tickets_list.append({
            "ticket_id": ticket.ticket_id,
            "event_name": ticket.event_name,
            "section": ticket.section,
            "row": ticket.row,
            "seat_number": ticket.seat_number,
            "price": ticket.price,
            "is_listed": ticket.is_listed
        })
    return jsonify({"tickets": tickets_list}), 200

# Endpoint to get user by email
@app.route('/users/email/<string:email>', methods=['GET'])
def get_user_by_email(email):
    user = User.query.filter_by(email=email).first()
    if not user:
        return jsonify({"error": "User not found"}), 404

    return jsonify({
        "user_id": user.user_id,
        "first_name": user.first_name,
        "last_name": user.last_name
    }), 200

# Endpoint to create a ticket listing
@app.route('/listings/create', methods=['POST'])
def create_listing():
    ticket_id = request.json.get('ticket_id')
    seller_id = request.json.get('seller_id')
    price = request.json.get('price')

    # Retrieve the ticket and seller
    ticket = Ticket.query.get(ticket_id)
    if not ticket:
        return jsonify({'error': 'Ticket not found'}), 404

    if ticket.owner_id != seller_id:
        return jsonify({'error': 'You do not own this ticket'}), 403

    if ticket.is_listed:
        return jsonify({'error': 'Ticket is already listed'}), 400

    # Create the listing
    new_listing = Listing(
        ticket_id=ticket_id,
        seller_id=seller_id,
        price=price,
        status='Available'
    )
    ticket.is_listed = True  # Update ticket status
    db.session.add(new_listing)
    db.session.commit()

    return jsonify({'message': 'Ticket listed for sale successfully', 'listing_id': new_listing.listing_id}), 201

# Endpoint to get all available listings
@app.route('/listings', methods=['GET'])
def get_listings():
    listings = Listing.query.filter_by(status='Available').all()
    listings_data = []

    for listing in listings:
        ticket = Ticket.query.get(listing.ticket_id)
        seller = User.query.get(listing.seller_id)
        listings_data.append({
            'listing_id': listing.listing_id,
            'ticket_id': ticket.ticket_id,
            'event_name': ticket.event_name,
            'section': ticket.section,
            'row': ticket.row,
            'seat_number': ticket.seat_number,
            'price': listing.price,
            'seller_name': f"{seller.first_name} {seller.last_name}"
        })

    return jsonify({'listings': listings_data}), 200

# Endpoint to purchase a ticket
@app.route('/transactions/purchase', methods=['POST'])
def purchase_ticket():
    listing_id = request.json.get('listing_id')
    buyer_id = request.json.get('buyer_id')

    # Retrieve listing, ticket, seller, and buyer
    listing = Listing.query.get(listing_id)
    if not listing or listing.status != 'Available':
        return jsonify({'error': 'Listing not available'}), 404

    ticket = Ticket.query.get(listing.ticket_id)
    seller = User.query.get(listing.seller_id)
    buyer = User.query.get(buyer_id)
    if not buyer:
        return jsonify({'error': 'Buyer not found'}), 404

    resale_price = listing.price

    # Authenticate with the mock API to get the token
    token = get_mock_token()
    if not token:
        return jsonify({"error": "Unable to authenticate with mock Paciolan API"}), 500

    # Simulate transfer initiation with mock API
    url = f"{MOCK_API_BASE_URL}/v1/tickets/transfer"
    headers = {
        "Authorization": "MockAccessToken12345",
        "PAC-Application-ID": "application.id",
        "PAC-API-Key": "mock.api.key",
        "PAC-Channel-Code": "mock.channel.code",
        "PAC-Organization-ID": "OrganizationID",
        "User-Agent": "StudentSection/v1.0",
        "Accept": "application/json",
        "Content-Type": "application/json"
    }
    data = {
        "fromPatronId": seller.paciolan_account_id,
        "toPatronId": buyer.paciolan_account_id,
        "ticketIds": [ticket.barcode],
        "recipientEmail": buyer.email
    }
    response = requests.post(url, headers=headers, json=data)
    status = 'Success' if response.status_code == 200 else 'Error'
    log_api_interaction(f'POST {url}', response.status_code, status)

    if response.status_code == 200:
        transfer_data = response.json()
        new_transaction = Transaction(
            ticket_id=ticket.ticket_id,
            seller_id=seller.user_id,
            buyer_id=buyer.user_id,
            resale_price=resale_price,
            transaction_amount=resale_price,
            recipient_email=buyer.email,
            transfer_id_api=transfer_data.get("transferId"),
            transfer_url=transfer_data.get("url"),
            transaction_status="Completed",
            transfer_status="Accepted"
        )
        db.session.add(new_transaction)

        # Update ticket ownership and listing status
        ticket.owner_id = buyer.user_id
        ticket.is_listed = False
        listing.status = 'Sold'
        db.session.commit()

        return jsonify({
            "message": "Purchase successful, transfer completed",
            "transaction_id": new_transaction.transaction_id
        }), 201
    else:
        return jsonify({"error": "Failed to initiate transfer", "details": response.text}), response.status_code

# Endpoint to get user information
@app.route('/users/<int:user_id>', methods=['GET'])
def get_user(user_id):
    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": "User not found"}), 404

    return jsonify({
        "user_id": user.user_id,
        "first_name": user.first_name,
        "last_name": user.last_name,
        "email": user.email,
        "paciolan_account_id": user.paciolan_account_id
    }), 200

@app.route('/listings/delete', methods=['DELETE'])
def delete_listing():
    ticket_id = request.json.get('ticket_id')
    user_id = request.json.get('user_id')  # Ensure the user owns the ticket

    # Retrieve the listing and ticket
    listing = Listing.query.filter_by(ticket_id=ticket_id).first()
    ticket = Ticket.query.get(ticket_id)

    if not ticket or not listing:
        return jsonify({'error': 'Listing or ticket not found'}), 404

    if ticket.owner_id != user_id:
        return jsonify({'error': 'Unauthorized action'}), 403

    # Delete the listing and update the ticket status
    db.session.delete(listing)
    ticket.is_listed = False
    db.session.commit()

    return jsonify({'message': 'Listing deleted successfully'}), 200

@app.route('/api/upload_schedule', methods=['POST'])
def upload_schedule():
    if 'file' not in request.files:
        return jsonify({"error": "No file part in the request"}), 400

    file = request.files['file']

    if file.filename == '':
        return jsonify({"error": "No file selected for uploading"}), 400

    if file and file.filename.endswith('.html'):
        html_content = file.read().decode('utf-8')
        # Process the HTML content
        schedule_data = parse_html_schedule(html_content)
        if schedule_data:
            schedules_collection.insert_one(schedule_data)
            return jsonify({"message": "Schedule uploaded successfully"}), 201
        else:
            return jsonify({"error": "Failed to parse schedule"}), 400
    else:
        return jsonify({"error": "Invalid file type. Only .html files are allowed"}), 400


if __name__ == '__main__':
    with app.app_context():
        db.create_all()
    app.run(debug=True)

