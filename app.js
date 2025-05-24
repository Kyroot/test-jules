// Mock user's current location (e.g., business headquarters in Moldova)
// This can be replaced with actual geolocation if needed.
const HQ_LOCATION = { lat: 47.0105, lng: 28.8638 }; // Chișinău, Moldova

// Mock Driver Data
const mockDrivers = [
    {
        id: 1,
        name: 'Driver Alex',
        location: { lat: 47.0255, lng: 28.8300 }, // Initial location near Chișinău
        marker: null,
        color: 'blue' // For default Google Maps pins, this won't directly apply without custom icons/logic
    },
    {
        id: 2,
        name: 'Driver Maria',
        location: { lat: 46.9980, lng: 28.9100 }, // Another initial location
        marker: null,
        color: 'green'
    },
    {
        id: 3,
        name: 'Driver Vasile',
        location: { lat: 47.0050, lng: 28.8000 }, // Third driver
        marker: null,
        color: 'purple'
    }
];
const DRIVER_ICON_URL = 'http://maps.google.com/mapfiles/ms/icons/blue-dot.png'; // A generic blue dot

// Package Data
let packages = [];
const PACKAGE_ICON_URL = 'http://maps.google.com/mapfiles/ms/icons/yellow-dot.png'; // Changed to yellow for packages

// Global map variable
let map;

/**
 * Initializes the Google Map.
 * This function is intended to be called by the Google Maps API script callback.
 */
function initMap() {
    if (typeof google === 'undefined' || typeof google.maps === 'undefined') {
        console.error('Google Maps API not loaded.');
        // Display a message to the user in the map container
        const mapContainer = document.getElementById('map-container');
        if (mapContainer) {
            mapContainer.innerHTML = '<p>Error: Google Maps API could not be loaded. Please ensure you have a valid API key and internet connection.</p>';
        }
        return;
    }

    map = new google.maps.Map(document.getElementById('map-container'), {
        center: HQ_LOCATION,
        zoom: 7, // Zoom level to see Moldova and surrounding regions
    });

    console.log('Map initialized.');
    // Example: Add a marker for the HQ
    addMarker(HQ_LOCATION, 'Business HQ');

    initializeDrivers(); // Initialize driver markers

    // Simulate driver movement every 5 seconds
    setInterval(simulateDriverMovement, 5000);
}

/**
 * Adds a marker to the map.
 * @param {object} location - An object with lat and lng properties (e.g., { lat: 47.0105, lng: 28.8638 }).
 * @param {string} title - The title for the marker (tooltip).
 * @param {string} iconUrl - Optional URL for a custom marker icon.
 */
function addMarker(location, title, iconUrl) {
    if (!map) {
        console.error('Map is not initialized yet.');
        return null;
    }
    if (typeof google === 'undefined' || typeof google.maps === 'undefined') {
        console.error('Google Maps API not loaded. Cannot add marker.');
        return null;
    }

    const markerOptions = {
        position: location,
        map: map,
        title: title,
    };

    if (iconUrl) {
        markerOptions.icon = iconUrl;
    }

    const marker = new google.maps.Marker(markerOptions);
    console.log(`Marker added for "${title}" at`, location);
    return marker;
}

/**
 * Initializes markers for all drivers.
 */
function initializeDrivers() {
    if (!map) {
        console.error('Map is not initialized. Cannot initialize drivers.');
        return;
    }
    mockDrivers.forEach(driver => {
        // Using a generic icon for all drivers for now
        driver.marker = addMarker(driver.location, driver.name, DRIVER_ICON_URL);
        if (driver.marker) {
            console.log(`Driver ${driver.name} initialized on map.`);
        } else {
            console.error(`Failed to create marker for driver ${driver.name}.`);
        }
    });
}

/**
 * Simulates the movement of drivers by updating their marker positions.
 */
function simulateDriverMovement() {
    if (!map) return; // Don't run if map isn't ready

    mockDrivers.forEach(driver => {
        if (driver.marker) {
            // Simulate a small random change in location
            const newLat = driver.location.lat + (Math.random() - 0.5) * 0.01; // Adjust range as needed
            const newLng = driver.location.lng + (Math.random() - 0.5) * 0.01; // Adjust range as needed

            driver.location = { lat: newLat, lng: newLng };

            if (typeof google !== 'undefined' && typeof google.maps !== 'undefined') {
                driver.marker.setPosition(new google.maps.LatLng(newLat, newLng));
            }
        }
    });
    console.log('Simulated driver movement. Positions updated.');
}

/**
 * Adds a new package to the system and displays it on the map.
 * @param {string} description - The package description.
 * @param {object} location - An object with lat and lng for pickup.
 */
