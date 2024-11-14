from flask import Flask, request, jsonify
from models import db, User, Ticket, Listing, Transaction, APILog
from datetime import datetime
import requests
from flask_cors import CORS

app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///student_section.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db.init_app(app)
CORS(app)

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
    url = f"{MOCK_API_BASE_URL}/v1/auth/token"
    headers = {"Content-Type": "application/json"}
    response = requests.post(url, headers=headers)
    status = 'Success' if response.status_code == 200 else 'Error'
    log_api_interaction('POST /v1/auth/token', response.status_code, status)
    if response.status_code == 200:
        return response.json().get("accessToken")
    return None

# Endpoint to retrieve and store tickets for a user
@app.route('/tickets/list', methods=['POST'])
def list_tickets():
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
        "Authorization": f"Bearer {token}",
        "Accept": "application/json",
        "Content-Type": "application/json"
    }
    response = requests.get(url, headers=headers)
    status = 'Success' if response.status_code == 200 else 'Error'
    log_api_interaction(f'GET {url}', response.status_code, status)

    if response.status_code != 200:
        return jsonify({"error": "Failed to retrieve tickets"}), response.status_code

    response_data = response.json()
    season = response_data.get("season", {})
    season_code = season.get("code", "Unknown Season")
    tickets_data = response_data.get("orderLineItems", [])

    for ticket_data in tickets_data:
        event_item = ticket_data.get("item", {})
        event_code = event_item.get("code", "Unknown Event")
        event_name = event_item.get("name", "Unknown Event Name")

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

# Initiate transfer and create a transaction record
@app.route('/transactions/transfer', methods=['POST'])
def initiate_transfer():
    ticket_id = request.json.get("ticket_id")
    buyer_id = request.json.get("buyer_id")
    resale_price = request.json.get("resale_price")

    # Retrieve seller and buyer details
    ticket = Ticket.query.get(ticket_id)
    if not ticket:
        return jsonify({"error": "Ticket not found"}), 404

    seller = User.query.get(ticket.owner_id)
    buyer = User.query.get(buyer_id)
    if not buyer:
        return jsonify({"error": "Buyer not found"}), 404

    # Authenticate with the mock API to get the token
    token = get_mock_token()
    if not token:
        return jsonify({"error": "Unable to authenticate with mock Paciolan API"}), 500

    # Simulate transfer initiation with mock API
    url = f"{MOCK_API_BASE_URL}/v1/tickets/transfer"
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
        "Accept": "application/json"
    }
    data = {
        "fromPatronId": seller.paciolan_account_id,
        "toPatronId": buyer.paciolan_account_id,
        "ticketIds": [ticket.barcode],  # Adjust according to API expectations
        "recipientEmail": buyer.email
    }
    response = requests.post(url, headers=headers, json=data)
    status = 'Success' if response.status_code == 200 else 'Error'
    log_api_interaction(f'POST {url}', response.status_code, status)

    if response.status_code == 200:
        transfer_data = response.json()
        new_transaction = Transaction(
            ticket_id=ticket_id,
            seller_id=seller.user_id,
            buyer_id=buyer_id,
            resale_price=resale_price,
            transaction_amount=resale_price,  # Placeholder for real calculations
            recipient_email=buyer.email,
            transfer_id_api=transfer_data.get("transferId"),
            transfer_url=transfer_data.get("url"),
            transaction_status="Pending",
            transfer_status="Pending"
        )
        db.session.add(new_transaction)

        # Update ticket ownership
        ticket.owner_id = buyer_id
        ticket.is_listed = False  # Assuming the ticket is no longer listed
        db.session.commit()

        return jsonify({
            "message": "Transfer initiated",
            "transaction_id": new_transaction.transaction_id,
            "transfer_url": new_transaction.transfer_url
        }), 201
    else:
        return jsonify({"error": "Failed to initiate transfer", "details": response.text}), response.status_code

# Confirm transfer acceptance
@app.route('/transactions/<int:transaction_id>/confirm', methods=['POST'])
def confirm_transfer(transaction_id):
    transaction = Transaction.query.get(transaction_id)
    if not transaction:
        return jsonify({"error": "Transaction not found"}), 404

    # Authenticate with the mock API to get the token
    token = get_mock_token()
    if not token:
        return jsonify({"error": "Unable to authenticate with mock Paciolan API"}), 500

    # Simulate transfer acceptance with mock API
    url = f"{MOCK_API_BASE_URL}/v1/tickets/transfer/accept"
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
        "Accept": "application/json"
    }
    data = {
        "transferId": transaction.transfer_id_api,
        "toPatronId": transaction.buyer.paciolan_account_id
    }
    response = requests.post(url, headers=headers, json=data)
    status = 'Success' if response.status_code == 200 else 'Error'
    log_api_interaction(f'POST {url}', response.status_code, status)

    if response.status_code == 200:
        # Update transaction status
        transaction.transfer_status = "Accepted"
        transaction.transaction_status = "Completed"
        transaction.updated_at = datetime.utcnow()
        db.session.commit()
        return jsonify({"message": "Transfer confirmed and payment processed"}), 200
    else:
        return jsonify({"error": "Failed to confirm transfer", "details": response.text}), response.status_code

if __name__ == '__main__':
    app.run(debug=True)
