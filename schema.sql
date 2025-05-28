-- Database: package_tracker_db (Conceptual - use this name if creating manually)

-- Users Table (for Admin Authentication)
CREATE TABLE Users (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'admin', -- Should be 'admin' for web interface users
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Vehicles Table (New - replaces Drivers table)
CREATE TABLE Vehicles (
    vehicle_id INT AUTO_INCREMENT PRIMARY KEY,
    vehicle_plate_number VARCHAR(50) NOT NULL UNIQUE, -- Used as the "username" for vehicle login
    password_hash VARCHAR(255) NOT NULL,             -- Password for vehicle "login"
    display_name VARCHAR(255),                       -- e.g., "Truck 7 - John D." or "Volvo Unit 101"
    current_operator_name VARCHAR(255),              -- Name of the person currently operating (optional)
    operator_contact_info VARCHAR(255),              -- Contact for current operator (optional)
    current_lat DECIMAL(10, 8),
    current_lng DECIMAL(11, 8),
    is_active BOOLEAN DEFAULT TRUE,                  -- To allow deactivating a vehicle
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE INDEX idx_vehicle_plate_number ON Vehicles(vehicle_plate_number);

-- Packages Table (Modified)
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
    pickup_address_details TEXT,
    pickup_lat DECIMAL(10, 8),
    pickup_lng DECIMAL(11, 8),
    assigned_vehicle_id INT, -- Renamed from assigned_driver_id
    status VARCHAR(50) NOT NULL DEFAULT 'pending', -- e.g., pending, assigned, accepted_by_vehicle, declined_by_vehicle, in_transit, delivered, failed_delivery
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (assigned_vehicle_id) REFERENCES Vehicles(vehicle_id) ON DELETE SET NULL ON UPDATE CASCADE -- Updated FK
);

-- Indexes for performance
CREATE INDEX idx_package_status ON Packages(status);
CREATE INDEX idx_package_assigned_vehicle ON Packages(assigned_vehicle_id); -- New index for assigned_vehicle_id

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
INSERT INTO PredefinedPickupLocations (name, address_details, lat, lng) VALUES
('Chisinau North Depot', 'Str. Calea Moșilor, Chișinău', 47.0583, 28.8431),
('Chisinau South Terminal', 'Bd. Dacia, Chișinău', 46.9683, 28.8518),
('Balti Central Hub', 'Str. Independenței, Bălți', 47.7599, 27.9199);
