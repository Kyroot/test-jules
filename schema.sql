-- Database: package_tracker_db (Conceptual - use this name if creating manually)

-- Users Table (for Admin Authentication)
CREATE TABLE Users (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'admin',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Drivers Table
CREATE TABLE Drivers (
    driver_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    contact_info VARCHAR(255),
    current_lat DECIMAL(10, 8),
    current_lng DECIMAL(11, 8),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Packages Table
CREATE TABLE Packages (
    package_id INT AUTO_INCREMENT PRIMARY KEY,
    unique_tracking_number VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    number_abroad VARCHAR(100),
    local_number VARCHAR(100),
    weight_kg DECIMAL(7, 2),
    direction VARCHAR(100) NOT NULL,
    sender_name VARCHAR(255) NOT NULL,
    recipient_name VARCHAR(255) NOT NULL,
    delivery_address TEXT NOT NULL,
    pickup_address_details TEXT, -- Can store ZIP for custom, or name of predefined location
    pickup_lat DECIMAL(10, 8),   -- For actual geocoded/predefined pickup coords
    pickup_lng DECIMAL(11, 8),   -- For actual geocoded/predefined pickup coords
    assigned_driver_id INT,
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (assigned_driver_id) REFERENCES Drivers(driver_id) ON DELETE SET NULL ON UPDATE CASCADE
);

-- Optional: Indexes for performance
CREATE INDEX idx_package_status ON Packages(status);
CREATE INDEX idx_package_assigned_driver ON Packages(assigned_driver_id);
CREATE INDEX idx_driver_name ON Drivers(name);

-- Note: DECIMAL(10, 8) for latitude allows for +/- 90.00000000
-- Note: DECIMAL(11, 8) for longitude allows for +/- 180.00000000

-- Predefined Pickup Locations Table
CREATE TABLE PredefinedPickupLocations (
    location_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL, -- e.g., "Chisinau North Depot"
    address_details TEXT,         -- Optional: More specific address or notes
    lat DECIMAL(10, 8) NOT NULL,
    lng DECIMAL(11, 8) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE, -- To allow deactivating without deleting
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Optional: Add some initial sample data (useful for development)
-- This would typically be done via seeding scripts or admin UI later,
-- but including a few here for immediate use after table creation.
INSERT INTO PredefinedPickupLocations (name, address_details, lat, lng) VALUES
('Chisinau North Depot', 'Str. Calea Moșilor, Chișinău', 47.0583, 28.8431),
('Chisinau South Terminal', 'Bd. Dacia, Chișinău', 46.9683, 28.8518),
('Balti Central Hub', 'Str. Independenței, Bălți', 47.7599, 27.9199);
