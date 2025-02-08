from bs4 import BeautifulSoup
import re

def parse_html_schedule(html_content):
    """
    Parses raw HTML or plain text schedule data and extracts games.
    """
    soup = BeautifulSoup(html_content, 'html5lib')

    # Try finding the <pre> tag first
    pre_tag = soup.find('pre')
    if pre_tag:
        schedule_text = pre_tag.get_text("\n", strip=True)
    else:
        print("Warning: No <pre> tag found, using full body text instead.")
        schedule_text = soup.get_text("\n", strip=True)  # Fallback to extracting text from the whole body

    # Log extracted text for debugging
    print("Extracted Schedule Text:", schedule_text[:1000])

    # Split lines
    lines = schedule_text.split("\n")

    # Initialize schedule data
    schedule_data = {
        "school_name": lines[0].strip(),
        "year": re.search(r'\d{4}', lines[1]).group() if re.search(r'\d{4}', lines[1]) else "",
        "games": []
    }

    # Find the starting index of the schedule games
    try:
        start_index = lines.index("Date           Time            At     Opponent        Location                                       Tournament   Result ") + 1
    except ValueError:
        print("Error: Could not find game schedule header in the text.")
        return None  # Return None if we can't find where the games start

    # Process game lines
    for line in lines[start_index:]:
        if line.strip() == "":
            continue

        # Split by multiple spaces (since the table uses irregular spacing)
        parts = re.split(r'\s{2,}', line.strip())

        if len(parts) < 6:
            print(f"Skipping malformed line: {line}")
            continue

        date, time, at, opponent, location, result = parts[:6]  # Extract first 6 columns

        game = {
            "date": date,
            "time": time,
            "home_or_away": "Home" if at.lower() == "home" else "Away",
            "opponent": opponent,
            "location": location,
            "result": result
        }

        schedule_data["games"].append(game)

    return schedule_data if schedule_data["games"] else None
