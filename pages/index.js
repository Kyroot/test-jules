import Head from 'next/head';
import Script from 'next/script';

export default function HomePage() {
  return (
    <>
      <Head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Package Tracking SPA</title>
        <link rel="stylesheet" href="/style.css" />
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=" crossOrigin=""/>
      </Head>

      <body>
        <header>
          <h1>Package Tracking Dashboard</h1>
          <div style={{ position: 'absolute', top: '10px', right: '20px', color: 'white' }}>
            <span id="user-welcome-message" style={{ marginRight: '20px' }}></span>
            <button id="logout-button" style={{ display: 'none', padding: '8px 12px', cursor: 'pointer' }}>Logout</button>
          </div>
        </header>

        <nav id="tab-navigation">
          <button className="tab-button active" data-tab="dashboard-tab-content">Overall Dashboard</button>
          <button className="tab-button" data-tab="vehicles-tab-content">Vehicles View</button> {/* Renamed */}
          <button className="tab-button" data-tab="all-packages-tab-content">All Packages</button>
        </nav>

        <div id="tab-content">
          <div id="dashboard-tab-content" className="tab-panel active">
            <main>
              <div id="map-container" style={{ width: '70%', height: '500px', border:'1px solid #ccc' }}>
              </div>

              <div id="controls-panel" style={{ width: '30%', padding: '10px', border: '1px solid #ccc', backgroundColor: '#f9f9f9', overflowY: 'auto' }}>
                <h2>New Package</h2>
                <form id="new-package-form">
                  <div>
                    <label htmlFor="package-description">Description/Notes:</label>
                    <input type="text" id="package-description" name="package-description" />
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
                  <div id="custom-location-fields" style={{ display: 'none' }}>
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

                {/* Vehicle Management Section - Updated */}
                <div id="vehicle-management-section" style={{ marginTop: '20px', borderTop: '1px solid #eee', paddingTop: '10px' }}>
                    <h2>Vehicle Management</h2> {/* Renamed */}
                    <form id="new-vehicle-form"> {/* Renamed */}
                        <h3>Add/Update Vehicle</h3> {/* Renamed */}
                        <div>
                            <label htmlFor="vehicle-plate-number">Vehicle Plate #:</label>
                            <input type="text" id="vehicle-plate-number" name="vehicle-plate-number" required />
                        </div>
                        <div>
                            <label htmlFor="vehicle-password">Password (for new vehicle, or to change):</label>
                            <input type="password" id="vehicle-password" name="vehicle-password" />
                        </div>
                        <div>
                            <label htmlFor="vehicle-display-name">Vehicle Display Name:</label>
                            <input type="text" id="vehicle-display-name" name="vehicle-display-name" required />
                        </div>
                        <div>
                            <label htmlFor="vehicle-operator-name">Operator Name (Optional):</label>
                            <input type="text" id="vehicle-operator-name" name="vehicle-operator-name" />
                        </div>
                        <div>
                            <label htmlFor="vehicle-operator-contact">Operator Contact (Optional):</label>
                            <input type="text" id="vehicle-operator-contact" name="vehicle-operator-contact" />
                        </div>
                        <div>
                            <label htmlFor="vehicle-initial-lat">Initial Latitude (Optional):</label>
                            <input type="number" step="any" id="vehicle-initial-lat" name="vehicle-initial-lat" />
                        </div>
                        <div>
                            <label htmlFor="vehicle-initial-lng">Initial Longitude (Optional):</label>
                            <input type="number" step="any" id="vehicle-initial-lng" name="vehicle-initial-lng" />
                        </div>
                        <button type="submit">Add Vehicle</button> {/* Text updated */}
                    </form>
                    <div id="vehicles-list-admin" style={{ marginTop: '15px' }}> {/* ID potentially changed */}
                        <h3>Current Vehicles</h3> {/* Renamed */}
                        <ul id="editable-vehicles-ul" style={{ listStyleType: 'none', paddingLeft: '0' }}> {/* Renamed */}
                            {/* Vehicles will be listed here by app.js */}
                        </ul>
                    </div>
                </div>
              </div>
            </main>
          </div>

          {/* Vehicles Tab Content - Updated */}
          <div id="vehicles-tab-content" className="tab-panel" style={{ display: 'none' }}> {/* Renamed ID */}
            <header style={{ padding:'10px', backgroundColor:'#f0f0f0', borderBottom:'1px solid #ccc' }}>
              <h2>Vehicle-Specific View</h2> {/* Renamed */}
              <label htmlFor="vehicle-select-driverview">Select Vehicle:</label> {/* Renamed label and select ID */}
              <select id="vehicle-select-driverview" style={{ padding:'5px', marginLeft:'5px' }}></select>
            </header>
            <main>
              <div id="vehicle-map-container" style={{ width: '70%', height: '500px', border:'1px solid #ccc' }}> {/* Renamed ID */}
                {/* Map for vehicle view will be initialized here by app.js */}
              </div>
              <div id="vehicle-packages-panel" style={{ width: '30%', padding: '10px', border: '1px solid #ccc', backgroundColor: '#f9f9f9', overflowY: 'auto' }}> {/* Renamed ID */}
                <h3>Packages for Selected Vehicle</h3> {/* Renamed */}
                <ul id="vehicle-specific-package-list"> {/* Renamed ID */}
                  <li>Package details for the selected vehicle will appear here.</li>
                </ul>
              </div>
            </main>
          </div>

          {/* All Packages Tab Content */}
          <div id="all-packages-tab-content" className="tab-panel" style={{ display: 'none' }}>
            <header style={{ padding:'10px', backgroundColor:'#f0f0f0', borderBottom:'1px solid #ccc' }}>
                <h2>All Packages</h2>
            </header>
            <main>
                <ul id="all-packages-list" style={{ listStyleType: 'none', padding: 0 }}>
                    <li>Loading packages...</li>
                </ul>
            </main>
          </div>
        </div>

        <footer>
          <p>&copy; 2023 Package Trans</p>
        </footer>

        <Script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js" integrity="sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=" crossOrigin="" strategy="beforeInteractive" />
        <Script src="/app.js" strategy="lazyOnload" />
      </body>
    </>
  );
}
