// backend.js

const HQ_LOCATION = { lat: 47.0105, lng: 28.8638 }; // Chișinău, Moldova
const DRIVER_ICON_URL = 'http://maps.google.com/mapfiles/ms/icons/blue-dot.png';
const PACKAGE_ICON_URL = 'http://maps.google.com/mapfiles/ms/icons/yellow-dot.png';

let mockDrivers = [
    {
        id: 1,
        name: 'Driver Alex',
        location: { lat: 47.0255, lng: 28.8300 }, // Initial location near Chișinău
        // marker: null, // Marker is a UI concern, remove from backend data
        color: 'blue'
    },
    {
        id: 2,
        name: 'Driver Maria',
        location: { lat: 46.9980, lng: 28.9100 }, // Another initial location
        // marker: null,
        color: 'green'
    },
    {
        id: 3,
        name: 'Driver Vasile',
        location: { lat: 47.0050, lng: 28.8000 }, // Third driver
        // marker: null,
        color: 'purple'
    }
];
let packages = [];

// "API" functions
function getDrivers() {
    return JSON.parse(JSON.stringify(mockDrivers)); // Return a copy to simulate immutability
}

function getPackages() {
    return JSON.parse(JSON.stringify(packages)); // Return a copy
}

function getHqLocation() {
    return JSON.parse(JSON.stringify(HQ_LOCATION));
}

function getDriverIconUrl() {
    return DRIVER_ICON_URL;
}

function getPackageIconUrl() {
    return PACKAGE_ICON_URL;
}

const predefinedPickupLocations = [
    { id: 'chisinau_north', name: 'Chisinau North Depot (ZIP MD-2020)', location: { lat: 47.0583, lng: 28.8431 } },
    { id: 'chisinau_south', name: 'Chisinau South Terminal (ZIP MD-2070)', location: { lat: 46.9683, lng: 28.8518 } },
    { id: 'balti_central', name: 'Balti Central Hub (ZIP MD-3100)', location: { lat: 47.7599, lng: 27.9199 } },
    { id: 'orhei_logistics', name: 'Orhei Logistics Point (ZIP MD-3500)', location: { lat: 47.3831, lng: 28.8252 } },
    { id: 'custom', name: 'Custom Location (Enter Lat/Lng Below)', location: null } // Special option
];

function getPredefinedPickupLocations() {
    return JSON.parse(JSON.stringify(predefinedPickupLocations));
}

function addPackageToBackend(packageData) {
    const timestamp = Date.now();
    // More robust package code generation
    const datePart = new Date(timestamp).toISOString().slice(0,10).replace(/-/g,''); // YYYYMMDD
    const timePart = new Date(timestamp).toISOString().slice(11,19).replace(/:/g,''); // HHMMSS
    const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase(); // 4 random chars
    const generatedCode = `PKG-${datePart}-${timePart}-${randomSuffix}`;

    const newPackage = {
        id: timestamp, // Using timestamp as simple ID
        packageCode: generatedCode,
        description: packageData.description, // Optional notes
        recipientName: packageData.recipientName,
        deliveryAddress: packageData.deliveryAddress,
        pickupLocation: packageData.location, // {lat, lng} object
        status: 'pending'
    // assignedDriverId: null, // Default
    status: 'pending', // Default status
    };
    packages.push(newPackage);
    console.log('[Backend] Package added:', newPackage); // Removed "with enhanced info" for consistency
    // Notification is no longer sent from here. It's sent upon assignment.
    return JSON.parse(JSON.stringify(newPackage));
}

function assignPackageToDriver(packageId, driverId) {
    const pkg = packages.find(p => p.id === packageId);
    const driverExists = mockDrivers.some(d => d.id === driverId);

    if (pkg && driverExists && pkg.status === 'pending') {
        pkg.assignedDriverId = driverId;
        pkg.status = 'assigned';
        console.log(`[Backend] Package ${packageId} assigned to Driver ${driverId}. Status: ${pkg.status}`);
        
        // 'this' refers to window.truckingBackend as functions are defined as object methods
        // Ensure sendTelegramNotificationInternal is accessible or use this.sendTelegramNotification
        // Assuming sendTelegramNotificationInternal is the actual function name defined earlier
        sendTelegramNotificationInternal( 
            driverId,
            pkg, 
            'package_assigned_pending_acceptance' 
        );
        return JSON.parse(JSON.stringify(pkg));
    }
    console.error(`[Backend] Could not assign package ${packageId} to driver ${driverId}. Package/driver not found or package not pending.`);
    return null;
}

