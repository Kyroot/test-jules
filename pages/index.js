import Head from 'next/head';
import Script from 'next/script';

export default function HomePage() {
  return (
    <>
      <Head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Package Tracking SPA</title>
        <link rel="stylesheet" href="/style.css" /> {/* Path relative to public directory */}
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=" crossOrigin=""/>
        {/* Google Maps API script is intentionally removed/commented out as per previous migration */}
      </Head>

      <body> {/* Next.js handles the body tag, but we include its content */}
        <header>
          <h1>Package Tracking Dashboard</h1>
          <div style={{ position: 'absolute', top: '10px', right: '20px', color: 'white' }}>
            <span id="user-welcome-message" style={{ marginRight: '20px' }}></span>
            <button id="logout-button" style={{ display: 'none', padding: '8px 12px', cursor: 'pointer' }}>Logout</button>
          </div>
        </header>

        <nav id="tab-navigation">
          <button className="tab-button active" data-tab="dashboard-tab-content">Overall Dashboard</button>
          <button className="tab-button" data-tab="drivers-tab-content">Drivers View</button>
        </nav>

        <div id="tab-content">
          <div id="dashboard-tab-content" className="tab-panel active">
            <main> {/* Existing main content with map and controls */}
              <div id="map-container" style={{ width: '70%', height: '500px', border:'1px solid #ccc' }}>
                {/* Map will be rendered here by app.js */}
              </div>

              <div id="controls-panel" style={{ width: '30%', padding: '10px', border: '1px solid #ccc', backgroundColor: '#f9f9f9', overflowY: 'auto' }}>
                <h2>New Package</h2>
                <form id="new-package-form">
                  <div>
                    <label htmlFor="package-description">Description/Notes:</label>
                    <input type="text" id="package-description" name="package-description" /> {/* Optional or for internal notes */}
                  </div>
                  <div>
                    <label htmlFor="recipient-name">Recipient Name:</label>
                    <input type="text" id="recipient-name" name="recipient-name" required />
                  </div>
                  <div>
                    <label htmlFor="delivery-address">Delivery Address:</label>
                    <input type="text" id="delivery-address" name="delivery-address" required />
                  </div>
                  <div>
                    <label htmlFor="pickup-location-select">Pickup Location:</label>
                    <select id="pickup-location-select" name="pickup-location-select"></select>
                  </div>
                  <div id="custom-location-fields" style={{ display: 'none' }}> {/* Initially hidden */}
                    <div>
                      <label htmlFor="pickup-zip-code">Pickup ZIP Code:</label>
                      <input type="text" id="pickup-zip-code" name="pickup-zip-code" />
                    </div>
                    <div>
                      <label htmlFor="pickup-country">Country (for ZIP Code):</label>
                      <input type="text" id="pickup-country" name="pickup-country" defaultValue="Moldova" /> 
                    </div>
                  </div>
                  <button type="submit">Add Package</button>
                </form>

                <h2>Pending Pickups</h2>
                <ul id="pending-pickups-list">
                  {/* New packages will be listed here by app.js */}
                </ul>

                {/* Driver Management Section */}
                <div id="driver-management-section" style={{ marginTop: '20px', borderTop: '1px solid #eee', paddingTop: '10px' }}>
                    <h2>Driver Management</h2>
                    <form id="new-driver-form">
                        <h3>Add New Driver</h3>
                        <div>
                            <label htmlFor="driver-name">Driver Name:</label>
                            <input type="text" id="driver-name" name="driver-name" required />
                        </div>
                        <div>
                            <label htmlFor="driver-contact">Contact Info (Optional):</label>
                            <input type="text" id="driver-contact" name="driver-contact" />
                        </div>
                        <div>
                            <label htmlFor="driver-initial-lat">Initial Latitude (Optional):</label>
                            <input type="number" step="any" id="driver-initial-lat" name="driver-initial-lat" />
                        </div>
                        <div>
                            <label htmlFor="driver-initial-lng">Initial Longitude (Optional):</label>
                            <input type="number" step="any" id="driver-initial-lng" name="driver-initial-lng" />
                        </div>
                        <button type="submit">Add Driver</button>
                    </form>
                    <div id="drivers-list-admin" style={{ marginTop: '15px' }}>
                        <h3>Current Drivers</h3>
                        <ul id="editable-drivers-ul" style={{ listStyleType: 'none', paddingLeft: '0' }}>
                            {/* Drivers will be listed here by app.js */}
                        </ul>
                    </div>
                </div>
              </div>
            </main>
          </div>

          <div id="drivers-tab-content" className="tab-panel" style={{ display: 'none' }}>
            <header style={{ padding:'10px', backgroundColor:'#f0f0f0', borderBottom:'1px solid #ccc' }}>
              <h2>Driver-Specific View</h2>
              <label htmlFor="driver-select">Select Driver:</label>
              <select id="driver-select" style={{ padding:'5px', marginLeft:'5px' }}></select>
            </header>
            <main>
              <div id="driver-map-container" style={{ width: '70%', height: '500px', border:'1px solid #ccc' }}>
                {/* Map for driver view will be initialized here by app.js */}
              </div>
              <div id="driver-packages-panel" style={{ width: '30%', padding: '10px', border: '1px solid #ccc', backgroundColor: '#f9f9f9', overflowY: 'auto' }}>
                <h3>Packages for Selected Driver</h3>
                <ul id="driver-specific-package-list">
                  <li>Package details for the selected driver will appear here.</li>
                </ul>
              </div>
            </main>
          </div>
        </div>

        <footer>
          <p>&copy; 2023 Package Trans</p>
        </footer>

        {/* Script loading order: Leaflet, then app.js */}
        <Script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js" integrity="sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=" crossOrigin="" strategy="beforeInteractive" />
        {/* <Script src="/backend.js" strategy="lazyOnload" /> Removed as backend.js is deleted */}
        <Script src="/app.js" strategy="lazyOnload" />
      </body>
    </>
  );
}
