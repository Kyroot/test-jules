# Package Tracking SPA

This is a Single Page Application (SPA) designed for a business owner to track driver locations and get notified when new packages need to be picked up along their routes from Moldova to Europe.

## Features

*   **Driver Tracking:** Displays driver locations on a map in (simulated) real-time.
*   **Package Management:** Allows adding new packages with pickup locations.
*   **Notification List:** Shows a list of pending packages to be picked up.
*   **Map Integration:** Uses Google Maps to visualize locations.

## Prerequisites

1.  **Web Browser:** A modern web browser (e.g., Chrome, Firefox, Safari, Edge).
2.  **Google Maps API Key:** You need a valid Google Maps JavaScript API key.
    *   Go to the [Google Cloud Console](https://console.cloud.google.com/).
    *   Create a new project or select an existing one.
    *   Enable the "Maps JavaScript API".
    *   Under "Credentials," create an API key.
    *   **Important:** Restrict your API key to prevent unauthorized use (e.g., by HTTP referrers for your specific domain if deploying, or keep it for localhost development only if not deploying).

## Setup and Running the Application

1.  **Clone/Download Files:**
    Ensure you have the following files in the same directory:
    *   `index.html`
    *   `style.css`
    *   `app.js`

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

4.  **Usage:**
    *   The map will load, showing the business HQ and simulated driver locations (blue markers).
    *   Use the form on the right to add new packages:
        *   Enter a description for the package.
        *   Enter the latitude and longitude for the pickup location.
        *   Click "Add Package".
    *   The new package will appear on the map (yellow marker) and in the "Pending Pickups" list.
    *   Driver markers will move randomly every few seconds to simulate tracking.

## Mock Data

*   **Driver Locations:** Driver locations are simulated and update randomly. They originate near Chișinău, Moldova.
*   **Package Data:** Package data is stored in the browser's memory and will be lost on page refresh. This is a demonstration application.
