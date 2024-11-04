from flask import Flask, jsonify, request
import requests
from sqlalchemy.orm import sessionmaker
from models import engine, User, Event, Ticket, Order, APILog

app = Flask(__name__)

# Set up SQLAlchemy session
Session = sessionmaker(bind=engine)

# Example endpoint to add listing details (you can reuse the code from the previous response)
@app.route('/add_listing_details', methods=['POST'])
def add_listing_details():
    data = request.json
    listing_id = data.get('listing_id')
    
    if not listing_id:
        return jsonify({"error": "listing_id is required"}), 400

    # Fetch listing details from the local mocked API
    try:
        response = requests.get(f"http://localhost:3002/v1/listings/{listing_id}")
        if response.status_code != 200:
            return jsonify({"error": "Failed to fetch listing details"}), response.status_code
        
        # Parse response JSON
        listing_data = response.json()[0]  # Assuming response is a list with one listing object
        ticket_info = listing_data['tickets'][0]  # Access the first ticket in the listing
        seat_info = ticket_info['seats'][0]  # Access the first seat in the ticket

        # Map the seat info data to the Ticket model fields
        session = Session()
        new_ticket = Ticket(
            event_id=1,  # Set the event_id as needed or query based on context
            owner_id=1,  # Set the owner_id based on context
            barcode=seat_info.get("token"),
            unique_id=listing_id,
            seat_number=seat_info.get("seat"),
            price=0.0,  # Placeholder, update with actual price if available
            price_level=seat_info.get("priceLevel", "N/A"),
            price_type=seat_info.get("seatingType"),
            status="Available",
            print_status="Not Issued",
            section=seat_info.get("section"),
            row=seat_info.get("row"),
            seat=seat_info.get("seat")
        )
        
        # Insert the ticket into the database
        session.add(new_ticket)
        session.commit()
        session.close()

        return jsonify({"message": "Ticket details added successfully", "listing_id": listing_id}), 201

    except Exception as e:
        return jsonify({"error": str(e)}), 500

# Run the Flask app
if __name__ == '__main__':
    app.run(debug=True)
