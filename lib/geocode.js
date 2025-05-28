// lib/geocode.js (New file)
export async function geocodeZipToCoords(zipCode, country) {
    const queryParams = new URLSearchParams({
        format: 'json',
        postalcode: zipCode,
        country: country,
        limit: 1
    });
    const url = `https://nominatim.openstreetmap.org/search?${queryParams}`;
    console.log(`[Geocode API] Attempting to geocode with Nominatim: ${url}`);

    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'User-Agent': 'PackageTrackerNextJSBackend/1.0 (contact@example-app.com)' // Server-side User-Agent
            }
        });
        if (!response.ok) {
            throw new Error(`Nominatim API request failed with status ${response.status}`);
        }
        const data = await response.json();
        if (data && data.length > 0) {
            const lat = parseFloat(data[0].lat);
            const lon = parseFloat(data[0].lon);
            if (!isNaN(lat) && !isNaN(lon)) {
                return { lat, lng: lon }; // Consistent {lat, lng}
            }
        }
        throw new Error('No valid coordinates found by Nominatim.');
    } catch (error) {
        console.error('[Geocode API] Error during Nominatim geocoding:', error);
        throw error; // Re-throw to be caught by API route
    }
}
