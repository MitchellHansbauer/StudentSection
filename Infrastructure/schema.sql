USE StudentSection;

-- Create Users table
CREATE TABLE Users (
    user_id INT PRIMARY KEY IDENTITY(1,1),
    student_id VARCHAR(50) UNIQUE NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at DATETIME DEFAULT GETDATE(),
    updated_at DATETIME DEFAULT GETDATE()
);

-- Create Events table
CREATE TABLE Events (
    event_id INT PRIMARY KEY IDENTITY(1,1),
    event_name VARCHAR(255) NOT NULL,
    event_date DATE NOT NULL,
    event_time TIME,
    location VARCHAR(255) NOT NULL,
    created_at DATETIME DEFAULT GETDATE(),
    updated_at DATETIME DEFAULT GETDATE()
);

-- Create Tickets table
CREATE TABLE Tickets (
    ticket_id INT PRIMARY KEY IDENTITY(1,1),
    event_id INT NOT NULL,
    owner_id INT NOT NULL,
    barcode VARCHAR(100) UNIQUE,
    unique_id VARCHAR(100) UNIQUE,
    seat_number VARCHAR(50),
    price DECIMAL(10, 2) NOT NULL,
    price_level VARCHAR(50),
    price_type VARCHAR(50),
    status VARCHAR(50) CHECK(status IN ('Available', 'Locked', 'Sold')) DEFAULT 'Available',
    print_status VARCHAR(50) CHECK(print_status IN ('Not Issued', 'Issued')) DEFAULT 'Not Issued',
    created_at DATETIME DEFAULT GETDATE(),
    updated_at DATETIME DEFAULT GETDATE(),
    FOREIGN KEY (event_id) REFERENCES Events(event_id),
    FOREIGN KEY (owner_id) REFERENCES Users(user_id)
);

-- Create Orders table to handle all transactions, including resales
CREATE TABLE Orders (
    order_id INT PRIMARY KEY IDENTITY(1,1),
    ticket_id INT NOT NULL,
    seller_id INT,
    buyer_id INT,
    resale_price DECIMAL(10, 2),
    transaction_amount DECIMAL(10, 2) NOT NULL,
    status VARCHAR(50) CHECK(status IN ('Pending', 'Completed', 'Failed')) DEFAULT 'Pending',
    transaction_date DATETIME DEFAULT GETDATE(),
    created_at DATETIME DEFAULT GETDATE(),
    updated_at DATETIME DEFAULT GETDATE(),
    FOREIGN KEY (ticket_id) REFERENCES Tickets(ticket_id),
    FOREIGN KEY (seller_id) REFERENCES Users(user_id),
    FOREIGN KEY (buyer_id) REFERENCES Users(user_id)
);

-- Create API_Logs table to track API interactions
CREATE TABLE API_Logs (
    log_id INT PRIMARY KEY IDENTITY(1,1),
    request_type VARCHAR(50) NOT NULL,
    response_code INT NOT NULL,
    status VARCHAR(50) CHECK(status IN ('Success', 'Error')) DEFAULT 'Success',
    timestamp DATETIME DEFAULT GETDATE()
);
