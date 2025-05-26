// pages/api/drivers/[driver_id].js
import { query } from '../../../lib/db'; 
import { protectRoute } from '../../../lib/authUtils';

async function driverIdHandler(req, res) { // Renamed original handler
    const { driver_id } = req.query;
    const id = parseInt(driver_id);

    if (isNaN(id)) {
        return res.status(400).json({ error: 'Invalid driver ID provided.' });
    }

    if (req.method === 'GET') {
        try {
            const drivers = await query({
                query: 'SELECT * FROM Drivers WHERE driver_id = ?',
                values: [id],
            });
            if (drivers.length === 0) {
                return res.status(404).json({ error: 'Driver not found' });
            }
            res.status(200).json({ driver: drivers[0] });
        } catch (error) {
            console.error(`[API Driver GET ${id}]`, error);
            res.status(500).json({ error: 'Failed to fetch driver', details: error.message });
        }
    } else if (req.method === 'PUT') {
        // This part is now protected
        try {
            const { name, contact_info, current_lat, current_lng } = req.body;
            const fieldsToUpdate = {};
            if (name !== undefined) fieldsToUpdate.name = name;
            if (contact_info !== undefined) fieldsToUpdate.contact_info = contact_info;
            if (current_lat !== undefined) fieldsToUpdate.current_lat = current_lat;
            if (current_lng !== undefined) fieldsToUpdate.current_lng = current_lng;

            if (Object.keys(fieldsToUpdate).length === 0) {
                return res.status(400).json({ error: 'No fields provided for update' });
            }
            if (fieldsToUpdate.name === '' || (fieldsToUpdate.name === null && name !== undefined)) {
                 return res.status(400).json({ error: 'Driver name cannot be empty' });
            }

            const updateQuery = 'UPDATE Drivers SET ? WHERE driver_id = ?';
            const results = await query({ query: updateQuery, values: [fieldsToUpdate, id] });

            if (results.affectedRows > 0) {
                res.status(200).json({ message: 'Driver updated successfully' });
            } else {
                const existingDriver = await query({ query: 'SELECT driver_id FROM Drivers WHERE driver_id = ?', values: [id] });
                if (existingDriver.length === 0) {
                    return res.status(404).json({ error: 'Driver not found for update' });
                }
                res.status(200).json({ message: 'Driver data was the same, no changes made.' });
            }
        } catch (error) {
            console.error(`[API Driver PUT ${id}]`, error);
            res.status(500).json({ error: 'Failed to update driver', details: error.message });
        }
    } else if (req.method === 'DELETE') {
        // This part is now protected
        try {
            const results = await query({ query: 'DELETE FROM Drivers WHERE driver_id = ?', values: [id] });
            if (results.affectedRows > 0) {
                res.status(200).json({ message: 'Driver deleted successfully' });
            } else {
                res.status(404).json({ error: 'Driver not found or already deleted' });
            }
        } catch (error) {
            console.error(`[API Driver DELETE ${id}]`, error);
            if (error.code === 'ER_ROW_IS_REFERENCED_2') { 
                 return res.status(409).json({ error: 'Driver cannot be deleted as they are referenced by packages. Please reassign packages first.' });
            }
            res.status(500).json({ error: 'Failed to delete driver', details: error.message });
        }
    } else {
        res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
        res.status(405).end(`Method ${req.method} Not Allowed in driverIdHandler`);
    }
}

export default async function(req, res) {
    if (req.method === 'PUT' || req.method === 'DELETE') {
        return protectRoute(driverIdHandler)(req, res);
    } else if (req.method === 'GET') {
        return driverIdHandler(req, res);
    } else {
        res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
        res.status(405).end(`Method ${req.method} Not Allowed`);
    }
}
