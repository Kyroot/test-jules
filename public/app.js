// app.js - Client-side logic

// Define static constants previously in backend.js
const HQ_LOCATION = { lat: 47.0105, lng: 28.8638 }; // Chișinău, Moldova
const DRIVER_ICON_URL = 'http://maps.google.com/mapfiles/ms/icons/blue-dot.png'; // Kept for potential future use, though vehicles are primary
const PACKAGE_ICON_URL = 'http://maps.google.com/mapfiles/ms/icons/yellow-dot.png';
const VEHICLE_ICON_URL = 'http://maps.google.com/mapfiles/ms/icons/truck.png'; // New

// Global map variables and state
let map; // Main dashboard map instance (Leaflet)
let driverMap; // Driver-specific view map instance (Leaflet) - consider renaming to vehicleMap
let vehicleMarkers = []; // Stores marker objects for vehicles on the main map (replaces driverMarkers)
let currentVehicleViewMarker = null; // Replaces currentDriverViewMarker
let currentPredefinedLocations = [];  // Cache for predefined locations from API
let editingVehicleId = null; // Replaces editingDriverId
let currentPrincipalType = null; // New: 'admin' or 'vehicle'
let currentPrincipalInfo = null; // New: Stores the full user/vehicle object from localStorage

window.vehicleLocationIntervalId = null; // To store the interval ID for vehicle location updates

// --- Authentication related functions ---
function isUserAuthenticatedClientSide() {
    return localStorage.getItem('isAuthenticated') === 'true';
}

function getLoggedInPrincipalInfo() { // Renamed from getLoggedInUserInfo
    const principalInfoString = localStorage.getItem('loggedInPrincipalInfo'); // Updated key
    if (principalInfoString) {
        try {
            return JSON.parse(principalInfoString);
        } catch (e) {
            console.error('Error parsing loggedInPrincipalInfo from localStorage:', e);
            return null;
        }
    }
    return null;
}

async function fetchApi(url, options = {}) {
    const response = await fetch(url, options);
    if (response.status === 401) {
        localStorage.removeItem('isAuthenticated');
        localStorage.removeItem('loggedInPrincipalInfo'); // Updated key
        currentPrincipalType = null;
        currentPrincipalInfo = null;
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
        if (window.vehicleLocationIntervalId) { // Updated variable name
            clearInterval(window.vehicleLocationIntervalId);
            window.vehicleLocationIntervalId = null;
            console.log('[App Logout] Cleared vehicle location update interval.');
        }
        localStorage.removeItem('isAuthenticated');
        localStorage.removeItem('loggedInPrincipalInfo'); // Updated key
        localStorage.removeItem('loggedInUser'); // Clean up old key if present
        currentPrincipalType = null; 
        currentPrincipalInfo = null; 
        window.location.href = '/login';
    }
}
// --- End Authentication related functions ---

