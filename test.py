import requests

url = "https://gobearcats.com/services/schedule_txt.ashx?schedule=530"
headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
}

response = requests.get(url, headers=headers)
print(response.status_code, response.text[:500])
