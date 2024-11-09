-- Users table to store user information and Paciolan account ID
CREATE TABLE IF NOT EXISTS Users (
    user_id INTEGER PRIMARY KEY AUTOINCREMENT,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    paciolan_account_id TEXT UNIQUE NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Tickets table to store ticket information
CREATE TABLE IF NOT EXISTS Tickets (
    ticket_id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_code TEXT NOT NULL,
    event_name TEXT NOT NULL,
    season_code TEXT NOT NULL,
    section TEXT NOT NULL,
    row TEXT NOT NULL,
    seat_number TEXT NOT NULL,
    barcode TEXT UNIQUE,
    price REAL NOT NULL,
    is_transferrable BOOLEAN DEFAULT 0,
    is_listed BOOLEAN DEFAULT 0,
    owner_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (owner_id) REFERENCES Users(user_id)
);

-- Listings table to store ticket listings for resale
CREATE TABLE IF NOT EXISTS Listings (
    listing_id INTEGER PRIMARY KEY AUTOINCREMENT,
    ticket_id INTEGER NOT NULL,
    seller_id INTEGER NOT NULL,
    price REAL NOT NULL,
    status TEXT CHECK(status IN ('Available', 'Sold', 'Cancelled')) DEFAULT 'Available',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (ticket_id) REFERENCES Tickets(ticket_id),
    FOREIGN KEY (seller_id) REFERENCES Users(user_id)
);

-- Orders table to track ticket orders
CREATE TABLE IF NOT EXISTS Orders (
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
    listing_id INTEGER,
    FOREIGN KEY (ticket_id) REFERENCES Tickets(ticket_id),
    FOREIGN KEY (seller_id) REFERENCES Users(user_id),
    FOREIGN KEY (buyer_id) REFERENCES Users(user_id),
    FOREIGN KEY (listing_id) REFERENCES Listings(listing_id)
);

-- Transfers table to track ticket transfers
CREATE TABLE IF NOT EXISTS Transfers (
    transfer_id INTEGER PRIMARY KEY AUTOINCREMENT,
    ticket_id INTEGER NOT NULL,
    transfer_status TEXT CHECK(transfer_status IN ('Pending', 'Accepted', 'Failed')) DEFAULT 'Pending',
    recipient_email TEXT NOT NULL,
    transfer_id_api TEXT UNIQUE,
    transfer_url TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (ticket_id) REFERENCES Tickets(ticket_id)
);

-- API_Logs table to track API interactions
CREATE TABLE IF NOT EXISTS API_Logs (
    log_id INTEGER PRIMARY KEY AUTOINCREMENT,
    request_type TEXT NOT NULL,
    response_code INTEGER NOT NULL,
    status TEXT CHECK(status IN ('Success', 'Error')) DEFAULT 'Success',
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
);
