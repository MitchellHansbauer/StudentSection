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

-- Create Tickets table
CREATE TABLE Tickets (
    ticket_id INT PRIMARY KEY IDENTITY(1,1),
    resale_id VARCHAR(50) UNIQUE NOT NULL,
    event_name VARCHAR(255) NOT NULL,
    event_date DATE NOT NULL,
    seat_number VARCHAR(50),
    price DECIMAL(10, 2) NOT NULL,
    status VARCHAR(50) DEFAULT 'Available',
    created_at DATETIME DEFAULT GETDATE(),
    updated_at DATETIME DEFAULT GETDATE()
);

-- Create Resales table
CREATE TABLE Resales (
    resale_id INT PRIMARY KEY IDENTITY(1,1),
    seller_id INT NOT NULL,
    ticket_id INT NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    status VARCHAR(50) DEFAULT 'Available',
    created_at DATETIME DEFAULT GETDATE(),
    updated_at DATETIME DEFAULT GETDATE(),
    FOREIGN KEY (seller_id) REFERENCES Users(user_id),
    FOREIGN KEY (ticket_id) REFERENCES Tickets(ticket_id)
);

-- Create Transactions table
CREATE TABLE Transactions (
    transaction_id INT PRIMARY KEY IDENTITY(1,1),
    resale_id INT NOT NULL,
    buyer_id INT NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    status VARCHAR(50) DEFAULT 'Pending',
    transaction_date DATETIME DEFAULT GETDATE(),
    FOREIGN KEY (resale_id) REFERENCES Resales(resale_id),
    FOREIGN KEY (buyer_id) REFERENCES Users(user_id)
);

-- Create API_Logs table
CREATE TABLE API_Logs (
    log_id INT PRIMARY KEY IDENTITY(1,1),
    request_type VARCHAR(50) NOT NULL,
    response_code INT NOT NULL,
    status VARCHAR(50) DEFAULT 'Success',
    timestamp DATETIME DEFAULT GETDATE()
);
