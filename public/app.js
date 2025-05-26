// app.js - Client-side logic

// Define static constants previously in backend.js
const HQ_LOCATION = { lat: 47.0105, lng: 28.8638 }; // Chișinău, Moldova
const DRIVER_ICON_URL = 'http://maps.google.com/mapfiles/ms/icons/blue-dot.png';
const PACKAGE_ICON_URL = 'http://maps.google.com/mapfiles/ms/icons/yellow-dot.png';

// Global map variables and state
let map; // Main dashboard map instance (Leaflet)
let driverMap; // Driver-specific view map instance (Leaflet)
let driverMarkers = []; // Stores marker objects for drivers on the main map (will need Leaflet marker objects)
let currentDriverViewMarker = null; // Stores the marker for the currently selected driver on the driverMap
let currentPredefinedLocations = [];  // Cache for predefined locations from API
let editingDriverId = null; // Stores the ID of the driver being edited

// --- Authentication related functions ---
function isUserAuthenticatedClientSide() {
    return localStorage.getItem('isAuthenticated') === 'true';
}

function getLoggedInUserInfo() {
    const user = localStorage.getItem('loggedInUser');
    return user ? JSON.parse(user) : null;
}

async function fetchApi(url, options = {}) {
    const response = await fetch(url, options);
    if (response.status === 401) {
        localStorage.removeItem('isAuthenticated');
        localStorage.removeItem('loggedInUser');
        alert('Your session has expired or you are not authorized. Please login again.');
        window.location.href = '/login';
        throw new Error('Unauthorized'); 
    }
    return response;
}

async function handleLogout() {
    try {
        const response = await fetch('/api/auth/logout', { method: 'POST' }); 
        if (!response.ok) {
            const data = await response.json().catch(() => ({})); 
            throw new Error(data.error || 'Logout failed');
        }
        console.log('Logout successful');
    } catch (error) {
        console.error('Logout error:', error);
    } finally {
        localStorage.removeItem('isAuthenticated');
        localStorage.removeItem('loggedInUser');
        window.location.href = '/login';
    }
}
// --- End Authentication related functions ---