async function requestAndSendVehicleLocation() { // Renamed from requestAndSendDriverLocation
    if (currentPrincipalType !== 'vehicle') {
        return;
    }
    if (!currentPrincipalInfo || !currentPrincipalInfo.vehicleId) {
        console.warn('[App Location] No logged-in vehicle info or vehicleId found, skipping location update.');
        return;
    }
    if (!navigator.geolocation) {
        console.warn('[App Location] Geolocation is not supported by this browser.');
        return;
    }
    console.log('[App Location] Requesting current position for vehicle...');
    navigator.geolocation.getCurrentPosition(
        async (position) => {
            const { latitude, longitude } = position.coords;
            console.log(`[App Location] Geolocation success: Lat: ${latitude}, Lng: ${longitude} for vehicle ${currentPrincipalInfo.vehicleId}`);
            try {
                const response = await fetchApi('/api/vehicles/mylocation', { // Corrected API path
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ lat: latitude, lng: longitude }),
                });
                if (!response.ok) {
                     const errorResult = await response.json().catch(() => ({}));
                    throw new Error(errorResult.error || `API error updating location: ${response.status}`);
                }
                console.log('[App Location] Successfully sent vehicle location to backend.');
                
                const vehicleIdToUpdate = currentPrincipalInfo.vehicleId;
                const newLoc = { lat: latitude, lng: longitude };

                const mainMapVehicleMarkerEntry = vehicleMarkers.find(vm => vm.id === vehicleIdToUpdate);
                if (mainMapVehicleMarkerEntry && mainMapVehicleMarkerEntry.marker) {
                    mainMapVehicleMarkerEntry.marker.setLatLng([newLoc.lat, newLoc.lng]);
                    console.log('[App Location] Updated own vehicle marker on main map.');
                }

                // If vehicle view is active and it's the current vehicle, update that map too
                const vehiclesTab = document.getElementById('vehicles-tab-content'); // Assuming it might be renamed
                const vehicleSelect = document.getElementById('vehicle-select'); // Assuming it might be renamed
                if (vehiclesTab && vehiclesTab.classList.contains('active') && 
                    vehicleSelect && parseInt(vehicleSelect.value) === vehicleIdToUpdate &&
                    currentVehicleViewMarker) { // Renamed from currentDriverViewMarker
                    currentVehicleViewMarker.setLatLng([newLoc.lat, newLoc.lng]);
                    if(driverMap) driverMap.panTo([newLoc.lat, newLoc.lng]); // driverMap might be vehicleMap
                    console.log('[App Location] Updated own marker on vehicle-specific map.');
                }

            } catch (error) {
                console.error('[App Location] Failed to send vehicle location to backend:', error);
            }
        },
        (error) => {
            console.warn(`[App Location] Geolocation error: ${error.message} (Code: ${error.code})`);
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 } 
    );
}


