from bs4 import BeautifulSoup

def parse_html_schedule(html_content):
    soup = BeautifulSoup(html_content, 'html.parser')
    schedule_data = {
        "school_name": "",
        "year": "",
        "games": []
    }

    # Example parsing logic (to be customized based on actual HTML structure)
    # Extract school name and year
    header = soup.find('h1')
    if header:
        schedule_data["school_name"] = header.text.strip()

    # Extract game details
    games_table = soup.find('table', {'id': 'schedule'})
    if games_table:
        for row in games_table.find_all('tr')[1:]:  # Skip header row
            cols = row.find_all('td')
            if len(cols) >= 5:
                game = {
                    "date": cols[0].text.strip(),
                    "time": cols[1].text.strip(),
                    "location": cols[2].text.strip(),
                    "opponent": cols[3].text.strip(),
                    "result": cols[4].text.strip()
                }
                schedule_data["games"].append(game)

    return schedule_data if schedule_data["games"] else None
