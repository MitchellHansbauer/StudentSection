-- Create Users table
CREATE TABLE Users (
    user_id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id VARCHAR(50) UNIQUE NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at DATETIME DEFAULT (CURRENT_TIMESTAMP),
    updated_at DATETIME DEFAULT (CURRENT_TIMESTAMP)
);

-- Create Tickets table
CREATE TABLE Tickets (
    ticket_id INTEGER PRIMARY KEY AUTOINCREMENT,
    resale_id VARCHAR(50) UNIQUE NOT NULL,
    event_name VARCHAR(255) NOT NULL,
    event_date DATE NOT NULL,
    seat_number VARCHAR(50),
    price DECIMAL(10, 2) NOT NULL,
    status VARCHAR(50) DEFAULT 'Available',
    created_at DATETIME DEFAULT (CURRENT_TIMESTAMP),
    updated_at DATETIME DEFAULT (CURRENT_TIMESTAMP)
);

-- Create Resales table
CREATE TABLE Resales (
    resale_id INTEGER PRIMARY KEY AUTOINCREMENT,
    seller_id INTEGER NOT NULL,
    ticket_id INTEGER NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    status VARCHAR(50) DEFAULT 'Available',
    created_at DATETIME DEFAULT (CURRENT_TIMESTAMP),
    updated_at DATETIME DEFAULT (CURRENT_TIMESTAMP),
    FOREIGN KEY (seller_id) REFERENCES Users(user_id),
    FOREIGN KEY (ticket_id) REFERENCES Tickets(ticket_id)
);

-- Create Transactions table
CREATE TABLE Transactions (
    transaction_id INTEGER PRIMARY KEY AUTOINCREMENT,
    resale_id INTEGER NOT NULL,
    buyer_id INTEGER NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    status VARCHAR(50) DEFAULT 'Pending',
    transaction_date DATETIME DEFAULT (CURRENT_TIMESTAMP),
    FOREIGN KEY (resale_id) REFERENCES Resales(resale_id),
    FOREIGN KEY (buyer_id) REFERENCES Users(user_id)
);

-- Create API_Logs table
CREATE TABLE API_Logs (
    log_id INTEGER PRIMARY KEY AUTOINCREMENT,
    request_type VARCHAR(50) NOT NULL,
    response_code INTEGER NOT NULL,
    status VARCHAR(50) DEFAULT 'Success',
    timestamp DATETIME DEFAULT (CURRENT_TIMESTAMP)
);
