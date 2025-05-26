// app.js - Client-side logic

// Global map variables and state
let map; // Main dashboard map instance
let driverMap; // Driver-specific view map instance
let driverMarkers = []; // Stores marker objects for drivers on the main map
let googleMapsApiLoaded = false; // Tracks if the Google Maps API script has loaded

/**
 * Adds a new package by sending data to the backend and then displaying it on the map.
 * @param {object} packageDetails - Object containing description, recipientName, deliveryAddress, and location.
 */
function addPackage(packageDetails) {
    if (!map) {
        console.error('Map is not initialized. Cannot add package.');
        alert('Map is not ready. Please wait and try again.');
        return;
    }
    if (!window.truckingBackend) {
        console.error('Backend not available for adding package.');
        alert('Error: Cannot connect to package service.');
        return;
    }

    // packageDataForBackend is essentially packageDetails, backend will handle structure.
    const addedPackage = window.truckingBackend.addPackageToBackend(packageDetails);

    if (addedPackage) {
        const packageMarker = addMarker(
            addedPackage.pickupLocation, // Ensure this is the correct location object from backend
            `Package: ${addedPackage.packageCode} for ${addedPackage.recipientName}`, // Update marker title
            window.truckingBackend.getPackageIconUrl()
        );
        if (packageMarker) {
            console.log('New package marker added to map:', addedPackage);
        } else {
            console.error('Failed to create marker for new package on map.');
            alert('Could not add package marker to the map. Package data might be saved.');
        }
        updatePendingPickupsList(); // This will fetch all packages from backend and redraw
        document.getElementById('new-package-form').reset(); // Reset the entire form
    } else {
        console.error('Failed to add package to backend.');
        alert('Could not save package data. Please try again.');
    }
}

/**
 * Updates the list of pending pickups in the UI by fetching data from the backend.
 */
function updatePendingPickupsList() {
    const pickupsListElement = document.getElementById('pending-pickups-list');
    if (!pickupsListElement) {
        console.error('Pending pickups list element not found.');
        return;
    }
    if (!window.truckingBackend) {
        console.error('Backend not available for updating pending pickups list.');
        pickupsListElement.innerHTML = '<li>Error: Could not load package list.</li>';
        return;
    }

    pickupsListElement.innerHTML = ''; // Clear existing list items

    const pendingPackages = window.truckingBackend.getPackages().filter(pkg => pkg.status === 'pending');

    if (pendingPackages.length === 0) {
        pickupsListElement.innerHTML = '<li>No pending packages.</li>';
        return;
    }

    pendingPackages.forEach(pkg => {
        const listItem = document.createElement('li');
        let driverName = 'N/A';
        if (pkg.assignedDriverId && window.truckingBackend && window.truckingBackend.getDriverById) {
            const driver = window.truckingBackend.getDriverById(pkg.assignedDriverId);
            if (driver) {
                driverName = driver.name;
            }
        }
        
        listItem.innerHTML = `<b>Code:</b> ${pkg.packageCode} - <b>Recipient:</b> ${pkg.recipientName}<br>
                              <b>Deliver to:</b> ${pkg.deliveryAddress}<br>
                              <b>Pickup:</b> (Lat: ${pkg.pickupLocation.lat.toFixed(4)}, Lng: ${pkg.pickupLocation.lng.toFixed(4)})<br>
                              <b>Status:</b> ${pkg.status} - <b>Assigned Driver:</b> ${driverName}`;
        
        if (pkg.description && pkg.description.trim() !== '') {
            listItem.innerHTML += `<br><b>Notes:</b> ${pkg.description}`;
        }

        if (pkg.status === 'pending') {
            const assignButton = document.createElement('button');
            assignButton.textContent = 'Assign to Driver';
            assignButton.style.marginLeft = '10px';
            assignButton.style.marginTop = '5px';
            assignButton.onclick = function() {
                const driverIdString = prompt(`Enter ID of driver to assign package ${pkg.packageCode} to:`);
                if (driverIdString) {
                    const driverId = parseInt(driverIdString);
                    if (!isNaN(driverId) && window.truckingBackend.getDriverById(driverId)) {
                        const updatedPackage = window.truckingBackend.assignPackageToDriver(pkg.id, driverId);
                        if (updatedPackage) {
                            alert(`Package ${pkg.packageCode} assigned to driver ${driverId}. Driver will be notified.`);
                            updatePendingPickupsList(); 
                            const driverSelectElement = document.getElementById('driver-select');
                            if (document.getElementById('drivers-tab-content').classList.contains('active') && 
                                driverSelectElement && parseInt(driverSelectElement.value) === driverId) {
                                handleDriverSelectionChange(); 
                            }
                        } else {
                            alert('Failed to assign package. Ensure package is pending and driver ID is valid.');
                        }
                    } else {
                        alert('Invalid Driver ID entered or driver not found.');
                    }
                }
            };
            
            const br = document.createElement('br'); // Add a line break before the button
            listItem.appendChild(br);
            listItem.appendChild(assignButton);
        }
        pickupsListElement.appendChild(listItem);
    });
}


