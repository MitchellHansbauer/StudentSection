import os
import requests
from flask import Flask, request, jsonify

app = Flask(__name__)

# POST endpoint to fetch user's ticket information via ticket_id
@app.route('/get-ticket-info', methods=['POST'])
def get_ticket_info():
    data = request.json
    ticket_id = data.get('ticket_id')

    if not ticket_id:
        return jsonify({"error": "Missing ticket_id in request body"}), 400

    # Paciolan API endpoint to fetch ticket information (mocked here, replace with real endpoint)
    paciolan_url = f"https://link-sandbox.paciolan.info/v1/tickets/{ticket_id}"  # Replace with correct endpoint for fetching ticket details

    # Setting up headers for the API call
    headers = {
        'Authorization': f'Bearer {os.getenv("PACIOLAN_API_TOKEN")}',  # Set your Paciolan API token in environment variables
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'User-Agent': 'MyApplication/1.0',
    }

    try:
        # Make the API call to Paciolan
        response = requests.get(paciolan_url, headers=headers)

        # Check if the response from Paciolan is successful
        if response.status_code == 200:
            ticket_info = response.json()  # Parse the JSON response from Paciolan
            return jsonify(ticket_info), 200
        elif response.status_code == 404:
            return jsonify({"error": "Ticket not found"}), 404
        else:
            return jsonify({"error": "Failed to retrieve ticket information", "details": response.text}), response.status_code

    except Exception as e:
        return jsonify({"error": str(e)}), 500