function acceptPackageByDriver(packageId, driverId) {
    const pkg = packages.find(p => p.id === packageId && p.assignedDriverId === driverId);
    if (pkg && pkg.status === 'assigned') {
        pkg.status = 'accepted_by_driver';
        console.log(`[Backend] Package ${packageId} accepted by Driver ${driverId}. Status: ${pkg.status}`);
        // Optionally, notify admin/system or even sender if relevant
        return JSON.parse(JSON.stringify(pkg));
    }
    console.error(`[Backend] Could not accept package ${packageId} by driver ${driverId}. Package not found, not assigned to this driver, or not in 'assigned' state.`);
    return null;
}

function declinePackageByDriver(packageId, driverId) {
    const pkg = packages.find(p => p.id === packageId && p.assignedDriverId === driverId);
    if (pkg && (pkg.status === 'assigned' || pkg.status === 'accepted_by_driver')) { 
        const previousDriverId = pkg.assignedDriverId;
        pkg.status = 'declined_by_driver'; // Or 'pending_reassignment'
        pkg.assignedDriverId = null; 
        console.log(`[Backend] Package ${packageId} declined by Driver ${previousDriverId}. Status: ${pkg.status}. It is now unassigned.`);
        // Optionally, notify admin for reassignment
        return JSON.parse(JSON.stringify(pkg));
    }
    console.error(`[Backend] Could not decline package ${packageId} by driver ${driverId}. Package not found, not assigned to this driver, or not in an assignable/acceptable state.`);
    return null;
}

function updateDriverLocationInBackend(driverId, newLocation) {
    const driver = mockDrivers.find(d => d.id === driverId);
    if (driver) {
        driver.location = newLocation;
        // console.log(`[Backend] Updated location for driver ${driverId} to`, newLocation);
        return true;
    }
    console.warn(`[Backend] Driver not found for ID: ${driverId} during location update.`);
    return false;
}

// Make functions accessible via a global object
window.truckingBackend = {
    getDrivers,
    getPackages,
    getHqLocation,
    getDriverIconUrl,
    getPackageIconUrl,
    getPredefinedPickupLocations, 
    addPackageToBackend,
    assignPackageToDriver, // Added new function
    acceptPackageByDriver, // Added new function
    declinePackageByDriver, // Added new function
    updateDriverLocationInBackend,
    sendTelegramNotification: sendTelegramNotificationInternal, 
    getDriverById: function(driverId) { 
        const driver = mockDrivers.find(d => d.id === driverId);
        return driver ? JSON.parse(JSON.stringify(driver)) : null;
    }
};

console.log('backend.js loaded and truckingBackend API initialized.');

// This is being defined before being assigned to window.truckingBackend below
// It's defined here so addPackageToBackend can call it even before the main assignment block
function sendTelegramNotificationInternal(driverId, packageInfo, messageType) {
    if (!driverId || !packageInfo || !packageInfo.pickupLocation) {
        console.error('[Backend - TelegramSim] Invalid data received for notification. Driver ID or Package Info (with pickupLocation) missing.');
        return;
    }

    const { packageCode, pickupLocation, deliveryAddress, recipientName } = packageInfo;
    const lat = pickupLocation.lat;
    const lng = pickupLocation.lng;
    const locationLink = `https://www.google.com/maps?q=${lat},${lng}`;

    let notificationMessage = `To Driver ${driverId}:\n`;
    notificationMessage += `Type: ${messageType}\n`;
    notificationMessage += `Package Code: ${packageCode}\n`;
    notificationMessage += `Recipient: ${recipientName}\n`;
    notificationMessage += `Delivery Address: ${deliveryAddress}\n`;
    notificationMessage += `Pickup Location: Lat: ${lat.toFixed(5)}, Lng: ${lng.toFixed(5)}\n`;
    notificationMessage += `Action Link: ${locationLink}\n`;
    notificationMessage += `(This link would ideally allow driver to accept/decline via the bot)\n`;

    console.info(`[Backend - TelegramSim] --- SIMULATING TELEGRAM NOTIFICATION ---`);
    console.info(notificationMessage);
    console.info(`[Backend - TelegramSim] --- END SIMULATION ---`);
}

// Assign the internal function to the truckingBackend object
window.truckingBackend.sendTelegramNotification = sendTelegramNotificationInternal;