// --- DOMContentLoaded ---
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM fully loaded and parsed.');
    updatePendingPickupsList(); // Initial call

    const pickupLocationSelect = document.getElementById('pickup-location-select');
    const customLocationFieldsDiv = document.getElementById('custom-location-fields');
    const latInput = document.getElementById('pickup-lat'); // Define here for access in change listener
    const lngInput = document.getElementById('pickup-lng'); // Define here for access in change listener
    let currentPredefinedLocations = [];

    if (pickupLocationSelect && window.truckingBackend && typeof window.truckingBackend.getPredefinedPickupLocations === 'function') {
        currentPredefinedLocations = window.truckingBackend.getPredefinedPickupLocations();
        if (currentPredefinedLocations && currentPredefinedLocations.length > 0) {
            currentPredefinedLocations.forEach(loc => {
                const option = document.createElement('option');
                option.value = loc.id;
                option.textContent = loc.name;
                pickupLocationSelect.appendChild(option);
            });

            pickupLocationSelect.addEventListener('change', function() {
                if (this.value === 'custom') {
                    customLocationFieldsDiv.style.display = 'block';
                    if (latInput) latInput.required = true;
                    if (lngInput) lngInput.required = true;
                } else {
                    customLocationFieldsDiv.style.display = 'none';
                    if (latInput) latInput.required = false;
                    if (lngInput) lngInput.required = false;
                }
            });
            // Set initial state
            if (pickupLocationSelect.options.length > 0) {
                 pickupLocationSelect.value = currentPredefinedLocations[0].id; // Default to first option
            }
            pickupLocationSelect.dispatchEvent(new Event('change'));
        } else {
             console.warn('No predefined locations returned from backend or array is empty.');
             if(customLocationFieldsDiv) customLocationFieldsDiv.style.display = 'block'; // Fallback
             if (latInput) latInput.required = true;
             if (lngInput) lngInput.required = true;
        }
    } else {
        console.error('Pickup location select dropdown or backend function for predefined locations not found.');
        if(customLocationFieldsDiv) customLocationFieldsDiv.style.display = 'block'; // Fallback to always show if dropdown fails
        if (latInput) latInput.required = true;
        if (lngInput) lngInput.required = true;
    }

    const newPackageForm = document.getElementById('new-package-form');
    if (newPackageForm) {
        newPackageForm.addEventListener('submit', function(event) {
            event.preventDefault();

            const descriptionInput = document.getElementById('package-description');
            const recipientNameInput = document.getElementById('recipient-name');
            const deliveryAddressInput = document.getElementById('delivery-address');
            // latInput and lngInput are already defined above

            const selectedLocationId = pickupLocationSelect.value;
            let pickupCoords;

            if (selectedLocationId === 'custom') {
                const latStr = latInput.value.trim();
                const lngStr = lngInput.value.trim();
                if (!latStr || !lngStr) {
                    alert('Please enter Latitude and Longitude for custom location.');
                    return;
                }
                const latitude = parseFloat(latStr);
                const longitude = parseFloat(lngStr);
                if (isNaN(latitude) || isNaN(longitude)) {
                    alert('Custom Latitude and Longitude must be valid numbers.');
                    return;
                }
                pickupCoords = { lat: latitude, lng: longitude };
            } else {
                const selectedLoc = currentPredefinedLocations.find(loc => loc.id === selectedLocationId);
                if (!selectedLoc || !selectedLoc.location) {
                    alert('Invalid predefined location selected or location data missing.');
                    return;
                }
                pickupCoords = selectedLoc.location;
            }

            const recipientName = recipientNameInput.value.trim();
            const deliveryAddress = deliveryAddressInput.value.trim();

            if (!recipientName || !deliveryAddress) {
                alert('Please fill in Recipient Name and Delivery Address.');
                return;
            }
            
            const packageDataForBackend = {
                description: descriptionInput.value.trim(),
                recipientName: recipientName,
                deliveryAddress: deliveryAddress,
                location: pickupCoords 
            };
            
            addPackage(packageDataForBackend); 
            // Form reset is handled in addPackage on success.
            // Reset select to the first option and hide custom fields if necessary after submit
            if (currentPredefinedLocations && currentPredefinedLocations.length > 0) {
                pickupLocationSelect.value = currentPredefinedLocations[0].id;
            }
            pickupLocationSelect.dispatchEvent(new Event('change'));
            // The form.reset() in addPackage will clear text fields.
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
                 // Check if error message is already there from initMap
                 if (mapContainer.innerHTML.indexOf('Error: Google Maps API could not be loaded') === -1 &&
                     mapContainer.innerHTML.indexOf('Error: Backend components could not be loaded') === -1) {
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

let driverMap; // Map instance for the driver-specific view
let googleMapsApiLoaded = false; // Flag to track API load status

// Main map initialization (Overall Dashboard)
function initMap() {
    if (typeof google === 'undefined' || typeof google.maps === 'undefined') {
        console.error('Google Maps API not loaded.');
        const mapContainer = document.getElementById('map-container');
        if (mapContainer) {
            mapContainer.innerHTML = '<p>Error: Google Maps API could not be loaded. Please ensure you have a valid API key and internet connection.</p>';
        }
        return;
    }
    googleMapsApiLoaded = true; // Set flag

    if (!window.truckingBackend) {
        console.error('Backend API not loaded. Ensure backend.js is included and loaded before app.js.');
        const mapContainer = document.getElementById('map-container');
        if (mapContainer) {
            mapContainer.innerHTML = '<p>Error: Backend components could not be loaded. Please contact support.</p>';
        }
        return;
    }

    const hqLocation = window.truckingBackend.getHqLocation();
    map = new google.maps.Map(document.getElementById('map-container'), {
        center: hqLocation,
        zoom: 7,
    });

    console.log('Main Dashboard Map initialized.');
    addMarker(hqLocation, 'Business HQ', null, map); // Pass map instance

    initializeDrivers(); // Initializes drivers on the main map

    setInterval(simulateDriverMovement, 5000); // Continues to simulate for main map
}

// Driver-specific map initialization
function initDriverMap() {
    if (!googleMapsApiLoaded) {
        console.error('Google Maps API not loaded. Cannot initialize driver map.');
        return;
    }
    if (!window.truckingBackend) {
        console.error('Backend API not loaded for driver map.');
        return;
    }
    if (driverMap) { // If already initialized, just ensure it's visible and centered
        google.maps.event.trigger(driverMap, 'resize');
        console.log('Driver map already initialized. Resizing.');
        return;
    }

    const hqLocation = window.truckingBackend.getHqLocation(); // Default center
    driverMap = new google.maps.Map(document.getElementById('driver-map-container'), {
        center: hqLocation,
        zoom: 8, // Slightly more zoomed in by default
    });
    console.log('Driver Specific Map initialized.');
    // Add HQ marker to driver map too, or a marker for the currently selected driver later
    addMarker(hqLocation, 'Business HQ (Driver View)', null, driverMap);
}


// Ensure original initMap (the refactored one) is globally accessible for the Google Maps API callback
window.initMap = initMap;


// --- DOMContentLoaded ---
// (Existing DOMContentLoaded logic will be here, no changes to this outer function itself)
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM fully loaded and parsed.');
    updatePendingPickupsList(); // For the main dashboard

    // Tab Switching Logic
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabPanels = document.querySelectorAll('.tab-panel');

    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            tabButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');

            const targetTabId = button.getAttribute('data-tab');
            tabPanels.forEach(panel => {
                if (panel.id === targetTabId) {
                    panel.style.display = 'block';
                    panel.classList.add('active'); // Keep our active class for consistency
                } else {
                    panel.style.display = 'none';
                    panel.classList.remove('active');
                }
            });

            if (targetTabId === 'dashboard-tab-content') {
                if (map) { // Main map
                    google.maps.event.trigger(map, 'resize');
                } else if (googleMapsApiLoaded) { // If API loaded but map not, init it.
                    // Call the correct, globally scoped initMap
                    window.initMap(); 
                }
            } else if (targetTabId === 'drivers-tab-content') {
                if (!driverMap && googleMapsApiLoaded) {
                    initDriverMap();
                } else if (driverMap) {
                    google.maps.event.trigger(driverMap, 'resize');
                }
                // Populate driver select if not already done (or refresh if needed)
                populateDriverSelect(); 
            }
        });
    });

    // Initial setup for driver select dropdown (will be populated when tab is clicked or if backend is ready)
    const driverSelect = document.getElementById('driver-select');
    if (driverSelect) {
        driverSelect.addEventListener('change', handleDriverSelectionChange);
    }
    // Trigger click on the default active tab to ensure map visibility if it's the dashboard
    // Or to initialize driver view components if that's the default active tab (though dashboard is default)
    const activeTabButton = document.querySelector('#tab-navigation .tab-button.active');
    if (activeTabButton) {
        activeTabButton.click(); // Simulate a click to run the map logic
    }


    // Pickup Location Dropdown logic (from previous step, ensure it's still here)
    const pickupLocationSelect = document.getElementById('pickup-location-select');
    const customLocationFieldsDiv = document.getElementById('custom-location-fields');
    const latInput = document.getElementById('pickup-lat'); 
    const lngInput = document.getElementById('pickup-lng'); 
    let currentPredefinedLocations = [];

    if (pickupLocationSelect && window.truckingBackend && typeof window.truckingBackend.getPredefinedPickupLocations === 'function') {
        currentPredefinedLocations = window.truckingBackend.getPredefinedPickupLocations();
        if (currentPredefinedLocations && currentPredefinedLocations.length > 0) {
            currentPredefinedLocations.forEach(loc => {
                const option = document.createElement('option');
                option.value = loc.id;
                option.textContent = loc.name;
                pickupLocationSelect.appendChild(option);
            });

            pickupLocationSelect.addEventListener('change', function() {
                if (this.value === 'custom') {
                    customLocationFieldsDiv.style.display = 'block';
                    if (latInput) latInput.required = true;
                    if (lngInput) lngInput.required = true;
                } else {
                    customLocationFieldsDiv.style.display = 'none';
                    if (latInput) latInput.required = false;
                    if (lngInput) lngInput.required = false;
                }
            });
            if (pickupLocationSelect.options.length > 0) {
                 pickupLocationSelect.value = currentPredefinedLocations[0].id; 
            }
            pickupLocationSelect.dispatchEvent(new Event('change'));
        } else {
             console.warn('No predefined locations returned from backend or array is empty.');
             if(customLocationFieldsDiv) customLocationFieldsDiv.style.display = 'block'; 
             if (latInput) latInput.required = true;
             if (lngInput) lngInput.required = true;
        }
    } else {
        console.error('Pickup location select dropdown or backend function for predefined locations not found.');
        if(customLocationFieldsDiv) customLocationFieldsDiv.style.display = 'block'; 
        if (latInput) latInput.required = true;
        if (lngInput) lngInput.required = true;
    }

    const newPackageForm = document.getElementById('new-package-form');
    if (newPackageForm) {
        newPackageForm.addEventListener('submit', function(event) {
            event.preventDefault();
            // ... (existing form submission logic from previous step, ensure it's complete)
            const descriptionInput = document.getElementById('package-description');
            const recipientNameInput = document.getElementById('recipient-name');
            const deliveryAddressInput = document.getElementById('delivery-address');
            
            const selectedLocationId = pickupLocationSelect.value;
            let pickupCoords;

            if (selectedLocationId === 'custom') {
                const latStr = latInput.value.trim();
                const lngStr = lngInput.value.trim();
                if (!latStr || !lngStr) {
                    alert('Please enter Latitude and Longitude for custom location.');
                    return;
                }
                const latitude = parseFloat(latStr);
                const longitude = parseFloat(lngStr);
                if (isNaN(latitude) || isNaN(longitude)) {
                    alert('Custom Latitude and Longitude must be valid numbers.');
                    return;
                }
                pickupCoords = { lat: latitude, lng: longitude };
            } else {
                const selectedLoc = currentPredefinedLocations.find(loc => loc.id === selectedLocationId);
                if (!selectedLoc || !selectedLoc.location) {
                    alert('Invalid predefined location selected or location data missing.');
                    return;
                }
                pickupCoords = selectedLoc.location;
            }

            const recipientName = recipientNameInput.value.trim();
            const deliveryAddress = deliveryAddressInput.value.trim();

            if (!recipientName || !deliveryAddress) {
                alert('Please fill in Recipient Name and Delivery Address.');
                return;
            }
            
            const packageDataForBackend = {
                description: descriptionInput.value.trim(),
                recipientName: recipientName,
                deliveryAddress: deliveryAddress,
                location: pickupCoords 
            };
            
            addPackage(packageDataForBackend); 
            
            if (currentPredefinedLocations && currentPredefinedLocations.length > 0) {
                pickupLocationSelect.value = currentPredefinedLocations[0].id;
            }
            pickupLocationSelect.dispatchEvent(new Event('change'));
        });
    } else {
        console.warn('New package form not found.');
    }
    
    // Fallback map message if Google API doesn't load after some time
    // This part is simplified, assuming initMap or tab switch logic handles missing API better
    if (document.querySelector('script[src*="maps.googleapis.com/maps/api/js"]')) {
        setTimeout(() => {
            if (!googleMapsApiLoaded && 
                document.getElementById('map-container') && 
                !document.getElementById('map-container').hasChildNodes() &&
                document.getElementById('dashboard-tab-content').classList.contains('active')) {
                 const mapContainer = document.getElementById('map-container');
                 if (mapContainer.innerHTML.indexOf('Error: Google Maps API could not be loaded') === -1 &&
                     mapContainer.innerHTML.indexOf('Error: Backend components could not be loaded') === -1) {
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
            }
        }, 7000); // Increased timeout slightly
    } else {
        // ... (existing else block for missing script tag)
        const mapContainer = document.getElementById('map-container');
        if (mapContainer && document.getElementById('dashboard-tab-content').classList.contains('active')) {
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

function populateDriverSelect() {
    const driverSelect = document.getElementById('driver-select');
    if (!driverSelect || !window.truckingBackend || !window.truckingBackend.getDrivers) return;

    const drivers = window.truckingBackend.getDrivers();
    // Clear existing options except for a potential placeholder
    while (driverSelect.options.length > 0) { // Simple clear
        driverSelect.remove(0);
    }
    
    const placeholderOption = document.createElement('option');
    placeholderOption.value = "";
    placeholderOption.textContent = "-- Select a Driver --";
    placeholderOption.disabled = true;
    placeholderOption.selected = true;
    driverSelect.appendChild(placeholderOption);

    drivers.forEach(driver => {
        const option = document.createElement('option');
        option.value = driver.id;
        option.textContent = driver.name;
        driverSelect.appendChild(option);
    });
}

function handleDriverSelectionChange() {
    const driverId = parseInt(this.value); 
    const driverPackagesList = document.getElementById('driver-specific-package-list');

    if (!driverId || !window.truckingBackend || !window.truckingBackend.getDriverById) {
        driverPackagesList.innerHTML = '<li>Please select a driver.</li>';
        if(driverMap && window.truckingBackend) driverMap.setCenter(window.truckingBackend.getHqLocation()); 
        return;
    }

    const selectedDriverDetails = window.truckingBackend.getDriverById(driverId);

    if (selectedDriverDetails && selectedDriverDetails.location) {
        if (driverMap) {
            driverMap.setCenter(selectedDriverDetails.location);
            driverMap.setZoom(12);
            console.log(`Centered driver map on ${selectedDriverDetails.name}`);
        }
        
        driverPackagesList.innerHTML = ''; // Clear previous list
        const allPackages = window.truckingBackend.getPackages();
        const driverSpecificPackages = allPackages.filter(pkg => pkg.assignedDriverId === selectedDriverDetails.id);

        if (driverSpecificPackages.length === 0) {
            driverPackagesList.innerHTML = '<li>No packages currently assigned to this driver.</li>';
        } else {
            driverSpecificPackages.forEach(pkg => {
                const listItem = document.createElement('li');
                listItem.innerHTML = `<b>Package:</b> ${pkg.packageCode} - <b>Status:</b> ${pkg.status}<br><b>To:</b> ${pkg.deliveryAddress}`;

                if (pkg.status === 'assigned') {
                    const acceptBtn = document.createElement('button');
                    acceptBtn.textContent = 'Accept';
                    acceptBtn.style.marginLeft = '5px';
                    acceptBtn.style.marginTop = '5px';
                    acceptBtn.onclick = function() {
                        if(window.truckingBackend.acceptPackageByDriver(pkg.id, selectedDriverDetails.id)) {
                            alert(`Package ${pkg.packageCode} accepted.`);
                            handleDriverSelectionChange(); 
                            updatePendingPickupsList(); 
                        } else {
                            alert('Failed to accept package.');
                        }
                    };
                    
                    const declineBtn = document.createElement('button');
                    declineBtn.textContent = 'Decline';
                    declineBtn.style.marginLeft = '5px';
                    declineBtn.style.marginTop = '5px';
                    declineBtn.onclick = function() {
                        if(window.truckingBackend.declinePackageByDriver(pkg.id, selectedDriverDetails.id)) {
                            alert(`Package ${pkg.packageCode} declined.`);
                            handleDriverSelectionChange(); 
                            updatePendingPickupsList(); 
                        } else {
                            alert('Failed to decline package.');
                        }
                    };
                    
                    const br = document.createElement('br');
                    listItem.appendChild(br);
                    listItem.appendChild(acceptBtn);
                    listItem.appendChild(declineBtn);
                }
                driverPackagesList.appendChild(listItem);
            });
        }

    } else {
        driverPackagesList.innerHTML = `<li>Driver details not found or location unknown.</li>`;
        if(driverMap && window.truckingBackend) driverMap.setCenter(window.truckingBackend.getHqLocation());
    }
}

// Modify addMarker to accept a map instance argument
function addMarker(location, title, iconUrl, targetMapInstance) {
    const mapToUse = targetMapInstance || map; // Default to global 'map' if no instance provided
    if (!mapToUse) {
        console.error('Target map instance is not initialized yet.');
        return null;
    }
    if (typeof google === 'undefined' || typeof google.maps === 'undefined') {
        console.error('Google Maps API not loaded. Cannot add marker.');
        return null;
    }

    const markerOptions = {
        position: location,
        map: mapToUse,
        title: title,
    };

    if (iconUrl) {
        markerOptions.icon = iconUrl;
    }

    const marker = new google.maps.Marker(markerOptions);
    // console.log(`Marker added for "${title}" at`, location, `on map:`, mapToUse);
    return marker;
}

// Modify initializeDrivers and simulateDriverMovement to use the main map explicitly
function initializeDrivers() { // This function is for the main dashboard map
    if (!map) { // Ensure main map is the target
        console.error('Main map is not initialized. Cannot initialize drivers.');
        return;
    }
    // ... rest of the logic ...
    // Make sure calls to addMarker pass the 'map' instance
    const driversFromBackend = window.truckingBackend.getDrivers();
    const iconUrl = window.truckingBackend.getDriverIconUrl();
    
    driverMarkers = []; 

    driversFromBackend.forEach(driver => {
        const marker = addMarker(driver.location, driver.name, iconUrl, map); // Explicitly pass main map
        if (marker) {
            driverMarkers.push({ id: driver.id, marker: marker, name: driver.name });
            // console.log(`Driver ${driver.name} initialized on main map.`);
        } else {
            console.error(`Failed to create marker for driver ${driver.name} on main map.`);
        }
    });
}

function simulateDriverMovement() { // This function is for the main dashboard map drivers
    if (!map || !driverMarkers.length) return; // Check against main map
    // ... rest of the logic ...
    driverMarkers.forEach(driverRepresentation => {
        // ... (movement calculation)
        const currentPosition = driverRepresentation.marker.getPosition();
        const newLat = currentPosition.lat() + (Math.random() - 0.5) * 0.01; 
        const newLng = currentPosition.lng() + (Math.random() - 0.5) * 0.01;
        const newLocation = { lat: newLat, lng: newLng };

        const success = window.truckingBackend.updateDriverLocationInBackend(driverRepresentation.id, newLocation);
        
        if (success) {
            if (typeof google !== 'undefined' && typeof google.maps !== 'undefined') {
               driverRepresentation.marker.setPosition(new google.maps.LatLng(newLocation.lat, newLocation.lng));
            }
        } else {
            console.warn(`Failed to update backend for driver ${driverRepresentation.name}`);
        }
    });
}
