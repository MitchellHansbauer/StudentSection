-- Create Users table
CREATE TABLE Users (
    user_id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id TEXT UNIQUE NOT NULL,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
); 



-- Create Events table
CREATE TABLE Events (
    event_id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_name TEXT NOT NULL,
    event_date DATE NOT NULL,
    event_time TIME,
    location TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Create Tickets table
CREATE TABLE Tickets (
    ticket_id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_id INTEGER NOT NULL,
    owner_id INTEGER NOT NULL,
    barcode TEXT UNIQUE,
    unique_id TEXT UNIQUE,
    seat_number TEXT,
    price REAL NOT NULL,
    price_level TEXT,
    price_type TEXT,
    status TEXT CHECK(status IN ('Available', 'Locked', 'Sold')) DEFAULT 'Available',
    print_status TEXT CHECK(print_status IN ('Not Issued', 'Issued')) DEFAULT 'Not Issued',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (event_id) REFERENCES Events(event_id),
    FOREIGN KEY (owner_id) REFERENCES Users(user_id)
);

-- Create Orders table to handle all transactions, including resales
CREATE TABLE Orders (
    order_id INTEGER PRIMARY KEY AUTOINCREMENT,
    ticket_id INTEGER NOT NULL,
    seller_id INTEGER,
    buyer_id INTEGER,
    resale_price REAL,
    transaction_amount REAL NOT NULL,
    status TEXT CHECK(status IN ('Pending', 'Completed', 'Failed')) DEFAULT 'Pending',
    transaction_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (ticket_id) REFERENCES Tickets(ticket_id),
    FOREIGN KEY (seller_id) REFERENCES Users(user_id),
    FOREIGN KEY (buyer_id) REFERENCES Users(user_id)
);

-- Create API_Logs table to track API interactions
CREATE TABLE API_Logs (
    log_id INTEGER PRIMARY KEY AUTOINCREMENT,
    request_type TEXT NOT NULL,
    response_code INTEGER NOT NULL,
    status TEXT CHECK(status IN ('Success', 'Error')) DEFAULT 'Success',
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
);
