from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

def login_and_click_back(url, email, password):
    driver_path = "C:/Users/mitch/Downloads/chromedriver-win64/chromedriver-win64/chromedriver.exe"
    service = Service(executable_path=driver_path)
    options = Options()

    options.add_argument('--disable-gpu')
    options.add_argument('--no-sandbox')
    options.add_argument('--disable-dev-shm-usage')
    options.add_argument("user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.36")

    driver = webdriver.Chrome(service=service, options=options)
    wait = WebDriverWait(driver, 20)

    try:
        driver.get(url)

        # Email input and proceed to password
        email_input = wait.until(EC.visibility_of_element_located((By.XPATH, '//input[@id="signin-email-input"]')))
        email_input.send_keys(email)
        continue_button = driver.find_element(By.XPATH, '//button[@data-testid="signin-submit-btn"]')
        continue_button.click()

        # Password input and sign in
        password_input = wait.until(EC.visibility_of_element_located((By.XPATH, '//input[@data-testid="signin-pass-input"]')))
        password_input.send_keys(password)
        sign_in_button = driver.find_element(By.XPATH, '//button[@data-testid="signin-submit-btn"]')
        sign_in_button.click()

        # Assuming there might be a loading or transition, wait until the expected button or page element is visible
        back_button = wait.until(EC.visibility_of_element_located((By.XPATH, '//button[contains(text(), "Back to Home")]')))
        back_button.click()

        print("Logged in and clicked the 'Back to Home' button successfully.")

    finally:
        driver.quit()

if __name__ == "__main__":
    url = "https://gobearcats.evenue.net/myaccount/transfers/seasons"
    email = "hansbama@mail.uc.edu"
    password = "Time2add"
    login_and_click_back(url, email, password)
