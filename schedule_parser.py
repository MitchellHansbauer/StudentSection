from bs4 import BeautifulSoup
import re
import logging
from typing import Optional, Dict, Any

logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

def parse_html_schedule(html_content: str) -> Optional[Dict[str, Any]]:
    """
    Parses raw HTML schedule data and extracts games.

    Updated to accommodate:
      - Potential year on line 0 (if 4 digits).
      - Potential event_type on line 1.
      - If line 0 is not 4 digits, treat it as school_name.
      - If line 1 is not 4 digits, treat it as event_type (or potentially
        school_name if year wasn't set from line 0).
      - Then search for the schedule header row ("Date  Time  ..."), parse the rest as games.

    Returns a dict:
        {
          "school_name": str,
          "year": str,
          "event_type": str,
          "games": [...],
        }
    or None if it cannot parse.
    """
    soup = BeautifulSoup(html_content, 'html5lib')
    pre_tag = soup.find('pre')
    if pre_tag:
        schedule_text = pre_tag.get_text("\n", strip=True)
    else:
        logger.warning("No <pre> tag found, using full body text instead.")
        schedule_text = soup.get_text("\n", strip=True)

    logger.debug("Extracted Schedule Text (first 1000 chars): %s", schedule_text[:1000])

    lines = schedule_text.split("\n")
    if len(lines) < 2:
        logger.error("Not enough lines found. Need at least 2 lines (for meta info) plus a header row.")
        return None

    # Defaults
    school_name = ""
    year = ""
    event_type = ""

    def is_year_string(text: str) -> bool:
        """Checks if a text line is exactly a 4-digit year."""
        return bool(re.fullmatch(r'\d{4}', text.strip()))

    # We'll consume up to the first 3 lines for meta info.
    meta_lines = lines[:3]
    consumed = 0

    # -- Line 0 --
    line0 = meta_lines[0].strip()
    if is_year_string(line0):
        year = line0
        consumed += 1
    else:
        school_name = line0
        consumed += 1

    # -- Line 1 (if present) --
    if len(meta_lines) >= 2:
        line1 = meta_lines[1].strip()
        if not year:
            # We did not set year from line0
            if is_year_string(line1):
                year = line1
                consumed += 1
            else:
                # No year found: treat line1 as event_type by default
                # (or continuing school_name if you prefer).
                event_type = line1
                consumed += 1
        else:
            # We already have year from line0, so line1 can be event_type
            event_type = line1
            consumed += 1

    # -- Line 2 (if present) --
    if len(meta_lines) >= 3:
        line2 = meta_lines[2].strip()
        # If line2 starts with "Date" or "Time", it’s likely a header row. 
        # So we skip using it as meta. Otherwise we treat it as event_type or possibly school_name if needed.
        if not (line2.lower().startswith("date") or line2.lower().startswith("time")):
            if not event_type:
                event_type = line2
                consumed += 1
            elif not school_name:
                # Possibly set line2 to school_name if it's blank
                school_name = line2
                consumed += 1

    # Now that we've identified school_name, year, event_type from up to 3 lines:
    # The next lines (lines[consumed:]) are where we look for the schedule header.
    possible_header_lines = lines[consumed:]

    # Patterns for either "full" (Date, Time, At, Opponent, Location) 
    # or "min" (Date, Time, Location).
    full_pattern = re.compile(r'\bDate\b.*\bTime\b.*\bAt\b.*\bOpponent\b.*\bLocation\b', re.IGNORECASE)
    min_pattern  = re.compile(r'\bDate\b.*\bTime\b.*\bLocation\b', re.IGNORECASE)

    start_index = None
    header_found = None
    for i, row in enumerate(possible_header_lines):
        if full_pattern.search(row):
            header_found = 'full'
            start_index = i + 1
            break
        elif min_pattern.search(row):
            header_found = 'min'
            start_index = i + 1
            break

    if start_index is None:
        logger.error("Could not find a recognizable 'Date  Time ...' header row in lines after meta info.")
        return None

    schedule_data = {
        "school_name": school_name,
        "year": year,
        "event_type": event_type,
        "games": []
    }

    # Parse each line after the header
    game_lines = possible_header_lines[start_index:]
    for line in game_lines:
        line = line.strip()
        if not line:
            continue

        parts = re.split(r'\s{2,}', line)
        # For minimal, we require at least 3 columns: date, time, location
        if len(parts) < 3:
            logger.debug("Skipping malformed or empty line: %s", line)
            continue

        date = parts[0].strip()
        time = parts[1].strip()

        location_idx = 2
        at_value = ""
        opponent = ""

        if header_found == 'full' and len(parts) >= 5:
            # If 'full' header, the first 5 columns are date, time, at, opponent, location
            at_value = parts[2].strip()
            opponent = parts[3].strip()
            location_idx = 4

        if location_idx >= len(parts):
            logger.debug("Skipping line: missing location column: %s", line)
            continue
        location = parts[location_idx].strip()

        # If there's a 6th column in 'full' mode, treat it as 'result'
        # or a 4th column in 'min' mode, treat it as 'result'
        result = ""
        if header_found == 'full' and len(parts) > 5:
            result = parts[5].strip()
        elif header_found == 'min' and len(parts) > 3:
            result = parts[3].strip()

        # Convert 'at_value' to home/away or N/A
        home_or_away = "N/A"
        if at_value:
            if at_value.lower() == "home":
                home_or_away = "Home"
            else:
                home_or_away = "Away"

        schedule_data["games"].append({
            "date": date,
            "time": time,
            "home_or_away": home_or_away,
            "opponent": opponent,
            "location": location,
            "result": result if result else "TBD"
        })

    if not schedule_data["games"]:
        logger.error("No games were parsed from the schedule.")
        return None

    return schedule_data