async function displayAllPackages() {
    const allPackagesListElement = document.getElementById('all-packages-list');
    if (!allPackagesListElement) {
        console.error('[App] "all-packages-list" element not found.');
        return;
    }
    allPackagesListElement.innerHTML = '<li>Loading all packages...</li>';

    let allFetchedPackages = [];
    try {
        const response = await fetchApi('/api/packages'); 
        if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            throw new Error(errData.error || `Failed to fetch packages: ${response.status}`);
        }
        const data = await response.json();
        allFetchedPackages = data.packages || [];
    } catch (error) {
        console.error('[App] Error fetching all packages:', error);
        allPackagesListElement.innerHTML = `<li>Error loading packages: ${error.message}</li>`;
        return;
    }

    if (allFetchedPackages.length === 0) {
        allPackagesListElement.innerHTML = '<li>No packages found in the system.</li>';
        return;
    }
    allPackagesListElement.innerHTML = ''; 

    allFetchedPackages.forEach(pkg => {
        const listItem = document.createElement('li');
        let assignedVehicleIdentifier = 'N/A';
        if (pkg.assigned_vehicle_id) { // Changed from assigned_driver_id
            const vehicle = vehicleMarkers.find(v => v.id === pkg.assigned_vehicle_id); // Changed from driverMarkers
            assignedVehicleIdentifier = vehicle ? (vehicle.displayName || vehicle.plateNumber) : `Vehicle ID: ${pkg.assigned_vehicle_id}`;
        }

        listItem.innerHTML = `
            <strong>Tracking #:</strong> ${pkg.unique_tracking_number}<br>
            <strong>Recipient:</strong> ${pkg.recipient_name}<br>
            <strong>Delivery Address:</strong> ${pkg.delivery_address}<br>
            <strong>Status:</strong> ${pkg.status}<br>
            <strong>Assigned Vehicle:</strong> ${assignedVehicleIdentifier}<br> 
            ${pkg.direction ? `<strong>Direction:</strong> ${pkg.direction}<br>` : ''}
            ${pkg.sender_name ? `<strong>Sender:</strong> ${pkg.sender_name}<br>` : ''}
            ${pkg.description ? `<small>Desc: ${pkg.description}</small><br>` : ''}
        `;
        listItem.style.marginBottom = '15px';
        listItem.style.paddingBottom = '15px';
        listItem.style.borderBottom = '1px solid #eee';

        if (currentPrincipalType === 'admin') {
            if (pkg.status === 'pending') {
                const assignBtn = document.createElement('button');
                assignBtn.textContent = 'Assign to Vehicle'; // Text changed
                assignBtn.style.marginRight = '5px';
                assignBtn.dataset.packageId = pkg.package_id;
                assignBtn.dataset.packageCode = pkg.unique_tracking_number;
                assignBtn.onclick = async function() { 
                    const packageIdToAssign = this.dataset.packageId;
                    const packageCodeForPrompt = this.dataset.packageCode;
                    const vehicleIdString = prompt(`Enter ID of vehicle for package ${packageCodeForPrompt}:`); // Prompt changed
                    if (vehicleIdString) {
                        const vehicleId = parseInt(vehicleIdString);
                        if (!isNaN(vehicleId) && vehicleMarkers.some(v => v.id === vehicleId)) { // Check vehicleMarkers
                            try {
                                const apiResp = await fetchApi(`/api/packages/${packageIdToAssign}`, {
                                    method: 'PUT',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ assigned_vehicle_id: vehicleId, status: 'assigned' }), // Use assigned_vehicle_id
                                });
                                const res = await apiResp.json();
                                if (!apiResp.ok) throw new Error(res.error || 'API Error');
                                alert(`Package ${packageCodeForPrompt} assigned to vehicle ${vehicleId}.`);
                                await displayAllPackages(); 
                                const vehicleSelectElement = document.getElementById('vehicle-select'); // Assume this exists
                                if (document.getElementById('vehicles-tab-content')?.classList.contains('active') && 
                                    vehicleSelectElement && parseInt(vehicleSelectElement.value) === vehicleId) {
                                    await handleVehicleSelectionChange(); // This function will need renaming/refactoring
                                }
                            } catch (e) { alert(`Error assigning: ${e.message}`); }
                        } else { alert('Invalid Vehicle ID or vehicle not found.'); }
                    }
                };
                listItem.appendChild(assignBtn);
            }

            const deleteBtn = document.createElement('button');
            deleteBtn.textContent = 'Delete Package';
            deleteBtn.dataset.packageId = pkg.package_id;
            deleteBtn.dataset.packageIdentifier = pkg.unique_tracking_number;
            deleteBtn.style.marginLeft = '5px';
            deleteBtn.style.backgroundColor = 'tomato';
            deleteBtn.style.color = 'white';
            deleteBtn.onclick = async function() { 
                const packageIdToDelete = this.dataset.packageId;
                const packageIdentifier = this.dataset.packageIdentifier;
                if (!confirm(`Delete package "${packageIdentifier}"?`)) return;
                try {
                    const apiResp = await fetchApi(`/api/packages/${packageIdToDelete}`, { method: 'DELETE' });
                     if (!apiResp.ok) {
                        const res = await apiResp.json().catch(() => ({})); 
                        throw new Error(res.error || `API Error: ${apiResp.status}`);
                    }
                     alert(`Package "${packageIdentifier}" deleted successfully.`);
                    await displayAllPackages(); 
                } catch (e) { alert(`Error deleting: ${e.message}`); }
            };
            listItem.appendChild(deleteBtn);
        }


        if (currentPrincipalType === 'vehicle' && 
            currentPrincipalInfo && pkg.assigned_vehicle_id && 
            pkg.assigned_vehicle_id === currentPrincipalInfo.vehicleId && 
            pkg.status === 'assigned') {
            
            const acceptBtn = document.createElement('button');
            acceptBtn.textContent = 'Accept';
            acceptBtn.style.marginRight = '5px';
            acceptBtn.dataset.packageId = pkg.package_id;
            acceptBtn.onclick = async function() { 
                const packageIdToUpdate = this.dataset.packageId;
                try {
                    const apiResp = await fetchApi(`/api/packages/${packageIdToUpdate}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ status: 'accepted_by_driver' }) // Status changed for vehicle
                    });
                    const res = await apiResp.json();
                    if (!apiResp.ok) throw new Error(res.error || 'API Error');
                    alert(`Package ${pkg.unique_tracking_number} accepted by vehicle.`);
                    await displayAllPackages(); 
                } catch (e) { alert(`Error accepting: ${e.message}`); }
            };
            listItem.appendChild(acceptBtn);

            const declineBtn = document.createElement('button');
            declineBtn.textContent = 'Decline';
            declineBtn.style.marginLeft = '5px';
            declineBtn.dataset.packageId = pkg.package_id;
            declineBtn.onclick = async function() { 
                const packageIdToUpdate = this.dataset.packageId;
                try {
                    const apiResp = await fetchApi(`/api/packages/${packageIdToUpdate}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ status: 'declined_by_driver', assigned_vehicle_id: null }), // Unassign vehicle
                    });
                    const res = await apiResp.json();
                    if (!apiResp.ok) throw new Error(res.error || 'API Error');
                    alert(`Package ${pkg.unique_tracking_number} declined by vehicle.`);
                    await displayAllPackages(); 
                } catch (e) { alert(`Error declining: ${e.message}`); }
            };
            listItem.appendChild(declineBtn);
        }
        allPackagesListElement.appendChild(listItem);
    });
}


