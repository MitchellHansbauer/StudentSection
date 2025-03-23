from datetime import datetime
from dateutil import parser
import re
from fuzzywuzzy import fuzz
from unidecode import unidecode
import requests
from flask import jsonify

def fuzzy_match_event(frontend_name: str, frontend_venue: str, frontend_datetime: str, paciolan_id: str, token: str) -> dict:
    """
    Fuzzy match an event from the Paciolan API using the frontend event details.
    
    :param frontend_name: The event name provided by the frontend.
    :param frontend_venue: The venue provided by the frontend.
    :param frontend_datetime: The event date/time in ISO 8601 format.
    :return: The best matching event dict from Paciolan, or None if no match is found.
    """
    
    # Set Specific season for now (it doesn't change in mocked response)
    season_code = 'FB24'

    # Normalize text: lower-case, trim whitespace, remove accents.
    def normalize_text(s: str) -> str:
        if s is None:
            return ""
        return unidecode(s).strip().lower()
    
    # Normalize the frontend inputs.
    norm_name = normalize_text(frontend_name)
    norm_venue = normalize_text(frontend_venue)
    # Remove non-alphanumeric characters for robust comparison.
    norm_name = re.sub(r'\W+', '', norm_name)
    norm_venue = re.sub(r'\W+', '', norm_venue)
    
    # Parse the frontend datetime string.
    try:
        target_dt = datetime.fromisoformat(frontend_datetime)
    except ValueError:
        target_dt = parser.parse(frontend_datetime)
    target_date = target_dt.date()
    
    # Retrieve events from Paciolan API.
    url = f"http://localhost:3003/v2/patron/{paciolan_id}/orders/{season_code}"
    headers = {
        "Authorization": f"Bearer {token}",    # Use the token from get_mock_token()
        "PAC-Application-ID": "TicketImporter/1.0",
        "PAC-API-Key": "mock.api.key",
        "PAC-Channel-Code": "mock.channel.code",
        "PAC-Organization-ID": "OrganizationID",
        "User-Agent": "StudentSection/v1.0",
        "Accept": "application/json"
    }
    response = requests.get(url, headers=headers)

    if response.status_code == 404:
        return jsonify({"error": f"No tickets found for paciolan_id={paciolan_id}, season={season_code}"}), 404
    elif response.status_code != 200:
        return jsonify({"error": f"Mock API error: {response.status_code}"}), 502

    # 6) Parse the response and build ticket documents
    data_json = response.json()
    event_tickets = data_json.get("value", {}).get("lineItemOHVos", [])
    
    best_match = None
    best_score = 0
    
    for order in event_tickets:
        print(f"Processing order ID: {order.get('id', 'N/A')}")
        events = order.get("eventOHVos", [])
        if not events:
            print("No events found in this order.")
            continue

        for event in events:
            # Normalize Paciolan event name and venue.
            event_name = event.get('name', '')
            event_facility = event.get('facility', '')
            event_name_norm = re.sub(r'\W+', '', normalize_text(event_name))
            event_venue_norm = re.sub(r'\W+', '', normalize_text(event_facility))
            
            print(f"Processing event: '{event_name}' at '{event_facility}'")
            
            # Parse Paciolan event date/time.
            try:
                event_dt = parser.parse(event.get('eventDtStr', ''))
                print(f"Parsed event date: {event_dt.date()}")
            except Exception as e:
                print(f"Failed to parse event date for event '{event_name}'. Error: {e}")
                continue
            
            # Compare only the dates.
            if event_dt.date() != target_date:
                print(f"Date mismatch: event date {event_dt.date()} does not equal target date {target_date}")
                continue
            
            # Compute fuzzy similarity scores for event name.
            name_score = fuzz.ratio(norm_name, event_name_norm)
            
            # Compute venue score and adjust if necessary.
            venue_score = fuzz.ratio(norm_venue, event_venue_norm)
            # If venue score is low but the event venue is a substring of the target venue, then set score to 100.
            if venue_score < 90 and event_venue_norm in norm_venue:
                print(f"Adjusting venue score for '{event_facility}' since it is contained in target venue.")
                venue_score = 100
            
            print(f"Fuzzy scores for '{event_name}' - Name: {name_score}, Venue: {venue_score}")
            
            # Only consider events where both scores are high.
            if name_score >= 90 and venue_score >= 90:
                total_score = name_score + venue_score
                if total_score > best_score:
                    best_score = total_score
                    best_match = event
                    print(f"New best match found: '{event_name}' with score {total_score}")
                if best_score == 200:  # Perfect match (100+100)
                    print("Perfect match found. Exiting loop.")
                    break
            else:
                print(f"Skipping event '{event_name}' due to low score.")
        
        if best_score == 200:
            break

    if not best_match:
        print("No matching event found after processing all events.")

    return best_match
