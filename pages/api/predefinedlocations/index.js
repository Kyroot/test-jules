// pages/api/predefinedlocations/index.js
import { query } from '../../../lib/db';
import { protectRoute } from '../../../lib/authUtils';

async function locationsHandler(req, res) {
    if (req.method === 'GET') {
        try {
            const locations = await query({
                query: 'SELECT location_id, name, address_details, lat, lng FROM PredefinedPickupLocations WHERE is_active = TRUE ORDER BY name ASC',
                values: [],
            });
            res.status(200).json({ predefined_locations: locations });
        } catch (error) {
            console.error('[API PredefinedLocations GET]', error);
            res.status(500).json({ error: 'Failed to fetch predefined locations', details: error.message });
        }
    } else if (req.method === 'POST') {
        // This part is protected
        try {
            const { name, address_details, lat, lng } = req.body;
            if (!name || lat === undefined || lng === undefined) {
                return res.status(400).json({ error: 'Name, latitude, and longitude are required' });
            }
            // Validate lat/lng format if necessary (e.g., are they numbers)
            const parsedLat = parseFloat(lat);
            const parsedLng = parseFloat(lng);
            if (isNaN(parsedLat) || isNaN(parsedLng)) {
                return res.status(400).json({ error: 'Latitude and longitude must be valid numbers.' });
            }

            const addLocationQuery = `
                INSERT INTO PredefinedPickupLocations (name, address_details, lat, lng) 
                VALUES (?, ?, ?, ?)
            `;
            const results = await query({
                query: addLocationQuery,
                values: [name, address_details || null, parsedLat, parsedLng],
            });

            if (results.insertId) {
                res.status(201).json({ 
                    message: 'Predefined location created successfully', 
                    locationId: results.insertId,
                    // Return the created object
                    location: { location_id: results.insertId, name, address_details: address_details || null, lat: parsedLat, lng: parsedLng, is_active: true }
                });
            } else {
                throw new Error('Predefined location creation failed');
            }
        } catch (error) {
            console.error('[API PredefinedLocations POST]', error);
            res.status(500).json({ error: 'Failed to create predefined location', details: error.message });
        }
    } else {
        res.setHeader('Allow', ['GET', 'POST']);
        res.status(405).end(`Method ${req.method} Not Allowed`);
    }
}

export default function(req, res) {
    if (req.method === 'POST') {
        return protectRoute(locationsHandler)(req, res); // Protect POST
    }
    return locationsHandler(req, res); // GET is public
}
