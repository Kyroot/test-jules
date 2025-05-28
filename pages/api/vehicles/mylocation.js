// pages/api/vehicles/mylocation.js
import { query } from '../../../lib/db';
import { protectRoute } from '../../../lib/authUtils';

async function myLocationHandler(req, res) {
    if (req.method === 'PUT') {
        try {
            const { lat, lng } = req.body;
            // req.user is populated by protectRoute and contains JWT payload
            // For a vehicle login, req.user should have vehicleId and type: 'vehicle'
            const vehicleId = req.user.vehicleId; 

            if (req.user.type !== 'vehicle' || !vehicleId) {
                return res.status(403).json({ error: 'Forbidden: Only authenticated vehicles can update their location.' });
            }

            if (lat === undefined || lng === undefined) {
                return res.status(400).json({ error: 'Latitude and longitude are required.' });
            }
            const parsedLat = parseFloat(lat);
            const parsedLng = parseFloat(lng);
            if (isNaN(parsedLat) || isNaN(parsedLng)) {
                return res.status(400).json({ error: 'Latitude and longitude must be valid numbers.' });
            }

            const updateQuery = 'UPDATE Vehicles SET current_lat = ?, current_lng = ? WHERE vehicle_id = ?';
            const results = await query({ query: updateQuery, values: [parsedLat, parsedLng, vehicleId] });

            if (results.affectedRows > 0) {
                res.status(200).json({ message: 'Vehicle location updated successfully.' });
            } else {
                // Check if vehicle exists, could be that location was same
                const existing = await query({ query: 'SELECT vehicle_id FROM Vehicles WHERE vehicle_id = ?', values: [vehicleId]});
                if (existing.length === 0) return res.status(404).json({ error: 'Vehicle not found for location update.' });
                res.status(200).json({ message: 'Location data was the same or no active change, no rows affected.' });
            }
        } catch (error) {
            console.error(`[API Vehicle MyLocation PUT VehicleID: ${req.user?.vehicleId}]`, error);
            res.status(500).json({ error: 'Failed to update vehicle location', details: error.message });
        }
    } else {
        res.setHeader('Allow', ['PUT']);
        res.status(405).end(`Method ${req.method} Not Allowed`);
    }
}
// This route should be accessible by authenticated vehicles
export default protectRoute(myLocationHandler, ['vehicle']);
