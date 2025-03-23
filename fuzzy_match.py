from datetime import datetime
from dateutil import parser
import re
from fuzzywuzzy import fuzz
from unidecode import unidecode

def fuzzy_match_event(frontend_name: str, frontend_venue: str, frontend_datetime: str) -> dict:
    """
    Fuzzy match an event from the Paciolan API using the frontend event details.
    
    :param frontend_name: The event name provided by the frontend.
    :param frontend_venue: The venue provided by the frontend.
    :param frontend_datetime: The event date/time in ISO 8601 format.
    :return: The best matching event dict from Paciolan, or None if no match is found.
    """
    
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
    target_time = target_dt.time()
    
    # Retrieve events from Paciolan API.
    paciolan_events = get_paciolan_events()  # Ensure this function is defined elsewhere.
    
    best_match = None
    best_score = 0
    
    for event in paciolan_events:
        # Normalize Paciolan event name and venue.
        event_name_norm = normalize_text(event.get('eventName', ''))
        event_venue_norm = normalize_text(event.get('facility', ''))
        event_name_norm = re.sub(r'\W+', '', event_name_norm)
        event_venue_norm = re.sub(r'\W+', '', event_venue_norm)
        
        # Parse Paciolan event date/time.
        try:
            event_dt = parser.parse(event.get('eventDtStr', ''))
        except Exception:
            continue  # Skip if date parsing fails.
        
        # Check if date and time match exactly.
        if event_dt.date() != target_date or event_dt.time() != target_time:
            continue
        
        # Compute fuzzy similarity scores.
        name_score = fuzz.ratio(norm_name, event_name_norm)
        venue_score = fuzz.ratio(norm_venue, event_venue_norm)
        
        # Only consider events where both scores are high.
        if name_score >= 90 and venue_score >= 90:
            total_score = name_score + venue_score
            if total_score > best_score:
                best_score = total_score
                best_match = event
            if best_score == 200:  # Perfect match (100+100)
                break
    
    return best_match