function initMap() { // Main map for admin
    if (typeof L === 'undefined') { console.error('[App] Leaflet not loaded.'); return; }
    const mapContainerElement = document.getElementById('map-container');
    if (!mapContainerElement) { console.error("[App] Main map container 'map-container' not found."); return; }
    if (map) map.remove();
    map = L.map('map-container').setView([HQ_LOCATION.lat, HQ_LOCATION.lng], 7);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '&copy; OSM' }).addTo(map);
    addMarker(HQ_LOCATION, 'Business HQ', null, map); 
    initializeVehicleMarkers(); // Renamed from initializeDrivers
    // Simulating vehicle movement might still be useful for admins to see activity, or removed if API is source of truth
    // setInterval(simulateVehicleMovement, 15000); // Renamed
}

async function initVehicleMap() { // For individual vehicle view (was initDriverMap)
    if (typeof L === 'undefined') { console.error('[App] Leaflet not loaded.'); return; }
    const vehicleMapContainerElement = document.getElementById('vehicle-map-container'); // Assuming ID changes
    if (!vehicleMapContainerElement) { console.error("[App] Vehicle map container not found."); return; }
    if (driverMap) driverMap.remove(); // driverMap is the old name for vehicleMap instance
    driverMap = L.map('vehicle-map-container').setView([HQ_LOCATION.lat, HQ_LOCATION.lng], 7); // Storing in driverMap for now
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '&copy; OSM' }).addTo(driverMap);
    addMarker(HQ_LOCATION, 'Business HQ', null, driverMap); 
}

async function displayAdminVehicleManagement() { // Renamed from displayDriversForAdmin
    const vehiclesUl = document.getElementById('editable-vehicles-ul'); // Assuming ID will change
    if (!vehiclesUl) { return; }
    vehiclesUl.innerHTML = '<li>Loading vehicles...</li>';
    try {
        const response = await fetchApi('/api/vehicles'); 
        if (!response.ok) throw new Error('Failed to fetch vehicles');
        const data = await response.json();
        const vehicles = data.vehicles || [];
        vehiclesUl.innerHTML = ''; 
        if (vehicles.length === 0) { vehiclesUl.innerHTML = '<li>No vehicles found. Add one.</li>'; return; }
        vehicles.forEach(vehicle => { /* ... similar to displayDriversForAdmin but for vehicles ... */ });
    } catch (error) {
        if (error.message !== 'Unauthorized') { console.error('Error displaying vehicles:', error); vehiclesUl.innerHTML = '<li>Error loading vehicles.</li>';}
    }
}

function setupTabEventListeners() {
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabPanels = document.querySelectorAll('.tab-panel');
    tabButtons.forEach(button => {
        button.addEventListener('click', async () => { 
            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabPanels.forEach(panel => { panel.style.display = 'none'; panel.classList.remove('active'); });
            button.classList.add('active');
            const targetTabId = button.getAttribute('data-tab');
            const targetPanel = document.getElementById(targetTabId);
            if (targetPanel) {
                targetPanel.style.display = 'block'; targetPanel.classList.add('active');
                if (targetTabId === 'dashboard-tab-content' && map) map.invalidateSize();
                else if (targetTabId === 'vehicles-tab-content') { // Changed from drivers-tab-content
                    if (!driverMap && typeof initVehicleMap === 'function') await initVehicleMap(); // driverMap is vehicleMap
                    else if (driverMap) driverMap.invalidateSize();
                    if (typeof populateVehicleSelect === 'function') await populateVehicleSelect(); // Renamed
                    const vehicleSelectElement = document.getElementById('vehicle-select');
                    if (currentPrincipalType === 'vehicle' && currentPrincipalInfo?.vehicleId) {
                        if(vehicleSelectElement) {
                            vehicleSelectElement.value = currentPrincipalInfo.vehicleId;
                            await handleVehicleSelectionChange(); // Renamed
                            // vehicleSelectElement.disabled = true; 
                        }
                    } else if (vehicleSelectElement?.value) { 
                        await handleVehicleSelectionChange(); // Renamed
                    }
                } else if (targetTabId === 'all-packages-tab-content') {
                    if (typeof displayAllPackages === 'function') await displayAllPackages();
                }
            }
        });
    });
}


