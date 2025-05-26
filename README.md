# Package Tracking SPA (Enhanced)

This is a Single Page Application (SPA) designed for a business owner to track driver locations, manage package assignments, and get simulated notifications for package pickups. It operates entirely within the browser, using JavaScript to simulate backend functionalities.

## Phase 2 Enhancements

*   **Tabbed Interface:** "Overall Dashboard" and "Drivers View".
*   **Enhanced Package Information:** Packages now include an auto-generated unique `packageCode`, recipient name, and delivery address.
*   **Predefined & Custom Pickup Locations:** Select from a dropdown of predefined locations or enter custom latitude/longitude.
*   **Package Assignment & Status:**
    *   Packages have statuses: 'pending', 'assigned', 'accepted_by_driver', 'declined_by_driver'.
    *   Assign 'pending' packages to available drivers directly from the main dashboard.
*   **Driver-Specific View:**
    *   Select a driver to see their location centered on a dedicated map.
    *   View a list of packages assigned to the selected driver.
    *   Conceptually "Accept" or "Decline" assigned packages (simulating driver actions).
*   **Simulated Telegram Notifications:** When a package is assigned to a driver, a notification is simulated in the browser's console, including package details and a Google Maps link to the pickup location.
*   **Simulated Backend:** Data (drivers, packages, predefined locations) is managed in memory by `backend.js` and resets on page reload.

## Core Features (from Phase 1)

*   **Driver Tracking:** Displays driver locations on a map in (simulated) real-time.
*   **Map Integration:** Uses Google Maps to visualize locations.

## Prerequisites

1.  **Web Browser:** A modern web browser (e.g., Chrome, Firefox, Safari, Edge).
2.  **Google Maps API Key:** You **must** have a valid Google Maps JavaScript API key.
    *   Go to the [Google Cloud Console](https://console.cloud.google.com/).
    *   Create a new project or select an existing one.
    *   Enable the "Maps JavaScript API".
    *   Under "Credentials," create an API key.
    *   **Important:** Restrict your API key to prevent unauthorized use (e.g., by HTTP referrers for your specific domain if deploying, or keep it for localhost development only if not deploying).

## Setup and Running the Application

1.  **Download Files:**
    Ensure you have the following files in the same directory:
    *   `index.html`
    *   `style.css`
    *   `app.js`
    *   `backend.js` (simulates backend operations)

2.  **Add Your Google Maps API Key:**
    *   Open `index.html` in a text editor.
    *   Find the following line:
        ```html
        <!-- <script src="https://maps.googleapis.com/maps/api/js?key=YOUR_API_KEY&callback=initMap" async defer></script> -->
        ```
    *   Uncomment it by removing `<!--` and `-->`.
    *   Replace `YOUR_API_KEY` with your actual Google Maps API key. The line should look like this:
        ```html
        <script src="https://maps.googleapis.com/maps/api/js?key=ACTUAL_KEY_HERE&callback=initMap" async defer></script>
        ```

3.  **Open in Browser:**
    *   Open the `index.html` file directly in your web browser (e.g., by double-clicking it or using "File > Open" in your browser).

## How to Use

### Overall Dashboard Tab

*   **Viewing Drivers & HQ:** The main map shows simulated driver locations (blue markers moving randomly) and the Business HQ.
*   **Adding a New Package:**
    1.  Use the "New Package" form on the right.
    2.  Enter "Description/Notes" (optional).
    3.  Enter "Recipient Name" and "Delivery Address" (required).
    4.  Select a "Pickup Location" from the dropdown. Sample locations are provided.
    5.  If "Custom Location" is selected, the latitude and longitude fields will appear; fill them in.
    6.  Click "Add Package".
    7.  The package will appear on the map (yellow marker) and in the "Pending Pickups" list with status 'pending'.
*   **Assigning a Package:**
    1.  In the "Pending Pickups" list, find a package with status 'pending'.
    2.  Click the "Assign to Driver" button next to it.
    3.  When prompted, enter the numerical ID of an existing driver (e.g., 1, 2, or 3 for the mock drivers).
    4.  If successful, the package status will update to 'assigned', the assigned driver's name will appear, and a simulated Telegram notification will be logged in the browser console.

### Drivers View Tab

1.  Click the "Drivers View" tab.
2.  **Select a Driver:** Choose a driver from the "Select Driver" dropdown.
    *   The map in this view will center on the selected driver's current location.
    *   The panel on the right ("Packages for Selected Driver") will list packages currently assigned to this driver, along with their status.
3.  **Simulating Driver Actions (Accept/Decline):**
    *   If a package is listed with status 'assigned', "Accept" and "Decline" buttons will appear next to it.
    *   Clicking "Accept" will change the package status to 'accepted_by_driver'.
    *   Clicking "Decline" will change the package status to 'declined_by_driver' and unassign it from the driver (it will then need attention in the main dashboard).
    *   These actions are conceptual representations of what a driver might do via a real Telegram bot.

### Data Persistence

*   All driver, package, and location data is stored in-memory while the page is open. **Reloading the page will reset all data to its initial state.**
*   The Telegram notifications are simulations logged to the browser's developer console.