async function updatePendingPickupsList() {
    const pickupsListElement = document.getElementById('pending-pickups-list');
    if (!pickupsListElement) {
        console.error('[App] Pending pickups list element not found.');
        return;
    }
    pickupsListElement.innerHTML = '<li>Loading packages...</li>'; 

    let backendPackages = [];
    try {
        const response = await fetchApi('/api/packages'); 
        if (!response.ok) { 
            throw new Error(`Failed to fetch packages: ${response.status}`);
        }
        const data = await response.json();
        backendPackages = data.packages || [];
    } catch (error) {
        if (error.message !== 'Unauthorized') { 
            console.error('[App] Error fetching packages from API:', error);
            pickupsListElement.innerHTML = '<li>Error loading packages.</li>';
        }
        return;
    }

    if (backendPackages.length === 0) {
        pickupsListElement.innerHTML = '<li>No packages in the system.</li>';
        return;
    }
    
    pickupsListElement.innerHTML = ''; 

    for (const pkg of backendPackages) { 
        const listItem = document.createElement('li');
        let driverName = 'N/A';
        if (pkg.assigned_driver_id) {
            const assignedDriver = driverMarkers.find(d => d.id === pkg.assigned_driver_id);
            driverName = assignedDriver ? assignedDriver.name : `Driver ID: ${pkg.assigned_driver_id}`;
        }

        listItem.innerHTML = `<b>Code:</b> ${pkg.unique_tracking_number} - <b>Recipient:</b> ${pkg.recipient_name}<br>
                              <b>Deliver to:</b> ${pkg.delivery_address}<br>
                              <b>Pickup:</b> (Lat: ${pkg.pickup_lat.toFixed(4)}, Lng: ${pkg.pickup_lng.toFixed(4)})<br>
                              <b>Status:</b> ${pkg.status} - <b>Assigned Driver:</b> ${driverName}`;
        
        if (pkg.description && pkg.description.trim() !== '') {
            listItem.innerHTML += `<br><b>Notes:</b> ${pkg.description}`;
        }

        // "Assign to Driver" button logic
        if (pkg.status === 'pending') {
            const assignButton = document.createElement('button');
            assignButton.textContent = 'Assign to Driver';
            assignButton.style.marginLeft = '10px';
            assignButton.style.marginTop = '5px';
            assignButton.dataset.packageId = pkg.package_id; 
            assignButton.dataset.packageCode = pkg.unique_tracking_number;

            assignButton.onclick = async function() { 
                const packageIdToAssign = this.dataset.packageId;
                const packageCodeForPrompt = this.dataset.packageCode;
                const driverIdString = prompt(`Enter ID of driver to assign package ${packageCodeForPrompt} to:`);
                if (driverIdString) {
                    const driverId = parseInt(driverIdString);
                    if (!isNaN(driverId) && driverMarkers.some(d => d.id === driverId)) { 
                        try {
                            const response = await fetchApi(`/api/packages/${packageIdToAssign}`, {
                                method: 'PUT',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ assigned_driver_id: driverId, status: 'assigned' }),
                            });
                            const result = await response.json();
                            if (!response.ok) {
                                throw new Error(result.error || `API error assigning package: ${response.status}`);
                            }
                            alert(`Package ${packageCodeForPrompt} assigned to driver ${driverId} successfully.`);
                            await updatePendingPickupsList(); 
                            const driverSelectElement = document.getElementById('driver-select');
                            if (document.getElementById('drivers-tab-content').classList.contains('active') && 
                                driverSelectElement && parseInt(driverSelectElement.value) === driverId) {
                                await handleDriverSelectionChange(); 
                            }
                        } catch (err) {
                             if (err.message !== 'Unauthorized') {
                                console.error('[App] Error assigning package:', err);
                                alert(`Error assigning package: ${err.message}`);
                            }
                        }
                    } else {
                        alert('Invalid Driver ID entered or driver not found in local cache.');
                    }
                }
            };
            const br = document.createElement('br'); // Ensure <br> is added before buttons if they are inline
            listItem.appendChild(br);
            listItem.appendChild(assignButton);
        }
        
        // Add Delete Button for all packages, regardless of status
        const deleteButton = document.createElement('button');
        deleteButton.textContent = 'Delete Package';
        deleteButton.style.marginLeft = '10px'; // Consistent margin
        deleteButton.style.marginTop = '5px';
        deleteButton.style.backgroundColor = 'tomato';
        deleteButton.style.color = 'white';
        deleteButton.dataset.packageId = pkg.package_id;
        deleteButton.dataset.packageIdentifier = pkg.unique_tracking_number || `ID ${pkg.package_id}`;

        deleteButton.onclick = async function() {
            const packageIdToDelete = this.dataset.packageId;
            const packageIdentifier = this.dataset.packageIdentifier;

            if (!confirm(`Are you sure you want to delete package "${packageIdentifier}"? This action cannot be undone.`)) {
                return;
            }

            try {
                const response = await fetchApi(`/api/packages/${packageIdToDelete}`, {
                    method: 'DELETE',
                });

                let successMessage = `Package "${packageIdentifier}" deleted successfully.`;
                if (!response.ok) {
                    const errorResult = await response.json().catch(() => ({ error: `API error: ${response.status}` }));
                    throw new Error(errorResult.error || `API error: ${response.status}`);
                }
                
                try {
                    const result = await response.json();
                    if (result && result.message) {
                        successMessage = result.message;
                    }
                } catch (e) {
                    if (response.status !== 200 && response.status !== 204) {
                        console.warn('Delete response was not OK and had no JSON body.');
                    } else {
                         console.log('Delete successful, no JSON body in response or not needed.');
                    }
                }

                alert(successMessage);
                
                await updatePendingPickupsList(); 

                const driverSelectElement = document.getElementById('driver-select');
                if (document.getElementById('drivers-tab-content').classList.contains('active') && driverSelectElement.value) {
                    await handleDriverSelectionChange(); 
                }
                // TODO: Remove the specific package marker from the map.
            } catch (error) {
                if (error.message !== 'Unauthorized') { // Avoid double alert
                    console.error('Failed to delete package:', error);
                    alert(`Error deleting package: ${error.message}`);
                }
            }
        };
        if (pkg.status !== 'pending') { 
             const brDel = document.createElement('br');
             listItem.appendChild(brDel);
        }
        listItem.appendChild(deleteButton);


        pickupsListElement.appendChild(listItem);
    }
}

function initMap() {
    if (typeof L === 'undefined') {
        console.error('[App] Leaflet (L) object not found. Ensure Leaflet.js is loaded.');
        const mapContainer = document.getElementById('map-container');
        if (mapContainer) mapContainer.innerHTML = '<p>Error: Mapping library (Leaflet) could not be loaded.</p>';
        return;
    }
    const mapContainerElement = document.getElementById('map-container');
    if (!mapContainerElement) {
        console.error("[App] Main map container 'map-container' not found.");
        return;
    }
    if (map && typeof map.remove === 'function') { 
        map.remove();
        console.log('[App] Previous main map instance removed.');
    }
    map = L.map('map-container').setView([HQ_LOCATION.lat, HQ_LOCATION.lng], 7);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors', maxZoom: 18,
    }).addTo(map);
    console.log('[App] Main dashboard Leaflet map initialized.');
    addMarker(HQ_LOCATION, 'Business HQ', null, map); // Using null for icon, addMarker will use default
    initializeDrivers(); 
    setInterval(simulateDriverMovement, 5000); 
}

