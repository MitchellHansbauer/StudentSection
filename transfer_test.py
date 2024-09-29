from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options

def click_back_button(url):
    # Specify the path to chromedriver using forward slashes for the path
    driver_path = "C:/Users/mitch/Downloads/chromedriver-win64/chromedriver-win64/chromedriver.exe"
    service = Service(executable_path=driver_path)
    options = Options()

    # You can enable or disable headless mode as needed
    # options.headless = True  # Uncomment if you want to run in headless mode

    # Additional options to avoid crashes in headless mode
    options.add_argument('--disable-gpu')
    options.add_argument('--no-sandbox')
    options.add_argument('--disable-dev-shm-usage')

    # Initialize the driver
    driver = webdriver.Chrome(service=service, options=options)

    try:
        # Navigate to the page
        driver.get(url)

        # Wait for the page to load
        driver.implicitly_wait(10)

        # Find the "Back to Home" button using XPath and click it
        back_button = driver.find_element(By.XPATH, '//button[contains(text(), "Back to Home")]')
        back_button.click()

        print("Clicked the 'Back to Home' button successfully.")

    finally:
        # Clean up by closing the driver
        driver.quit()

if __name__ == "__main__":
    # URL of the page
    url = "https://gobearcats.evenue.net/myaccount/transfers/seasons"
    click_back_button(url)
