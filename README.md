# Package Tracking SPA (Leaflet.js Version)

This is a Single Page Application (SPA) designed for a business owner to track driver locations, manage package assignments, and get simulated notifications for package pickups. It operates entirely within the browser, using **Leaflet.js** for mapping and JavaScript to simulate backend functionalities.

## Phase 4: Migration to Leaflet.js
This version has been migrated from Google Maps API to Leaflet.js, using OpenStreetMap for map tiles and Nominatim for geocoding.

## Key Features
*   **Mapping:** Uses Leaflet.js with OpenStreetMap tiles.
*   **Tabbed Interface:** "Overall Dashboard" and "Drivers View".
*   **Enhanced Package Information:** Packages include an auto-generated unique `packageCode`, recipient name, and delivery address.
*   **Predefined & Custom Pickup Locations:** Select from a dropdown of predefined locations or enter a ZIP code (and country) for custom locations, which are then geocoded using Nominatim.
*   **Package Assignment & Status:**
    *   Packages have statuses: 'pending', 'assigned', 'accepted_by_driver', 'declined_by_driver'.
    *   Assign 'pending' packages to available drivers directly from the main dashboard.
*   **Driver-Specific View:**
    *   Select a driver to see their location centered on a dedicated map.
    *   View a list of packages assigned to the selected driver.
    *   Conceptually "Accept" or "Decline" assigned packages.
*   **Simulated Telegram Notifications:** When a package is assigned, a notification is simulated in the browser's console.
*   **Simulated Backend:** Data is managed in memory by `backend.js` and resets on page reload.
*   **Driver Tracking:** Displays driver locations on a map in (simulated) real-time.


## Prerequisites

1.  **Web Browser:** A modern web browser (e.g., Chrome, Firefox, Safari, Edge).
2.  **Internet Connection:** Required to load Leaflet.js, OpenStreetMap tiles, and for Nominatim geocoding requests.

## Setup and Running the Application

1.  **Download Files:**
    Ensure you have the following files in the same directory:
    *   `index.html`
    *   `style.css`
    *   `app.js`
    *   `backend.js` (simulates backend operations)
    *(Leaflet.js library is included via CDN in `index.html` - no separate installation needed).*

2.  **Open in Browser:**
    *   Open the `index.html` file directly in your web browser (e.g., by double-clicking it or using "File > Open" in your browser).

## How to Use

### Overall Dashboard Tab

*   **Viewing Drivers & HQ:** The main map shows simulated driver locations and the Business HQ.
*   **Adding a New Package:**
    1.  Use the "New Package" form on the right.
    2.  Enter "Description/Notes" (optional).
    3.  Enter "Recipient Name" and "Delivery Address" (required).
    4.  Select a "Pickup Location" from the dropdown. Sample locations are provided.
    5.  If "Custom Location" is selected, input fields for "Pickup ZIP Code" and "Country" will appear. Enter the relevant ZIP code (the country defaults to "Moldova" but can be changed). The system will use **Nominatim (OpenStreetMap's geocoding service)** to find the coordinates for this location.
    6.  Click "Add Package".
    7.  The package will appear on the map and in the "Pending Pickups" list with status 'pending'.
*   **Assigning a Package:**
    1.  In the "Pending Pickups" list, find a package with status 'pending'.
    2.  Click the "Assign to Driver" button next to it.
    3.  When prompted, enter the numerical ID of an existing driver.
    4.  If successful, the package status updates, and a simulated Telegram notification is logged.

### Drivers View Tab
(This section remains largely the same in functionality)
1.  Click the "Drivers View" tab.
2.  **Select a Driver:** Choose a driver from the dropdown.
    *   The map centers on the selected driver.
    *   The panel lists packages assigned to this driver.
3.  **Simulating Driver Actions (Accept/Decline):**
    *   "Accept" or "Decline" assigned packages.

## Technology & Credits

*   **Mapping Library:** [Leaflet.js](https://leafletjs.com/) - An open-source JavaScript library for interactive maps.
*   **Map Tiles:** Map tiles are provided by &copy; [OpenStreetMap contributors](https://www.openstreetmap.org/copyright).
*   **Geocoding Service:** Custom ZIP code lookups are performed using [Nominatim](https://nominatim.openstreetmap.org/), a search engine for OpenStreetMap data. (Please respect Nominatim's [Usage Policy](https://operations.osmfoundation.org/policies/nominatim/) if adapting this code for heavier use; a User-Agent is set in the requests).

## Data Persistence

*   All driver, package, and location data is stored in-memory while the page is open. **Reloading the page will reset all data to its initial state.**
*   The Telegram notifications are simulations logged to the browser's developer console.