async function initDriverMap() { 
     if (typeof L === 'undefined') {
        console.error('[App] Leaflet (L) object not found. Ensure Leaflet.js is loaded for driver map.');
        const driverMapContainer = document.getElementById('driver-map-container');
        if (driverMapContainer) driverMapContainer.innerHTML = '<p>Error: Mapping library (Leaflet) could not be loaded.</p>';
        return;
    }
    const driverMapContainerElement = document.getElementById('driver-map-container');
    if (!driverMapContainerElement) {
        console.error("[App] Driver map container 'driver-map-container' not found.");
        return;
    }
    if (driverMap && typeof driverMap.remove === 'function') { 
        driverMap.remove();
        console.log('[App] Previous driver map instance removed.');
    }
    driverMap = L.map('driver-map-container').setView([HQ_LOCATION.lat, HQ_LOCATION.lng], 7);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors', maxZoom: 18,
    }).addTo(driverMap);
    console.log('[App] Driver view Leaflet map initialized.');
    addMarker(HQ_LOCATION, 'Business HQ (Driver View)', null, driverMap); 
}

async function displayDriversForAdmin() {
    const driversUl = document.getElementById('editable-drivers-ul');
    if (!driversUl) {
        console.error('[App] Admin driver list UL element not found.');
        return;
    }
    driversUl.innerHTML = '<li>Loading drivers...</li>';

    try {
        const response = await fetchApi('/api/drivers'); 
        if (!response.ok) throw new Error('Failed to fetch drivers for admin list.');
        const data = await response.json();
        const drivers = data.drivers || [];

        driversUl.innerHTML = ''; 

        if (drivers.length === 0) {
            driversUl.innerHTML = '<li>No drivers found. Add one above!</li>';
            return;
        }

        drivers.forEach(driver => {
            const li = document.createElement('li');
            li.style.marginBottom = "10px"; 
            li.style.paddingBottom = "10px";
            li.style.borderBottom = "1px solid #eee";

            let textContent = `${driver.name} (ID: ${driver.driver_id})`;
            if (driver.contact_info) textContent += ` - Contact: ${driver.contact_info}`;
            if (driver.current_lat !== null && driver.current_lng !== null) {
                 textContent += ` - Loc: (${parseFloat(driver.current_lat).toFixed(4)}, ${parseFloat(driver.current_lng).toFixed(4)})`;
            }
            li.appendChild(document.createTextNode(textContent));
            
            const editButton = document.createElement('button');
            editButton.textContent = 'Edit';
            editButton.style.marginLeft = '10px';
            editButton.style.padding = '3px 8px';
            editButton.dataset.driverId = driver.driver_id;
            editButton.dataset.name = driver.name;
            editButton.dataset.contact = driver.contact_info || '';
            editButton.dataset.lat = driver.current_lat !== null ? driver.current_lat : '';
            editButton.dataset.lng = driver.current_lng !== null ? driver.current_lng : '';

            editButton.onclick = function() {
                document.getElementById('driver-name').value = this.dataset.name;
                document.getElementById('driver-contact').value = this.dataset.contact;
                document.getElementById('driver-initial-lat').value = this.dataset.lat;
                document.getElementById('driver-initial-lng').value = this.dataset.lng;
                
                editingDriverId = parseInt(this.dataset.driverId);
                const formButton = document.querySelector('#new-driver-form button[type="submit"]');
                formButton.textContent = 'Update Driver';
                document.getElementById('new-driver-form').dataset.mode = 'update'; 
                document.getElementById('driver-name').focus(); 
            };
            li.appendChild(editButton);

            const deleteButton = document.createElement('button');
            deleteButton.textContent = 'Delete';
            deleteButton.style.marginLeft = '5px';
            deleteButton.style.backgroundColor = 'red'; 
            deleteButton.style.color = 'white';
            deleteButton.style.padding = '3px 8px';
            deleteButton.dataset.driverId = driver.driver_id;
            deleteButton.dataset.driverName = driver.name;

            deleteButton.onclick = async function() {
                const driverIdToDelete = this.dataset.driverId;
                const driverNameToDelete = this.dataset.driverName;

                if (!confirm(`Are you sure you want to delete driver "${driverNameToDelete}" (ID: ${driverIdToDelete})? This may unassign them from packages.`)) {
                    return;
                }

                try {
                    const response = await fetchApi(`/api/drivers/${driverIdToDelete}`, {
                        method: 'DELETE',
                    });

                    const result = await response.json(); 

                    if (!response.ok) {
                        throw new Error(result.error || `API error: ${response.status}`);
                    }

                    alert(`Driver "${driverNameToDelete}" deleted successfully.`);
                    
                    await initializeDrivers();
                    await populateDriverSelect();
                    await displayDriversForAdmin();

                    if (editingDriverId && editingDriverId === parseInt(driverIdToDelete)) {
                        const newDriverForm = document.getElementById('new-driver-form');
                        newDriverForm.reset();
                        document.querySelector('#new-driver-form button[type="submit"]').textContent = 'Add Driver';
                        newDriverForm.dataset.mode = 'add';
                        editingDriverId = null;
                    }

                } catch (error) {
                    if (error.message !== 'Unauthorized') {
                        console.error('Failed to delete driver:', error);
                        alert(`Error deleting driver: ${error.message}`);
                    }
                }
            };
            li.appendChild(deleteButton);
            driversUl.appendChild(li);
        });

    } catch (error) {
        if (error.message !== 'Unauthorized') {
            console.error('Error displaying drivers for admin:', error);
            driversUl.innerHTML = '<li>Error loading drivers.</li>';
        }
    }
}

