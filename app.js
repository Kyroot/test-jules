// app.js - Client-side logic

// Global map variables and state
let map; // Main dashboard map instance (Leaflet)
let driverMap; // Driver-specific view map instance (Leaflet)
let driverMarkers = []; // Stores marker objects for drivers on the main map (will need Leaflet marker objects)
let currentDriverViewMarker = null; // Stores the marker for the currently selected driver on the driverMap
// googleMapsApiLoaded flag is removed

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

// Main map initialization (Overall Dashboard) for Leaflet
function initMap() {
    if (!window.truckingBackend) {
        console.error('[App] Backend API not loaded. Cannot initialize main map.');
        const mapContainer = document.getElementById('map-container');
        if (mapContainer) {
            mapContainer.innerHTML = '<p>Error: Backend components could not be loaded. Map cannot be initialized.</p>';
        }
        return;
    }
    if (typeof L === 'undefined') {
        console.error('[App] Leaflet (L) object not found. Ensure Leaflet.js is loaded.');
        const mapContainer = document.getElementById('map-container');
        if (mapContainer) {
            mapContainer.innerHTML = '<p>Error: Mapping library (Leaflet) could not be loaded.</p>';
        }
        return;
    }

    const hqLocation = window.truckingBackend.getHqLocation();
    const mapContainerElement = document.getElementById('map-container');

    if (!mapContainerElement) {
        console.error("[App] Main map container 'map-container' not found.");
        return;
    }
    if (map && typeof map.remove === 'function') { 
        map.remove();
        console.log('[App] Previous main map instance removed.');
    }
    
    map = L.map('map-container').setView([hqLocation.lat, hqLocation.lng], 7);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 18,
    }).addTo(map);

    console.log('[App] Main dashboard Leaflet map initialized.');

    // Placeholder calls - these will be updated in the next subtask to use Leaflet markers.
    addMarker({ lat: hqLocation.lat, lng: hqLocation.lng }, 'Business HQ', null, map); 
    initializeDrivers(); 
    
    setInterval(simulateDriverMovement, 5000); 
}

// Driver-specific map initialization for Leaflet
function initDriverMap() {
    if (!window.truckingBackend) {
        console.error('[App] Backend API not loaded. Cannot initialize driver map.');
        const driverMapContainer = document.getElementById('driver-map-container');
        if (driverMapContainer) {
            driverMapContainer.innerHTML = '<p>Error: Backend components could not be loaded. Map cannot be initialized.</p>';
        }
        return;
    }
     if (typeof L === 'undefined') {
        console.error('[App] Leaflet (L) object not found. Ensure Leaflet.js is loaded for driver map.');
        const driverMapContainer = document.getElementById('driver-map-container');
        if (driverMapContainer) {
            driverMapContainer.innerHTML = '<p>Error: Mapping library (Leaflet) could not be loaded.</p>';
        }
        return;
    }

    const hqLocation = window.truckingBackend.getHqLocation(); // Default center
    const driverMapContainerElement = document.getElementById('driver-map-container');

    if (!driverMapContainerElement) {
        console.error("[App] Driver map container 'driver-map-container' not found.");
        return;
    }
    if (driverMap && typeof driverMap.remove === 'function') { 
        driverMap.remove();
        console.log('[App] Previous driver map instance removed.');
    }
    
    driverMap = L.map('driver-map-container').setView([hqLocation.lat, hqLocation.lng], 7); // Changed zoom to 7 for consistency

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 18,
    }).addTo(driverMap);

    console.log('[App] Driver view Leaflet map initialized.');
    // Add HQ marker to driver map too, for context.
    addMarker({ lat: hqLocation.lat, lng: hqLocation.lng }, 'Business HQ (Driver View)', null, driverMap);
}

// window.initMap = initMap; // Removed as initMap will be called from DOMContentLoaded

