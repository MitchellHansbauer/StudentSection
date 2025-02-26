# Setting Up Student Section

## Prerequisites
Before getting started, ensure you have the following installed on your machine:
- **Python** (latest version recommended)
- **Node.js & npm** (for the frontend)
- **Virtual Environment** (for Python dependencies)
- **MongoDB:** Ensure IP address is whitelisted in Mongo
- **Redis:** Set up Docker container (TBD)
## 🛠Installation & Setup
### 1️⃣ Set Up the Backend
1. **Create & Activate a Virtual Environment** (if not already set up):
   ```sh
   python -m venv venv  # Create a virtual environment
   source venv/bin/activate  # Mac/Linux
   venv\Scripts\activate  # Windows
   ```
2. **Install Python Dependencies**:
   ```sh
   pip install -r requirements.txt
   ```
3. **Generate Redis Secret Key**:
   ```sh
   python -c 'import secrets; print(secrets.token_hex())'
   export SECRET_KEY=<TOKEN_FROM_ABOVE>
   ```
   Note: use _set_ if on Windows
4. **Start the Backend**:
   ```sh
   python app.py
   ```

### 2️⃣ Set Up the Frontend
1. **Navigate to the Frontend Directory**:
   ```sh
   cd student-section-frontend
   ```
2. **Install React Dependencies**:
   ```sh
   npm ci
   ```
3. **Start the Frontend**:
   ```sh
   npm start
   ```

## Final Steps
- Your **backend** should now be running on `http://127.0.0.1:5000`
- Your **frontend** should be accessible at `http://localhost:3000`
- Keep both processes running in **separate terminal windows** or **use a split terminal**