document.addEventListener('DOMContentLoaded', async () => { 
    console.log('DOM fully loaded and parsed.');
    if (window.location.pathname === '/login.html' || window.location.pathname === '/login') { return; }
    if (!isUserAuthenticatedClientSide()) { window.location.href = '/login'; return; }
    
    currentPrincipalInfo = getLoggedInPrincipalInfo();
    if (currentPrincipalInfo && currentPrincipalInfo.type) {
        currentPrincipalType = currentPrincipalInfo.type;
        console.log(`[App Init] Principal type: ${currentPrincipalType}. Full info:`, currentPrincipalInfo);

        const welcomeMsgElement = document.getElementById('user-welcome-message');
        if (welcomeMsgElement) {
            if (currentPrincipalType === 'admin' && currentPrincipalInfo.username) {
                welcomeMsgElement.textContent = `Welcome, Admin: ${currentPrincipalInfo.username}!`;
            } else if (currentPrincipalType === 'vehicle' && (currentPrincipalInfo.displayName || currentPrincipalInfo.vehiclePlateNumber)) {
                welcomeMsgElement.textContent = `Welcome, Vehicle: ${currentPrincipalInfo.displayName || currentPrincipalInfo.vehiclePlateNumber}!`;
            } else { welcomeMsgElement.textContent = 'Welcome!'; }
        }
    } else {
        console.error('[App Init] Principal info or type not found. Logging out.');
        handleLogout(); return;
    }
    
    const logoutButton = document.getElementById('logout-button');
    if (logoutButton) { logoutButton.style.display = 'inline-block'; logoutButton.addEventListener('click', handleLogout); }
    
    const overallDashboardTabButton = document.querySelector('.tab-button[data-tab="dashboard-tab-content"]');
    const overallDashboardPanel = document.getElementById('dashboard-tab-content');
    const vehiclesTabButton = document.querySelector('.tab-button[data-tab="vehicles-tab-content"]'); // Renamed
    const vehiclesPanel = document.getElementById('vehicles-tab-content'); // Renamed
    const allPackagesTabButton = document.querySelector('.tab-button[data-tab="all-packages-tab-content"]');
    const controlsPanel = document.getElementById('controls-panel'); 
    const vehicleManagementSection = document.getElementById('vehicle-management-section'); // Renamed

    document.querySelectorAll('.tab-panel').forEach(panel => panel.style.display = 'none');
    document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));

    if (currentPrincipalType === 'vehicle') {
        if (overallDashboardTabButton) overallDashboardTabButton.style.display = 'none';
        if (controlsPanel) controlsPanel.style.display = 'none'; 
        if (vehicleManagementSection) vehicleManagementSection.style.display = 'none';
        // All Packages tab might be visible for vehicles, or hidden based on requirements. Assuming visible for now.
        // if (allPackagesTabButton) allPackagesTabButton.style.display = 'none'; 

        if (vehiclesTabButton && vehiclesPanel) { // Default to Vehicles View for vehicles
            vehiclesTabButton.classList.add('active');
            vehiclesPanel.style.display = 'block'; vehiclesPanel.classList.add('active');
            if (!driverMap && typeof initVehicleMap === 'function') await initVehicleMap(); 
            else if (driverMap) driverMap.invalidateSize();
            if (typeof populateVehicleSelect === 'function') await populateVehicleSelect(); 
            if (currentPrincipalInfo && currentPrincipalInfo.vehicleId) {
                const vehicleSelect = document.getElementById('vehicle-select');
                if (vehicleSelect) {
                    vehicleSelect.value = currentPrincipalInfo.vehicleId;
                    await handleVehicleSelectionChange(); 
                    // vehicleSelect.disabled = true; 
                }
            }
        }
    } else { // Admin
        if (overallDashboardTabButton && overallDashboardPanel) {
            overallDashboardTabButton.style.display = ''; 
            overallDashboardTabButton.classList.add('active');
            overallDashboardPanel.style.display = 'block';
            if (!map && typeof initMap === 'function') initMap();
        }
        if (vehiclesTabButton) vehiclesTabButton.style.display = ''; 
        if (allPackagesTabButton) allPackagesTabButton.style.display = '';
        if (controlsPanel) controlsPanel.style.display = ''; 
        if (vehicleManagementSection) vehicleManagementSection.style.display = '';
    }

    setupTabEventListeners(); 

    setTimeout(async () => {
        if (currentPrincipalType === 'admin') { 
            if (overallDashboardPanel?.classList.contains('active')) {
                if (typeof populatePickupLocationDropdown === 'function') await populatePickupLocationDropdown();
                // if (typeof displayAdminVehicleManagement === 'function') await displayAdminVehicleManagement(); // Will be called by specific tab logic
                // displayAllPackages is called when its tab is activated.
            }
        } else if (currentPrincipalType === 'vehicle') {
            requestAndSendVehicleLocation(); 
            if (window.vehicleLocationIntervalId) clearInterval(window.vehicleLocationIntervalId); 
            window.vehicleLocationIntervalId = setInterval(requestAndSendVehicleLocation, 3 * 60 * 1000); 
            console.log('[App Init] Periodic location update interval started for vehicle.');
        }
    }, 0);

    const vehicleSelect = document.getElementById('vehicle-select'); // Renamed from driverSelect
    if (vehicleSelect) {
        vehicleSelect.addEventListener('change', handleVehicleSelectionChange); // Renamed
    }
    
    const newPackageForm = document.getElementById('new-package-form');
    if (newPackageForm && currentPrincipalType === 'admin') { // Only admins can create packages
        newPackageForm.addEventListener('submit', async function(event) { 
            event.preventDefault();
            // ... (rest of newPackageForm logic, ensure it uses assigned_vehicle_id)
            // Example snippet for the body part:
            // body: JSON.stringify({ ...packagePayload, assigned_vehicle_id: someVehicleIdIfAssignedAtCreation })
        });
    } else if (newPackageForm) {
        newPackageForm.style.display = 'none'; // Hide form if not admin
    }

    const newVehicleForm = document.getElementById('new-vehicle-form'); // Assuming this ID exists
    if (newVehicleForm && currentPrincipalType === 'admin') {
        newVehicleForm.addEventListener('submit', async function(event) {
            // ... (logic for adding/updating vehicles via admin - similar to newDriverForm)
            // This would call /api/vehicles (POST or PUT)
        });
    } else if (newVehicleForm) {
        newVehicleForm.style.display = 'none';
    }
});

