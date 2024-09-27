from flask import Flask, request
import transfer_test  # Import the Selenium test script
import logging

# Initialize the Flask app
app = Flask(__name__)

# Set up logging
logging.basicConfig(filename='logs/transfer_test.log', level=logging.INFO)

@app.route('/run-selenium', methods=['POST'])
def run_selenium():
    search_query = request.form['query']
    
    try:
        # Call the Selenium script and capture the result
        result = transfer_test.run_selenium_test(search_query)
        logging.info(f"Selenium test ran successfully for query: {search_query}")
        return f'Selenium test completed: {result}'
    except Exception as e:
        logging.error(f"Error running Selenium test: {str(e)}")
        return f'Error running Selenium test: {str(e)}', 500

if __name__ == '__main__':
    app.run(debug=True)
