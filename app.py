from flask import Flask, request, jsonify
from models import db, User, Ticket, Listing, Order, Transfer, APILog
from datetime import datetime
import requests
import os

app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///student_section.db'  # Update URI as needed
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db.init_app(app)

# Endpoint to retrieve and store user tickets from Paciolan API
@app.route('/tickets/list', methods=['POST'])
def list_tickets():
    user_id = request.json.get("user_id")
    season_code = request.json.get("season_code")

    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": "User not found"}), 404

    # Authenticate with Paciolan API (replace this with actual API token handling)
    token = "your_paciolan_token"  # Replace with actual token retrieval logic
    url = f"https://paciolan.api/v2/patron/{user.paciolan_account_id}/orders/{season_code}"
    headers = {"Authorization": f"Bearer {token}"}

    response = requests.get(url, headers=headers)
    if response.status_code != 200:
        return jsonify({"error": "Failed to retrieve tickets from Paciolan"}), response.status_code

    tickets_data = response.json().get("orderLineItems", [])
    for ticket_data in tickets_data:
        new_ticket = Ticket(
            event_code=ticket_data["item"]["code"],
            event_name=ticket_data["item"]["name"],
            season_code=ticket_data["season"]["code"],
            section=ticket_data["seats"][0]["section"],
            row=ticket_data["seats"][0]["row"],
            seat_number=ticket_data["seats"][0]["seat"],
            barcode=ticket_data["seats"][0]["barcode"],
            price=ticket_data["price"],
            is_transferrable=ticket_data["isTransferrable"],
            owner_id=user_id
        )
        db.session.add(new_ticket)

    db.session.commit()
    return jsonify({"message": "Tickets listed successfully"}), 201

if __name__ == '__main__':
    app.run(debug=True)