function addPackage(description, location) {
    if (!map) {
        console.error('Map is not initialized. Cannot add package.');
        alert('Map is not ready. Please wait and try again.');
        return;
    }
    const newPackage = {
        id: Date.now(), // Simple unique ID
        description: description,
        location: location,
        status: 'pending', // Initial status
        marker: null
    };

    newPackage.marker = addMarker(location, `Package: ${description}`, PACKAGE_ICON_URL);
    if (newPackage.marker) {
        packages.push(newPackage);
        console.log('New package added:', newPackage);
        updatePendingPickupsList();
    } else {
        console.error('Failed to create marker for new package.');
        alert('Could not add package marker to the map.');
    }
}

/**
 * Updates the list of pending pickups in the UI.
 */
function updatePendingPickupsList() {
    const pickupsListElement = document.getElementById('pending-pickups-list');
    if (!pickupsListElement) {
        console.error('Pending pickups list element not found.');
        return;
    }

    pickupsListElement.innerHTML = ''; // Clear existing list items

    const pendingPackages = packages.filter(pkg => pkg.status === 'pending');

    if (pendingPackages.length === 0) {
        pickupsListElement.innerHTML = '<li>No pending packages.</li>';
        return;
    }

    pendingPackages.forEach(pkg => {
        const listItem = document.createElement('li');
        listItem.textContent = `ID: ${pkg.id} - ${pkg.description} (Lat: ${pkg.location.lat.toFixed(4)}, Lng: ${pkg.location.lng.toFixed(4)})`;
        // Add more details or actions here if needed later (e.g., a button to mark as picked up)
        pickupsListElement.appendChild(listItem);
    });
}


// --- DOMContentLoaded ---
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM fully loaded and parsed.');

    const newPackageForm = document.getElementById('new-package-form');
    if (newPackageForm) {
        newPackageForm.addEventListener('submit', function(event) {
            event.preventDefault();

            const descriptionInput = document.getElementById('package-description');
            const latInput = document.getElementById('pickup-lat');
            const lngInput = document.getElementById('pickup-lng');

            if (!descriptionInput || !latInput || !lngInput) {
                console.error('One or more form elements not found for new package.');
                alert('Error: Package form elements are missing.');
                return;
            }
            
            const description = descriptionInput.value.trim();
            const lat = latInput.value.trim();
            const lng = lngInput.value.trim();

            if (!description || !lat || !lng) {
                alert('Please fill in all package details.');
                return;
            }

            const latitude = parseFloat(lat);
            const longitude = parseFloat(lng);

            if (isNaN(latitude) || isNaN(longitude)) {
                alert('Latitude and Longitude must be valid numbers.');
                return;
            }

            addPackage(description, { lat: latitude, lng: longitude });
            
            // Reset form
            descriptionInput.value = '';
            latInput.value = '';
            lngInput.value = '';
        });
    } else {
        console.warn('New package form not found.');
    }

    // If Google Maps API is not loaded (e.g. API key missing), 
    // the initMap callback won't be called.
    // We add a fallback here to inform the user if the map doesn't load after a few seconds.
    // Note: The `YOUR_API_KEY` in index.html must be replaced for the map to load.
    if (document.querySelector('script[src*="maps.googleapis.com/maps/api/js"]')) {
        setTimeout(() => {
            if (!map && document.getElementById('map-container') && !document.getElementById('map-container').hasChildNodes()) {
                 const mapContainer = document.getElementById('map-container');
                 mapContainer.innerHTML = `
                    <p>Map is taking a while to load or Google Maps API script failed.</p>
                    <p>Please ensure you have replaced "YOUR_API_KEY" in <code>index.html</code> with a valid Google Maps API key and have an internet connection.</p>
                    <p>If you have just added the key, try refreshing the page.</p>`;
                 mapContainer.style.display = 'flex';
                 mapContainer.style.flexDirection = 'column';
                 mapContainer.style.alignItems = 'center';
                 mapContainer.style.justifyContent = 'center';
                 mapContainer.style.textAlign = 'center';
            }
        }, 5000); // Check after 5 seconds
    } else {
        const mapContainer = document.getElementById('map-container');
        if (mapContainer) {
            mapContainer.innerHTML = `
                <p>Google Maps API script is not included in <code>index.html</code>.</p>
                <p>Please add the script tag with your API key, similar to this example:</p>
                <pre><code>&lt;script src="https://maps.googleapis.com/maps/api/js?key=YOUR_API_KEY&callback=initMap" async defer&gt;&lt;/script&gt;</code></pre>`;
            mapContainer.style.display = 'flex';
            mapContainer.style.flexDirection = 'column';
            mapContainer.style.alignItems = 'center';
            mapContainer.style.justifyContent = 'center';
            mapContainer.style.textAlign = 'center';
        }
    }
});

// Example of how initMap would be called if the API script was properly included and loaded:
// window.initMap = initMap; 
// However, the actual call is done via the 'callback=initMap' parameter in the Google Maps API script URL.
// So, ensure `initMap` is a global function.
