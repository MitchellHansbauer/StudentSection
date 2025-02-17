from bs4 import BeautifulSoup
import re
import logging
from typing import Optional, Dict, Any

# Configure logging (adjust level as needed)
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

def parse_html_schedule(html_content: str) -> Optional[Dict[str, Any]]:
    """
    Parses raw HTML schedule data and extracts games.

    Expected format:
      - The first line contains the school name.
      - The second line contains a year (4-digit).
      - A header row identifying the game schedule is present (e.g. containing Date, Time, At, Opponent, Location).
      - Game lines are separated by newlines and columns by multiple spaces.

    Returns:
        A dictionary with keys 'school_name', 'year', and 'games' if parsing is successful.
        Returns None if the schedule could not be parsed.
    """
    soup = BeautifulSoup(html_content, 'html5lib')

    # Try to find the <pre> tag first; fallback to the full text if not found.
    pre_tag = soup.find('pre')
    if pre_tag:
        schedule_text = pre_tag.get_text("\n", strip=True)
    else:
        logger.warning("No <pre> tag found, using full body text instead.")
        schedule_text = soup.get_text("\n", strip=True)

    # Log a snippet of the extracted schedule text for debugging.
    logger.debug("Extracted Schedule Text: %s", schedule_text[:1000])

    # Split the text into lines.
    lines = schedule_text.split("\n")
    if len(lines) < 2:
        logger.error("Not enough lines found in the schedule text.")
        return None

    # Extract school name and year.
    school_name = lines[0].strip()

    year_match = re.search(r'\d{4}', lines[1])
    year = year_match.group() if year_match else ""
    
    # Initialize schedule data.
    schedule_data = {
        "school_name": school_name,
        "year": year,
        "games": []
    }

    # Find the header row to determine where game data starts.
    start_index = None
    header_pattern = re.compile(r'\bDate\b.*\bTime\b.*\bAt\b.*\bOpponent\b.*\bLocation\b', re.IGNORECASE)
    for i, line in enumerate(lines):
        if header_pattern.search(line):
            start_index = i + 1
            break

    if start_index is None:
        logger.error("Could not find game schedule header in the text.")
        return None

    # Process game lines.
    for line in lines[start_index:]:
        if not line.strip():
            continue

        # Split by multiple spaces.
        parts = re.split(r'\s{2,}', line.strip())
        if len(parts) < 5:  # Adjust if needed to account for optional results.
            logger.debug("Skipping malformed line: %s", line)
            continue

        # Unpack the first five columns.
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
        logger.error("No games were parsed from the schedule.")
        return None

    return schedule_data