// --- DOMContentLoaded ---
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
                    panel.classList.add('active'); 
                } else {
                    panel.style.display = 'none';
                    panel.classList.remove('active');
                }
            });

            if (targetTabId === 'dashboard-tab-content') {
                if (!map) { 
                    initMap(); 
                } else {
                    map.invalidateSize(); 
                }
            } else if (targetTabId === 'drivers-tab-content') {
                if (!driverMap) { 
                    initDriverMap();
                } else {
                    driverMap.invalidateSize(); 
                }
                populateDriverSelect(); 
            }
        });
    });
    
    // Initial map setup for the default active tab (Overall Dashboard)
    const activeDashboardTab = document.querySelector('#dashboard-tab-content.active');
    if (activeDashboardTab && !map) { 
        initMap();
    }

    // Initial setup for driver select dropdown (remains the same)
    const driverSelect = document.getElementById('driver-select');
    if (driverSelect) {
        driverSelect.addEventListener('change', handleDriverSelectionChange);
    }
    // No need to simulate click on activeTabButton for map initialization

    // Pickup Location Dropdown logic 
    const pickupLocationSelect = document.getElementById('pickup-location-select');
    const customLocationFieldsDiv = document.getElementById('custom-location-fields');
    const zipCodeInput = document.getElementById('pickup-zip-code'); // For setting .required
    // latInput and lngInput are removed from here as they are no longer directly in HTML for this logic
    let currentPredefinedLocations = []; // This should be populated from backend

    if (pickupLocationSelect && window.truckingBackend && typeof window.truckingBackend.getPredefinedPickupLocations === 'function') {
        currentPredefinedLocations = window.truckingBackend.getPredefinedPickupLocations(); // Populate this for later use
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
                    if (zipCodeInput) zipCodeInput.required = true;
                    // document.getElementById('pickup-country').required = true; // Country can be optional or defaulted
                } else {
                    customLocationFieldsDiv.style.display = 'none';
                    if (zipCodeInput) zipCodeInput.required = false;
                    // document.getElementById('pickup-country').required = false;
                }
            });
            if (pickupLocationSelect.options.length > 0) {
                 pickupLocationSelect.value = currentPredefinedLocations[0].id; 
            }
            pickupLocationSelect.dispatchEvent(new Event('change')); // Ensure correct initial state
        } else {
             console.warn('No predefined locations returned from backend or array is empty.');
             if (customLocationFieldsDiv) customLocationFieldsDiv.style.display = 'block'; // Fallback to show custom fields
             if (zipCodeInput) zipCodeInput.required = true;
        }
    } else {
        console.error('Pickup location select dropdown, or backend function, or zipCodeInput not found.');
        if (customLocationFieldsDiv) customLocationFieldsDiv.style.display = 'block'; // Fallback
        if (zipCodeInput) zipCodeInput.required = true;
    }

    // New Package Form Submission Logic (Restructured)
    const newPackageForm = document.getElementById('new-package-form');
    if (newPackageForm) {
        newPackageForm.addEventListener('submit', function(event) {
            event.preventDefault();
            
            const descriptionInput = document.getElementById('package-description');
            const recipientNameInput = document.getElementById('recipient-name');
            const deliveryAddressInput = document.getElementById('delivery-address');
            // pickupLocationSelect is already defined above

            const packageCoreDetails = {
                description: descriptionInput.value.trim(),
                recipientName: recipientNameInput.value.trim(),
                deliveryAddress: deliveryAddressInput.value.trim()
            };

            if (!packageCoreDetails.recipientName || !packageCoreDetails.deliveryAddress) {
                alert('Recipient Name and Delivery Address are required.');
                return;
            }

            const formElements = newPackageForm.querySelectorAll('input, button, select');
            const reEnableForm = () => formElements.forEach(el => el.disabled = false);
            formElements.forEach(el => el.disabled = true);

            const selectedLocationId = pickupLocationSelect.value;

            if (selectedLocationId === 'custom') {
                const currentZipCodeInput = document.getElementById('pickup-zip-code'); // Re-fetch in case of dynamic changes
                const countryInput = document.getElementById('pickup-country');
                const zipCode = currentZipCodeInput.value.trim();
                const country = countryInput.value.trim();

                if (!zipCode) {
                    alert('Please enter a ZIP Code for custom location.');
                    if (currentZipCodeInput) currentZipCodeInput.focus();
                    reEnableForm();
                    return;
                }
                // Call the new Nominatim function
                geocodeWithNominatim(zipCode, country, function(error, coordinates) {
                    if (error) {
                        alert(error); // Display error from Nominatim
                        reEnableForm();
                        return;
                    }
                    // On success, proceed as before
                    finishPackageAddition({ ...packageCoreDetails, location: coordinates }, currentPredefinedLocations);
                    reEnableForm(); 
                });
            } else {
                const selectedLoc = currentPredefinedLocations.find(loc => loc.id === selectedLocationId);
                if (!selectedLoc || !selectedLoc.location) {
                    alert('Invalid predefined location selected.');
                    reEnableForm();
                    return;
                }
                finishPackageAddition({ ...packageCoreDetails, location: selectedLoc.location }, currentPredefinedLocations);
                reEnableForm();
            }
        });
    } else {
        console.warn('New package form not found.');
    }
    
    // Fallback map message logic for Google Maps is removed.
    // Leaflet initialization errors are handled within initMap/initDriverMap.
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
    const driverSelectElement = document.getElementById('driver-select'); // Get the select element
    if (!driverSelectElement) return;
    
    const selectedDriverId = parseInt(driverSelectElement.value); 
    const driverPackagesList = document.getElementById('driver-specific-package-list');

    if (!selectedDriverId || !window.truckingBackend || !window.truckingBackend.getDriverById) {
        driverPackagesList.innerHTML = '<li>Please select a driver.</li>';
        if(driverMap && window.truckingBackend) driverMap.setView([window.truckingBackend.getHqLocation().lat, window.truckingBackend.getHqLocation().lng], 7); 
        if (currentDriverViewMarker && typeof currentDriverViewMarker.remove === 'function') { currentDriverViewMarker.remove(); currentDriverViewMarker = null; }
        return;
    }

    const driverDetails = window.truckingBackend.getDriverById(selectedDriverId);

    if (driverDetails && driverDetails.location) {
        if (!driverMap || typeof driverMap.addLayer !== 'function') { 
            console.error("[App] Driver map is not a valid Leaflet map instance for selection change.");
            // Attempt to initialize it; if it fails, then error out.
            initDriverMap(); 
            if (!driverMap || typeof driverMap.addLayer !== 'function') {
                driverPackagesList.innerHTML = '<li>Driver map could not be initialized.</li>';
                return; 
            }
        }
        
        driverMap.setView([driverDetails.location.lat, driverDetails.location.lng], 12);
        
        // Remove previous marker if it exists
        if (currentDriverViewMarker && typeof currentDriverViewMarker.remove === 'function') {
            currentDriverViewMarker.remove(); 
        }
        // Add new marker for the currently selected driver
        currentDriverViewMarker = addMarker(
           driverDetails.location,
           `Current Location: ${driverDetails.name}`,
           window.truckingBackend.getDriverIconUrl(), // Use driver icon
           driverMap // Target the driver-specific map
        );
        if (currentDriverViewMarker) {
            currentDriverViewMarker.openPopup(); // Open popup for the new marker
        }
        console.log(`[App] Centered driver map on ${driverDetails.name} and added/updated marker.`);
        
        driverPackagesList.innerHTML = ''; 
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

// Updated addMarker function for Leaflet
function addMarker(location, title, iconUrl, targetMapInstance) {
    const mapToUse = targetMapInstance || map; 

    if (!mapToUse || typeof mapToUse.addLayer !== 'function') { 
        console.error('[App] Invalid map instance provided to addMarker or default map not initialized.', mapToUse);
        return null;
    }
    if (!location || typeof location.lat !== 'number' || typeof location.lng !== 'number') {
        console.error('[App] Invalid location provided to addMarker:', location);
        return null;
    }
     if (typeof L === 'undefined') {
        console.error('[App] Leaflet (L) object not found. Cannot create marker.');
        return null;
    }

    let markerOptions = {};
    if (iconUrl) {
        markerOptions.icon = L.icon({
            iconUrl: iconUrl,
            iconSize: [25, 41],    
            iconAnchor: [12, 41],  
            popupAnchor: [1, -34] 
        });
    }

    const leafletMarker = L.marker([location.lat, location.lng], markerOptions).addTo(mapToUse);
    
    if (title) {
        leafletMarker.bindPopup(title);
    }
    
    // console.log(`[App] Leaflet marker added for "${title || 'Untitled'}" at [${location.lat}, ${location.lng}]`);
    return leafletMarker; 
}

// Updated initializeDrivers for Leaflet
function initializeDrivers() { 
    if (!map || typeof map.addLayer !== 'function') { 
        console.error('[App] Main Leaflet map not initialized. Cannot initialize drivers.');
        return;
    }
    if (!window.truckingBackend) {
        console.error('[App] Backend not available for initializing drivers.');
        return;
    }
    const driversFromBackend = window.truckingBackend.getDrivers();
    const iconUrl = window.truckingBackend.getDriverIconUrl();

    // Clear existing driver markers from the map and the array
    driverMarkers.forEach(dm => {
        if (dm.marker && typeof dm.marker.remove === 'function') {
            dm.marker.remove();
        }
    });
    driverMarkers = []; 

    driversFromBackend.forEach(driver => {
        const marker = addMarker(driver.location, driver.name, iconUrl, map); 
        if (marker) {
            driverMarkers.push({ id: driver.id, marker: marker, name: driver.name });
        } else {
            console.error(`[App] Failed to create Leaflet marker for driver ${driver.name}.`);
        }
    });
    console.log('[App] Leaflet driver markers initialized on main map.');
}

// Function to handle the final steps of package addition
function finishPackageAddition(packageDataForBackend, currentPredefinedLocationsArray) {
    // currentPredefinedLocationsArray is passed to ensure it's the one from the DOMContentLoaded scope
    const addedPackage = window.truckingBackend.addPackageToBackend(packageDataForBackend);
    if (addedPackage) {
        addMarker(
            addedPackage.pickupLocation, 
            `Package: ${addedPackage.packageCode} for ${addedPackage.recipientName}`, 
            window.truckingBackend.getPackageIconUrl(), 
            map // Ensure this uses the main dashboard map
        );
        updatePendingPickupsList();
        
        const formToReset = document.getElementById('new-package-form');
        if (formToReset) formToReset.reset();
        
        const pickupSelectElement = document.getElementById('pickup-location-select');
        if (pickupSelectElement && currentPredefinedLocationsArray && currentPredefinedLocationsArray.length > 0) {
            pickupSelectElement.value = currentPredefinedLocationsArray[0].id; // Reset to first predefined option
        }
        if (pickupSelectElement) pickupSelectElement.dispatchEvent(new Event('change')); // Update UI based on reset
        
        console.log('[App] Package added successfully and form reset.');
    } else {
        // This alert might be redundant if backend also alerts or if more specific error handling is done prior
        alert('Could not save package data to the backend. Please check console for errors.');
    }
}

// Updated simulateDriverMovement for Leaflet
function simulateDriverMovement() { 
    if (!map || !driverMarkers.length) return; 

    driverMarkers.forEach(driverRepresentation => {
        if (driverRepresentation.marker && typeof driverRepresentation.marker.getLatLng === 'function') {
            const currentPosition = driverRepresentation.marker.getLatLng(); // Leaflet's method
            const newLat = currentPosition.lat + (Math.random() - 0.5) * 0.01;
            const newLng = currentPosition.lng + (Math.random() - 0.5) * 0.01;
            const newLocation = { lat: newLat, lng: newLng };

            window.truckingBackend.updateDriverLocationInBackend(driverRepresentation.id, newLocation);
            driverRepresentation.marker.setLatLng([newLat, newLng]);
        }
    });
    // console.log('[App] Simulated driver movement (Leaflet). Positions updated.');
}

// In app.js
function geocodeWithNominatim(zipCode, country, callback) {
    const queryParams = new URLSearchParams({
        format: 'json',
        postalcode: zipCode,
        country: country,
        limit: 1
    });
    const url = `https://nominatim.openstreetmap.org/search?${queryParams}`;

    console.log(`[App] Attempting to geocode with Nominatim: ${url}`);

    fetch(url, {
        method: 'GET',
        headers: {
            'User-Agent': 'PackageTrackerSPA/1.0 (contact@example-app.com)' // Replace with your app's info
        }
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`Nominatim API request failed with status ${response.status}`);
        }
        return response.json();
    })
    .then(data => {
        if (data && data.length > 0) {
            const lat = parseFloat(data[0].lat);
            const lon = parseFloat(data[0].lon); // Nominatim uses 'lon'
            if (!isNaN(lat) && !isNaN(lon)) {
                console.log(`[App] Nominatim geocoding successful for "${zipCode}, ${country}":`, { lat: lat, lng: lon });
                callback(null, { lat: lat, lng: lon });
            } else {
                console.error('[App] Nominatim returned invalid lat/lon:', data[0]);
                callback('Nominatim returned invalid location data.', null);
            }
        } else {
            console.warn(`[App] Nominatim found no results for "${zipCode}, ${country}".`);
            callback(`No results found for ZIP code "${zipCode}" in "${country}". Please check the details.`, null);
        }
    })
    .catch(error => {
        console.error('[App] Error during Nominatim geocoding request:', error);
        callback(`Geocoding request failed: ${error.message}. Please try again later.`, null);
    });
}