document.addEventListener('DOMContentLoaded', async () => { 
    console.log('DOM fully loaded and parsed.');

    if (window.location.pathname === '/login.html' || window.location.pathname === '/login') { 
        console.log('[App] On login page, skipping main app initialization.');
        return;
    }

    if (!isUserAuthenticatedClientSide()) {
        console.log('[App] User not authenticated, redirecting to login.');
        window.location.href = '/login'; 
        return; 
    }
    
    const userInfo = getLoggedInUserInfo();
    const welcomeMsgElement = document.getElementById('user-welcome-message'); 
    const logoutButton = document.getElementById('logout-button');

    if (welcomeMsgElement && userInfo && userInfo.username) {
        welcomeMsgElement.textContent = `Welcome, ${userInfo.username}!`;
    }
    if (logoutButton) {
        logoutButton.style.display = 'inline-block'; 
        logoutButton.addEventListener('click', handleLogout);
    }
    
    initMap(); 
    await populatePickupLocationDropdown(); 
    await updatePendingPickupsList(); 
    await displayDriversForAdmin(); 
    
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabPanels = document.querySelectorAll('.tab-panel');
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            tabButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            const targetTabId = button.getAttribute('data-tab');
            tabPanels.forEach(panel => {
                panel.style.display = (panel.id === targetTabId) ? 'block' : 'none';
                if (panel.id === targetTabId) panel.classList.add('active');
                else panel.classList.remove('active');
            });
            if (targetTabId === 'dashboard-tab-content') {
                if (!map) initMap(); 
                else map.invalidateSize(); 
            } else if (targetTabId === 'drivers-tab-content') {
                if (!driverMap) initDriverMap();
                else driverMap.invalidateSize(); 
                populateDriverSelect(); 
            }
        });
    });
    
    const activeDashboardTab = document.querySelector('#dashboard-tab-content.active');
    if (activeDashboardTab && !map) { 
        initMap();
    }

    const driverSelect = document.getElementById('driver-select');
    if (driverSelect) {
        driverSelect.addEventListener('change', handleDriverSelectionChange);
    }
    
    const newPackageForm = document.getElementById('new-package-form');
    if (newPackageForm) {
        newPackageForm.addEventListener('submit', async function(event) { 
            event.preventDefault();
            
            const descriptionInput = document.getElementById('package-description');
            const recipientNameInput = document.getElementById('recipient-name');
            const deliveryAddressInput = document.getElementById('delivery-address');
            const pickupLocationSelect = document.getElementById('pickup-location-select');

            const packagePayload = {
                description: descriptionInput.value.trim(),
                recipientName: recipientNameInput.value.trim(),
                deliveryAddress: deliveryAddressInput.value.trim(),
                number_abroad: document.getElementById('package-number-abroad')?.value.trim() || null,
                local_number: document.getElementById('package-local-number')?.value.trim() || null,
                weight_kg: document.getElementById('package-weight-kg')?.value ? parseFloat(document.getElementById('package-weight-kg').value) : null,
                direction: document.getElementById('package-direction')?.value.trim() || null, 
                sender_name: document.getElementById('package-sender-name')?.value.trim() || "Admin Self" 
            };

            if (!packagePayload.recipientName || !packagePayload.deliveryAddress || !packagePayload.direction || !packagePayload.sender_name) {
                alert('Recipient Name, Delivery Address, Direction, and Sender Name are required.');
                return;
            }
            if (packagePayload.weight_kg !== null && isNaN(packagePayload.weight_kg)) {
                alert('Weight must be a valid number.');
                return;
            }

            const formElements = newPackageForm.querySelectorAll('input, button, select');
            const reEnableForm = () => formElements.forEach(el => el.disabled = false);
            formElements.forEach(el => el.disabled = true);

            const selectedLocationId = pickupLocationSelect.value;

            if (selectedLocationId === 'custom') {
                const zipCodeInput = document.getElementById('pickup-zip-code');
                const countryInput = document.getElementById('pickup-country');
                const zipCode = zipCodeInput.value.trim();
                const country = countryInput.value.trim();

                if (!zipCode) {
                    alert('Please enter a ZIP Code for custom location.');
                    zipCodeInput.focus();
                    reEnableForm();
                    return;
                }
                packagePayload.pickup_zip_code = zipCode;
                packagePayload.pickup_country = country;
                packagePayload.pickup_address_details = `Custom ZIP: ${zipCode}, ${country}`;
            } else {
                const numericLocationId = parseInt(selectedLocationId);
                const selectedLoc = currentPredefinedLocations.find(loc => loc.location_id === numericLocationId); 
                if (!selectedLoc || selectedLoc.lat === undefined || selectedLoc.lng === undefined) {
                    alert('Selected predefined location is missing coordinate data or not found.');
                    reEnableForm();
                    return;
                }
                packagePayload.pickup_lat = parseFloat(selectedLoc.lat);
                packagePayload.pickup_lng = parseFloat(selectedLoc.lng);
                packagePayload.pickup_address_details = selectedLoc.name;
            }
            
            try {
                const response = await fetchApi('/api/packages', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(packagePayload)
                });
                const result = await response.json();
                if (!response.ok) {
                    throw new Error(result.error || `API error: ${response.status} - ${result.details || 'Failed to create package'}`);
                }
                
                alert(`Package created successfully! Tracking Number: ${result.unique_tracking_number}`);
                newPackageForm.reset(); 
                if (currentPredefinedLocations && currentPredefinedLocations.length > 0) {
                    pickupLocationSelect.value = currentPredefinedLocations[0].location_id; 
                } else {
                    pickupLocationSelect.value = 'custom';
                }
                pickupLocationSelect.dispatchEvent(new Event('change')); 

                await updatePendingPickupsList(); 
                
                if (result.package && result.package.pickup_lat && result.package.pickup_lng) {
                     addMarker(
                        {lat: result.package.pickup_lat, lng: result.package.pickup_lng}, 
                        `Package: ${result.package.unique_tracking_number} for ${packagePayload.recipientName}`, 
                        PACKAGE_ICON_URL, 
                        map 
                    );
                } else if (packagePayload.pickup_lat && packagePayload.pickup_lng) { 
                     addMarker(
                        {lat: packagePayload.pickup_lat, lng: packagePayload.pickup_lng}, 
                        `Package: ${result.unique_tracking_number} for ${packagePayload.recipientName}`, 
                        PACKAGE_ICON_URL, 
                        map 
                    );
                }

            } catch (err) {
                 if (err.message !== 'Unauthorized') {
                    console.error('[App] Error creating package:', err);
                    alert(`Error creating package: ${err.message}`);
                }
            } finally {
                reEnableForm();
            }
        });
    } else {
        console.warn('New package form not found.');
    }

    const newDriverForm = document.getElementById('new-driver-form');
    if (newDriverForm) {
        newDriverForm.addEventListener('submit', async function(event) {
            event.preventDefault();
            const mode = newDriverForm.dataset.mode || 'add'; 

            const driverNameInput = document.getElementById('driver-name');
            const driverContactInput = document.getElementById('driver-contact');
            const driverInitialLatInput = document.getElementById('driver-initial-lat');
            const driverInitialLngInput = document.getElementById('driver-initial-lng');

            const driverName = driverNameInput.value.trim();
            const driverContact = driverContactInput.value.trim() || null;
            const initialLatVal = driverInitialLatInput.value;
            const initialLngVal = driverInitialLngInput.value;
            
            let current_lat = initialLatVal ? parseFloat(initialLatVal) : null;
            let current_lng = initialLngVal ? parseFloat(initialLngVal) : null;

            if (!driverName) {
                alert('Driver Name is required.');
                driverNameInput.focus();
                return;
            }
            if ((initialLatVal && isNaN(current_lat)) || (initialLngVal && isNaN(current_lng))) {
                alert('If providing Latitude or Longitude, they must be valid numbers.');
                return;
            }
            if ((current_lat === null && current_lng !== null) || (current_lat !== null && current_lng === null)) {
                 alert('Please provide both Latitude and Longitude, or leave both empty for no initial location.');
                 return;
            }

            const driverData = { 
                name: driverName, 
                contact_info: driverContact, 
                current_lat: current_lat, 
                current_lng: current_lng 
            };

            const formButton = newDriverForm.querySelector('button[type="submit"]');
            formButton.disabled = true;
            
            if (mode === 'update' && editingDriverId) {
                try {
                    const response = await fetchApi(`/api/drivers/${editingDriverId}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(driverData),
                    });
                    const result = await response.json(); 
                    if (!response.ok) throw new Error(result.error || `API error: ${response.status}`);
                    
                    alert(`Driver ID ${editingDriverId} updated successfully.`);
                    
                    await initializeDrivers(); 
                    await populateDriverSelect(); 
                    await displayDriversForAdmin(); 

                } catch (error) {
                    if (error.message !== 'Unauthorized') {
                        console.error('Error updating driver:', error);
                        alert(`Error updating driver: ${error.message}`);
                    }
                } finally {
                    formButton.disabled = false;
                    newDriverForm.reset(); 
                    formButton.textContent = 'Add Driver';
                    newDriverForm.dataset.mode = 'add';
                    editingDriverId = null;
                }
            } else { // Add mode
                try {
                    const response = await fetchApi('/api/drivers', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(driverData),
                    });
                    const newDriver = await response.json();
                    if (!response.ok) {
                        throw new Error(newDriver.error || `API error: ${response.status}`);
                    }
                    alert(`Driver "${driverData.name}" added successfully with ID: ${newDriver.driverId}.`);
                    newDriverForm.reset();
                    
                    await initializeDrivers(); 
                    await populateDriverSelect(); 
                    await displayDriversForAdmin(); 

                } catch (error) {
                    if (error.message !== 'Unauthorized') {
                        console.error('Error adding driver:', error);
                        alert(`Error adding driver: ${error.message}`);
                    }
                } finally {
                    formButton.disabled = false;
                }
            }
        });
    } else {
        console.warn('New driver form not found.');
    }
});

async function populatePickupLocationDropdown() {
    const pickupLocationSelect = document.getElementById('pickup-location-select');
    const customLocationFieldsDiv = document.getElementById('custom-location-fields');
    const zipCodeInput = document.getElementById('pickup-zip-code');

    if (!pickupLocationSelect || !customLocationFieldsDiv || !zipCodeInput) {
        console.error('[App] One or more elements for pickup location dropdown not found.');
        if (customLocationFieldsDiv) customLocationFieldsDiv.style.display = 'block'; 
        if (zipCodeInput) zipCodeInput.required = true;
        return;
    }
    pickupLocationSelect.innerHTML = ''; 
    try {
        const response = await fetchApi('/api/predefinedlocations'); 
        if (!response.ok) throw new Error(`Failed to fetch predefined locations: ${response.status}`);
        const data = await response.json();
        currentPredefinedLocations = data.predefined_locations || []; 
        console.log('[App] Predefined pickup locations fetched from API:', currentPredefinedLocations);

        if (currentPredefinedLocations.length > 0) {
            currentPredefinedLocations.forEach(loc => {
                const option = document.createElement('option');
                option.value = loc.location_id; 
                option.textContent = loc.name;
                pickupLocationSelect.appendChild(option);
            });
        }
    } catch (error) {
        if (error.message !== 'Unauthorized') {
            console.error('[App] Error fetching predefined pickup locations:', error);
            alert('Error loading predefined pickup locations. Custom ZIP code entry will be shown.');
        }
        currentPredefinedLocations = []; 
    }

    const customOption = document.createElement('option');
    customOption.value = 'custom';
    customOption.textContent = 'Custom Location (Enter ZIP Code Below)';
    pickupLocationSelect.appendChild(customOption);

    pickupLocationSelect.addEventListener('change', function() {
        if (this.value === 'custom') {
            customLocationFieldsDiv.style.display = 'block';
            zipCodeInput.required = true;
        } else {
            customLocationFieldsDiv.style.display = 'none';
            zipCodeInput.required = false;
        }
    });

    if (currentPredefinedLocations.length > 0) {
        pickupLocationSelect.value = currentPredefinedLocations[0].location_id;
    } else {
        pickupLocationSelect.value = 'custom'; 
    }
    pickupLocationSelect.dispatchEvent(new Event('change')); 
}


async function populateDriverSelect() {
    const driverSelect = document.getElementById('driver-select');
    if (!driverSelect) { 
        console.error('[App] Driver select dropdown not found.');
        return;
    }
    let driversFromApi = []; 
    try {
        const response = await fetchApi('/api/drivers'); 
        if (!response.ok) throw new Error(`Failed to fetch drivers for dropdown: ${response.status}`);
        const data = await response.json();
        driversFromApi = data.drivers || [];
    } catch (error) {
         if (error.message !== 'Unauthorized') {
            console.error('[App] Error fetching drivers for select:', error);
        }
    }
    driverSelect.innerHTML = ''; 
    const placeholderOption = document.createElement('option');
    placeholderOption.value = "";
    placeholderOption.textContent = "-- Select a Driver --";
    placeholderOption.disabled = true;
    placeholderOption.selected = !driversFromApi.some(d => d.driver_id === parseInt(driverSelect.value)); 
    driverSelect.appendChild(placeholderOption);

    driversFromApi.forEach(driver => {
        const option = document.createElement('option');
        option.value = driver.driver_id; 
        option.textContent = driver.name;
        if (parseInt(driverSelect.value) === driver.driver_id && !placeholderOption.selected) {
            option.selected = true;
        }
        driverSelect.appendChild(option);
    });
}

async function handleDriverSelectionChange() { 
    const driverSelectElement = document.getElementById('driver-select'); 
    if (!driverSelectElement) {
        console.error('[App] Driver select element not found in handleDriverSelectionChange.');
        return;
    }
    const selectedDriverId = parseInt(driverSelectElement.value); 
    const driverPackagesList = document.getElementById('driver-specific-package-list');
    if (!driverPackagesList) {
        console.error('[App] Driver specific package list element not found.');
        return;
    }
    
    if (isNaN(selectedDriverId)) {
        driverPackagesList.innerHTML = '<li>Please select a driver.</li>';
        if (driverMap) driverMap.setView([HQ_LOCATION.lat, HQ_LOCATION.lng], 7);
        if (currentDriverViewMarker && typeof currentDriverViewMarker.remove === 'function') {
            currentDriverViewMarker.remove(); currentDriverViewMarker = null;
        }
        return;
    }

    const driverDetails = driverMarkers.find(d => d.id === selectedDriverId);
    if (driverDetails && driverDetails.marker) { 
        if (!driverMap || typeof driverMap.addLayer !== 'function') { 
            console.error("[App] Driver map is not a valid Leaflet map instance for selection change.");
            await initDriverMap(); 
            if (!driverMap || typeof driverMap.addLayer !== 'function') {
                driverPackagesList.innerHTML = '<li>Driver map could not be initialized.</li>';
                return; 
            }
        }
        const driverLocation = driverDetails.marker.getLatLng(); 
        driverMap.setView([driverLocation.lat, driverLocation.lng], 12);
        if (currentDriverViewMarker && typeof currentDriverViewMarker.remove === 'function') {
            currentDriverViewMarker.remove(); 
        }
        currentDriverViewMarker = addMarker(
           {lat: driverLocation.lat, lng: driverLocation.lng}, 
           `Current Location: ${driverDetails.name}`,
            DRIVER_ICON_URL, 
           driverMap 
        );
        if (currentDriverViewMarker) currentDriverViewMarker.openPopup(); 
        console.log(`[App] Centered driver map on ${driverDetails.name} and added/updated marker.`);
    } else {
        driverPackagesList.innerHTML = `<li>Driver details not found or location unknown for ID ${selectedDriverId}.</li>`;
        if (driverMap) driverMap.setView([HQ_LOCATION.lat, HQ_LOCATION.lng], 7);
        if (currentDriverViewMarker) { currentDriverViewMarker.remove(); currentDriverViewMarker = null; }
        return; 
    }

    driverPackagesList.innerHTML = '<li>Loading packages...</li>';
    let driverSpecificPackages = [];
    try {
        const response = await fetchApi(`/api/packages?assigned_driver_id=${selectedDriverId}`); 
        if (!response.ok) throw new Error(`Failed to fetch packages for driver ${selectedDriverId}: ${response.status}`);
        const data = await response.json();
        driverSpecificPackages = data.packages || [];
        console.log(`[App] Packages for driver ${selectedDriverId} fetched from API:`, driverSpecificPackages);
    } catch (error) {
         if (error.message !== 'Unauthorized') {
            console.error(`[App] Error fetching packages for driver ${selectedDriverId}:`, error);
            driverPackagesList.innerHTML = '<li>Error loading packages for this driver.</li>';
        }
        return;
    }

    if (driverSpecificPackages.length === 0) {
        driverPackagesList.innerHTML = '<li>No packages currently assigned to this driver.</li>';
    } else {
        driverPackagesList.innerHTML = ''; 
        driverSpecificPackages.forEach(pkg => {
            const listItem = document.createElement('li');
            listItem.innerHTML = `<b>Package:</b> ${pkg.unique_tracking_number} - <b>Status:</b> ${pkg.status}<br><b>To:</b> ${pkg.delivery_address}`;
            
            const packageIdForActions = pkg.package_id; 
            const packageCodeForAlerts = pkg.unique_tracking_number;

            if (pkg.status === 'assigned') {
                const acceptBtn = document.createElement('button');
                acceptBtn.textContent = 'Accept';
                acceptBtn.style.marginLeft = '5px'; acceptBtn.style.marginTop = '5px';
                acceptBtn.dataset.packageId = packageIdForActions;
                acceptBtn.onclick = async function() { 
                    try {
                        const response = await fetchApi(`/api/packages/${this.dataset.packageId}`, {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ status: 'accepted_by_driver' })
                        });
                        const result = await response.json();
                        if (!response.ok) {
                             throw new Error(result.error || `API error accepting package: ${response.status}`);
                        }
                        alert(`Package ${packageCodeForAlerts} accepted.`);
                        await handleDriverSelectionChange(); 
                        await updatePendingPickupsList(); 
                    } catch (err) {
                        if (err.message !== 'Unauthorized') {
                           console.error('[App] Error accepting package:', err);
                           alert(`Error accepting package: ${err.message}`);
                       }
                    }
                };
                const declineBtn = document.createElement('button');
                declineBtn.textContent = 'Decline';
                declineBtn.style.marginLeft = '5px'; declineBtn.style.marginTop = '5px';
                declineBtn.dataset.packageId = packageIdForActions;
                declineBtn.onclick = async function() { 
                     try {
                        const response = await fetchApi(`/api/packages/${this.dataset.packageId}`, {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ status: 'declined_by_driver', assigned_driver_id: null })
                        });
                        const result = await response.json();
                        if (!response.ok) {
                            throw new Error(result.error || `API error declining package: ${response.status}`);
                        }
                        alert(`Package ${packageCodeForAlerts} declined.`);
                        await handleDriverSelectionChange(); 
                        await updatePendingPickupsList();
                    } catch (err) {
                         if (err.message !== 'Unauthorized') {
                           console.error('[App] Error declining package:', err);
                           alert(`Error declining package: ${err.message}`);
                       }
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
}

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
            iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34] 
        });
    }
    const leafletMarker = L.marker([location.lat, location.lng], markerOptions).addTo(mapToUse);
    if (title) leafletMarker.bindPopup(title);
    return leafletMarker; 
}

async function initializeDrivers() { 
    if (!map || typeof map.addLayer !== 'function') { 
        console.error('[App] Main Leaflet map not initialized. Cannot initialize drivers.');
        return;
    }
    let driversFromApi = [];
    try {
        const response = await fetchApi('/api/drivers'); 
        if (!response.ok) throw new Error(`Failed to fetch drivers: ${response.status} ${response.statusText}`);
        const data = await response.json();
        driversFromApi = data.drivers || []; 
        console.log('[App] Drivers fetched from API:', driversFromApi);
    } catch (error) {
         if (error.message !== 'Unauthorized') {
            console.error('[App] Error fetching drivers from API:', error);
            alert(`Error fetching driver data: ${error.message}. Displaying may be incomplete.`);
        }
    }
    
    driverMarkers.forEach(dm => {
        if (dm.marker && typeof dm.marker.remove === 'function') dm.marker.remove();
    });
    driverMarkers = []; 
    driversFromApi.forEach(driver => {
        if (driver.current_lat !== null && driver.current_lng !== null) {
            const location = { lat: driver.current_lat, lng: driver.current_lng };
            const marker = addMarker(location, driver.name, DRIVER_ICON_URL, map);
            if (marker) driverMarkers.push({ id: driver.driver_id, marker: marker, name: driver.name });
            else console.error(`[App] Failed to create Leaflet marker for driver ${driver.name} from DB coords.`);
        } else {
            console.warn(`[App] Driver ${driver.name} (ID: ${driver.driver_id}) has no valid location data, not adding to map.`);
        }
    });
    console.log('[App] Leaflet driver markers (from API) initialized on main map.');
}

function simulateDriverMovement() { 
    if (!map || !driverMarkers.length) return; 
    driverMarkers.forEach(driverRepresentation => {
        if (driverRepresentation.marker && typeof driverRepresentation.marker.getLatLng === 'function') {
            const currentPosition = driverRepresentation.marker.getLatLng(); 
            const newLat = currentPosition.lat + (Math.random() - 0.5) * 0.01;
            const newLng = currentPosition.lng + (Math.random() - 0.5) * 0.01;
            const newLocation = { lat: newLat, lng: newLng };
            console.log(`[App] Simulating movement for driver ${driverRepresentation.id}. Skipping backend update.`); 
            driverRepresentation.marker.setLatLng([newLat, newLng]);
        }
    });
}

// This function is no longer called by the package form, but kept for potential other uses.
function geocodeWithNominatim(zipCode, country, callback) {
    const queryParams = new URLSearchParams({
        format: 'json', postalcode: zipCode, country: country, limit: 1
    });
    const url = `https://nominatim.openstreetmap.org/search?${queryParams}`;
    console.log(`[App] Attempting to geocode with Nominatim: ${url}`);
    fetch(url, {
        method: 'GET',
        headers: { 'User-Agent': 'PackageTrackerSPA/1.0 (contact@example-app.com)' }
    })
    .then(response => {
        if (!response.ok) throw new Error(`Nominatim API request failed with status ${response.status}`);
        return response.json();
    })
    .then(data => {
        if (data && data.length > 0) {
            const lat = parseFloat(data[0].lat);
            const lon = parseFloat(data[0].lon); 
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
