import re
import logging
from typing import Optional, Dict, Any
from bs4 import BeautifulSoup

logger = logging.getLogger(__name__)

def parse_html_schedule(html_content: str) -> Optional[Dict[str, Any]]:
    """
    Attempts to parse HTML schedule data in one of two ways:

    1) 'Legacy' GoBearcats style:
       - The first line is the school name
       - The second line has (or references) a year
       - A recognizable header row that includes:
         Date, Time, At, Opponent, Location
       - Lines after that are game lines with at least 5 columns
         (the 6th column is optional 'Result').

    2) 'Dynamic / Schedule Builder' style:
       - line[0]: school_name
       - line[1]: year
       - line[2]: event_type
       - line[3]: the header row (any subset of date/time/at/opponent/location/result)
       - lines[4+]: game lines, each having at least date/time/location.

    If one approach fails, it falls back to the other. If both fail, returns None.
    """

    soup = BeautifulSoup(html_content, "html5lib")

    # Attempt to extract text from <pre> if present:
    pre_tag = soup.find("pre")
    if pre_tag:
        schedule_text = pre_tag.get_text("\n", strip=True)
    else:
        schedule_text = soup.get_text("\n", strip=True)

    # Clean up lines
    lines = [l.strip() for l in schedule_text.split("\n") if l.strip()]

    # 1) Attempt the 'legacy' GoBearcats approach
    schedule_data_legacy = _try_legacy_format(lines)
    if schedule_data_legacy is not None and schedule_data_legacy.get("games"):
        return schedule_data_legacy

    # 2) If the legacy approach failed (or no games found), 
    #    attempt the 'dynamic / schedule builder' approach
    schedule_data_dynamic = _try_dynamic_format(lines)
    if schedule_data_dynamic is not None and schedule_data_dynamic.get("games"):
        return schedule_data_dynamic

    # If both approaches yield no valid games, return None
    logger.error("No valid games parsed in either legacy or dynamic approach.")
    return None

def _try_legacy_format(lines) -> Optional[Dict[str, Any]]:
    """
    Legacy approach:
      - lines[0]: school name
      - lines[1]: might have a year
      - find a row with 'Date' 'Time' 'At' 'Opponent' 'Location'
      - parse lines after that, expecting at least 5 columns
    """
    if len(lines) < 2:
        logger.debug("Legacy format check: not enough lines to parse.")
        return None

    school_name = lines[0].strip()

    # Attempt to find a 4-digit year in line[1]
    import re
    year_match = re.search(r"\b(\d{4})\b", lines[1])
    year = year_match.group(1) if year_match else ""

    # Find the header row that contains "Date ... Time ... At ... Opponent ... Location"
    header_pattern = re.compile(r"\bDate\b.*\bTime\b.*\bAt\b.*\bOpponent\b.*\bLocation\b", re.IGNORECASE)
    start_index = None
    for i, line in enumerate(lines):
        if header_pattern.search(line):
            start_index = i + 1
            break

    if start_index is None:
        logger.debug("Legacy format check: Could not find matching header row.")
        return None

    # We have a potential start index for game lines
    schedule_data = {
        "school_name": school_name,
        "year": year,
        # no "event_type" known in legacy approach, but you could guess from line[1] if you want
        "games": []
    }

    # parse lines from start_index forward
    for line in lines[start_index:]:
        if not line.strip():
            continue

        # Split by multiple spaces
        parts = re.split(r"\s{2,}", line.strip())
        if len(parts) < 5:
            # Possibly not enough columns for date/time/at/opponent/location
            logger.debug("Legacy: skipping malformed line: %s", line)
            continue

        # Unpack the first 5 columns
        date, time, at, opponent, location = parts[:5]
        result = parts[5] if len(parts) > 5 else "TBD"

        game = {
            "date": date,
            "time": time,
            "home_or_away": "Home" if at.strip().lower() == "home" else "Away",
            "opponent": opponent,
            "location": location,
            "result": result
        }
        schedule_data["games"].append(game)

    if not schedule_data["games"]:
        logger.debug("Legacy format check: no games found after parsing.")
        return None

    logger.debug("Legacy format succeeded with %d games.", len(schedule_data["games"]))
    return schedule_data

def _try_dynamic_format(lines) -> Optional[Dict[str, Any]]:
    """
    Dynamic approach (schedule builder):
      - line[0] = school_name
      - line[1] = year
      - line[2] = event_type
      - line[3] = header row
      - line[4+] = game lines

    We look for columns among {date, time, at, opponent, location, result}.
    We skip lines that don't at least have date/time/location.
    """
    if len(lines) < 4:
        logger.debug("Dynamic format check: not enough lines for 4-line header approach.")
        return None

    school_name = lines[0]         # line 1
    year = lines[1]               # line 2
    event_type = lines[2]         # line 3
    header_line = lines[3]        # line 4

    # If year isn't 4 digits, we won't treat that as a fail, but just note it
    # If event_type is empty, also not a fail, but might lead to no event_type

    # We'll parse columns in the header
    header_columns = re.split(r"\s{2,}", header_line.strip())
    if len(header_columns) < 2:
        # fallback single-space
        header_columns = header_line.strip().split()

    valid_cols = {"date", "time", "at", "opponent", "location", "result"}
    col_positions = {}
    for idx, col in enumerate(header_columns):
        col_lower = col.strip().lower()
        if col_lower in valid_cols:
            col_positions[idx] = col_lower

    # Parse the subsequent lines as games
    games = []
    for line in lines[4:]:
        parts = re.split(r"\s{2,}", line.strip())
        if len(parts) < 2:
            parts = line.strip().split()
        if not parts:
            continue

        game_obj = {}
        for idx, val in enumerate(parts):
            if idx in col_positions:
                col_name = col_positions[idx]
                game_obj[col_name] = val.strip()

        # Enforce date/time/location so partial lines don't slip through
        if "date" not in game_obj or "time" not in game_obj or "location" not in game_obj:
            logger.debug("Dynamic: skipping line missing required columns: %s", line)
            continue

        games.append(game_obj)

    if not games:
        logger.debug("Dynamic format check: no valid games found.")
        return None

    schedule_data = {
        "school_name": school_name,
        "year": year,
        "event_type": event_type,
        "games": games
    }
    logger.debug("Dynamic format succeeded with %d games.", len(games))
    return schedule_data