async function populatePickupLocationDropdown() {
    const pickupLocationSelect = document.getElementById('pickup-location-select');
    if (!pickupLocationSelect) return; // Element might not be present for all roles
    // ... (rest of the function)
    const customLocationFieldsDiv = document.getElementById('custom-location-fields');
    const zipCodeInput = document.getElementById('pickup-zip-code');

    if (!customLocationFieldsDiv || !zipCodeInput) {
        console.error('[App] One or more elements for pickup location dropdown not found for custom fields.');
        return;
    }
    pickupLocationSelect.innerHTML = ''; 
    try {
        const response = await fetchApi('/api/predefinedlocations'); 
        if (!response.ok) throw new Error(`Failed to fetch predefined locations: ${response.status}`);
        const data = await response.json();
        currentPredefinedLocations = data.predefined_locations || []; 
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
            // alert('Error loading predefined pickup locations. Custom ZIP code entry will be shown.');
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


async function populateVehicleSelect() { // Renamed from populateDriverSelect
    const vehicleSelect = document.getElementById('vehicle-select'); // Assuming ID change
    if (!vehicleSelect) { 
        console.error('[App] Vehicle select dropdown not found.');
        return;
    }
    let vehiclesFromApi = []; 
    try {
        const response = await fetchApi('/api/vehicles'); 
        if (!response.ok) throw new Error(`Failed to fetch vehicles for dropdown: ${response.status}`);
        const data = await response.json();
        vehiclesFromApi = data.vehicles || [];
    } catch (error) {
         if (error.message !== 'Unauthorized') {
            console.error('[App] Error fetching vehicles for select:', error);
        }
    }
    vehicleSelect.innerHTML = ''; 
    const placeholderOption = document.createElement('option');
    placeholderOption.value = "";
    placeholderOption.textContent = "-- Select a Vehicle --";
    placeholderOption.disabled = true;
    placeholderOption.selected = !vehiclesFromApi.some(v => v.vehicle_id === parseInt(vehicleSelect.value)); 
    vehicleSelect.appendChild(placeholderOption);

    vehiclesFromApi.forEach(vehicle => {
        const option = document.createElement('option');
        option.value = vehicle.vehicle_id; 
        option.textContent = vehicle.display_name || vehicle.vehicle_plate_number; // Use display name or plate
        if (parseInt(vehicleSelect.value) === vehicle.vehicle_id && !placeholderOption.selected) {
            option.selected = true;
        }
        vehicleSelect.appendChild(option);
    });
}

async function handleVehicleSelectionChange() { // Renamed from handleDriverSelectionChange
    const vehicleSelectElement = document.getElementById('vehicle-select'); 
    if (!vehicleSelectElement) { console.error('[App] Vehicle select element not found.'); return; }
    const selectedVehicleId = parseInt(vehicleSelectElement.value); 
    const vehiclePackagesList = document.getElementById('vehicle-specific-package-list'); // Assuming ID change
    if (!vehiclePackagesList) { console.error('[App] Vehicle specific package list element not found.'); return; }
    
    if (isNaN(selectedVehicleId)) {
        vehiclePackagesList.innerHTML = '<li>Please select a vehicle.</li>';
        if (driverMap) driverMap.setView([HQ_LOCATION.lat, HQ_LOCATION.lng], 7); // driverMap is vehicleMap
        if (currentVehicleViewMarker) { currentVehicleViewMarker.remove(); currentVehicleViewMarker = null; }
        return;
    }

    const vehicleDetails = vehicleMarkers.find(v => v.id === selectedVehicleId); // Use vehicleMarkers
    if (vehicleDetails && vehicleDetails.marker) { 
        if (!driverMap || typeof driverMap.addLayer !== 'function') { 
            await initVehicleMap(); 
            if (!driverMap) { vehiclePackagesList.innerHTML = '<li>Vehicle map could not be initialized.</li>'; return; }
        }
        const vehicleLocation = vehicleDetails.marker.getLatLng(); 
        driverMap.setView([vehicleLocation.lat, vehicleLocation.lng], 12);
        if (currentVehicleViewMarker) currentVehicleViewMarker.remove(); 
        currentVehicleViewMarker = addMarker(
           {lat: vehicleLocation.lat, lng: vehicleLocation.lng}, 
           `Current Location: ${vehicleDetails.displayName || vehicleDetails.plateNumber}`,
            VEHICLE_ICON_URL, 
           driverMap 
        );
        if (currentVehicleViewMarker) currentVehicleViewMarker.openPopup(); 
    } else {
        vehiclePackagesList.innerHTML = `<li>Vehicle details not found or location unknown for ID ${selectedVehicleId}.</li>`;
        if (driverMap) driverMap.setView([HQ_LOCATION.lat, HQ_LOCATION.lng], 7);
        if (currentVehicleViewMarker) { currentVehicleViewMarker.remove(); currentVehicleViewMarker = null; }
    }

    vehiclePackagesList.innerHTML = '<li>Loading packages...</li>';
    let vehicleSpecificPackages = [];
    try {
        const response = await fetchApi(`/api/packages?assigned_vehicle_id=${selectedVehicleId}`); 
        if (!response.ok) throw new Error(`Failed to fetch packages: ${response.status}`);
        const data = await response.json();
        vehicleSpecificPackages = data.packages || [];
    } catch (error) {
         if (error.message !== 'Unauthorized') {
            console.error(`[App] Error fetching packages for vehicle ${selectedVehicleId}:`, error);
            vehiclePackagesList.innerHTML = '<li>Error loading packages for this vehicle.</li>';
        }
        return;
    }

    if (vehicleSpecificPackages.length === 0) {
        vehiclePackagesList.innerHTML = '<li>No packages currently assigned to this vehicle.</li>';
    } else {
        vehiclePackagesList.innerHTML = ''; 
        vehicleSpecificPackages.forEach(pkg => {
            const listItem = document.createElement('li');
            listItem.innerHTML = `<b>Package:</b> ${pkg.unique_tracking_number} - <b>Status:</b> ${pkg.status}<br><b>To:</b> ${pkg.delivery_address}`;
            const packageIdForActions = pkg.package_id; 
            const packageCodeForAlerts = pkg.unique_tracking_number;

            // Buttons for 'vehicle' type to accept/decline
            if (pkg.status === 'assigned' && currentPrincipalType === 'vehicle' && currentPrincipalInfo && currentPrincipalInfo.vehicleId === selectedVehicleId) {
                const acceptBtn = document.createElement('button'); /* ... as before ... */ 
                acceptBtn.textContent = 'Accept'; acceptBtn.style.marginLeft = '5px'; acceptBtn.style.marginTop = '5px';
                acceptBtn.dataset.packageId = packageIdForActions;
                acceptBtn.onclick = async function() { /* ... API call to set status to 'accepted_by_driver' ... then refresh lists */ };
                listItem.appendChild(acceptBtn);

                const declineBtn = document.createElement('button'); /* ... as before ... */
                declineBtn.textContent = 'Decline'; declineBtn.style.marginLeft = '5px'; declineBtn.style.marginTop = '5px';
                declineBtn.dataset.packageId = packageIdForActions;
                declineBtn.onclick = async function() { /* ... API call to set status to 'declined_by_driver', assigned_vehicle_id to null ... then refresh lists */};
                listItem.appendChild(declineBtn);
            }
            vehiclePackagesList.appendChild(listItem);
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
    } else { // Default Leaflet icon if no URL
         markerOptions.icon = L.icon({ // Provide default icon paths
            iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
            iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
            shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
            iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41]
        });
    }
    const leafletMarker = L.marker([location.lat, location.lng], markerOptions).addTo(mapToUse);
    if (title) leafletMarker.bindPopup(title);
    return leafletMarker; 
}

async function initializeVehicleMarkers() { // Renamed from initializeDrivers
    if (!map || typeof map.addLayer !== 'function') { 
        return;
    }
    let vehiclesFromApi = [];
    try {
        const response = await fetchApi('/api/vehicles'); 
        if (!response.ok) throw new Error(`Failed to fetch vehicles: ${response.status} ${response.statusText}`);
        const data = await response.json();
        vehiclesFromApi = data.vehicles || []; 
    } catch (error) {
         if (error.message !== 'Unauthorized') {
            console.error('[App] Error fetching vehicles from API:', error);
        }
    }
    
    vehicleMarkers.forEach(vm => { // Use vehicleMarkers
        if (vm.marker && typeof vm.marker.remove === 'function') vm.marker.remove();
    });
    vehicleMarkers = []; 
    vehiclesFromApi.forEach(vehicle => {
        if (vehicle.current_lat !== null && vehicle.current_lng !== null) {
            const location = { lat: vehicle.current_lat, lng: vehicle.current_lng };
            const marker = addMarker(location, vehicle.display_name || vehicle.vehicle_plate_number, VEHICLE_ICON_URL, map);
            if (marker) vehicleMarkers.push({ 
                id: vehicle.vehicle_id, 
                marker: marker, 
                plateNumber: vehicle.vehicle_plate_number,
                displayName: vehicle.display_name 
            });
        } else {
            console.warn(`[App] Vehicle ${vehicle.vehicle_plate_number} (ID: ${vehicle.vehicle_id}) has no valid location data.`);
        }
    });
    console.log('[App] Vehicle markers (from API) initialized on main map.');
}

function simulateDriverMovement() { /* This function is likely deprecated or needs vehicle logic */ }

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

[end of public/app.js]
