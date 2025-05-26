// pages/api/predefinedlocations/[location_id].js
import { query } from '../../../lib/db';
import { protectRoute } from '../../../lib/authUtils';

async function singleLocationHandler(req, res) {
    const { location_id } = req.query;
    const id = parseInt(location_id);

    if (isNaN(id)) {
        return res.status(400).json({ error: 'Invalid location ID.' });
    }

    if (req.method === 'PUT') {
        try {
            const { name, address_details, lat, lng, is_active } = req.body;
            const fieldsToUpdate = {};
            if (name !== undefined) fieldsToUpdate.name = name;
            if (address_details !== undefined) fieldsToUpdate.address_details = address_details;
            if (lat !== undefined) fieldsToUpdate.lat = parseFloat(lat);
            if (lng !== undefined) fieldsToUpdate.lng = parseFloat(lng);
            if (is_active !== undefined) fieldsToUpdate.is_active = Boolean(is_active);

            if (Object.keys(fieldsToUpdate).length === 0) {
                return res.status(400).json({ error: 'No fields provided for update' });
            }
            if ((fieldsToUpdate.lat !== undefined && isNaN(fieldsToUpdate.lat)) || (fieldsToUpdate.lng !== undefined && isNaN(fieldsToUpdate.lng))) {
                 return res.status(400).json({ error: 'Latitude and longitude must be valid numbers if provided.' });
            }


            const updateQuery = 'UPDATE PredefinedPickupLocations SET ? WHERE location_id = ?';
            const results = await query({
                query: updateQuery,
                values: [fieldsToUpdate, id],
            });

            if (results.affectedRows > 0) {
                res.status(200).json({ message: 'Predefined location updated successfully' });
            } else {
                const existing = await query({ query: 'SELECT location_id FROM PredefinedPickupLocations WHERE location_id = ?', values: [id]});
                if (existing.length === 0) return res.status(404).json({ error: 'Location not found for update' });
                res.status(200).json({ message: 'Location data was the same, no changes made.' });
            }
        } catch (error) {
            console.error(`[API PredefinedLocation PUT ${id}]`, error);
            res.status(500).json({ error: 'Failed to update predefined location', details: error.message });
        }
    } else if (req.method === 'DELETE') { // This will mark as inactive instead of hard delete
        try {
            const results = await query({
                query: 'UPDATE PredefinedPickupLocations SET is_active = FALSE WHERE location_id = ?',
                values: [id],
            });
            if (results.affectedRows > 0) {
                res.status(200).json({ message: 'Predefined location deactivated successfully' });
            } else {
                res.status(404).json({ error: 'Predefined location not found or already inactive' });
            }
        } catch (error) {
            console.error(`[API PredefinedLocation DELETE ${id}]`, error);
            res.status(500).json({ error: 'Failed to deactivate predefined location', details: error.message });
        }
    } else {
        res.setHeader('Allow', ['PUT', 'DELETE']);
        res.status(405).end(`Method ${req.method} Not Allowed`);
    }
}

export default protectRoute(singleLocationHandler); // Protect PUT and DELETE
