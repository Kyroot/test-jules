// pages/api/packages/[package_id].js
import { query } from '../../../lib/db';
import { protectRoute } from '../../../lib/authUtils';

async function packageIdHandler(req, res) { // Renamed original handler
    const { package_id } = req.query;
    const id = parseInt(package_id);

    if (isNaN(id)) {
        return res.status(400).json({ error: 'Invalid package ID.' });
    }

    if (req.method === 'GET') {
        try {
            const packages = await query({
                query: 'SELECT * FROM Packages WHERE package_id = ?',
                values: [id],
            });
            if (packages.length === 0) {
                return res.status(404).json({ error: 'Package not found' });
            }
            res.status(200).json({ package: packages[0] });
        } catch (error) {
            console.error(`[API Package GET ${id}]`, error);
            res.status(500).json({ error: 'Failed to fetch package', details: error.message });
        }
    } else if (req.method === 'PUT') {
        // This part is now protected
        try {
            const { 
                description, number_abroad, local_number, weight_kg, direction, 
                sender_name, recipient_name, delivery_address, 
                pickup_address_details, pickup_lat, pickup_lng, 
                assigned_driver_id, status 
            } = req.body;

            const fieldsToUpdate = {};
            if (description !== undefined) fieldsToUpdate.description = description;
            if (number_abroad !== undefined) fieldsToUpdate.number_abroad = number_abroad;
            if (local_number !== undefined) fieldsToUpdate.local_number = local_number;
            if (weight_kg !== undefined) fieldsToUpdate.weight_kg = weight_kg;
            if (direction !== undefined) fieldsToUpdate.direction = direction;
            if (sender_name !== undefined) fieldsToUpdate.sender_name = sender_name;
            if (recipient_name !== undefined) fieldsToUpdate.recipient_name = recipient_name;
            if (delivery_address !== undefined) fieldsToUpdate.delivery_address = delivery_address;
            if (pickup_address_details !== undefined) fieldsToUpdate.pickup_address_details = pickup_address_details;
            if (pickup_lat !== undefined) fieldsToUpdate.pickup_lat = pickup_lat;
            if (pickup_lng !== undefined) fieldsToUpdate.pickup_lng = pickup_lng;
            if (assigned_driver_id !== undefined) fieldsToUpdate.assigned_driver_id = assigned_driver_id === null || assigned_driver_id === '' ? null : parseInt(assigned_driver_id);
            if (status !== undefined) fieldsToUpdate.status = status;

            if (Object.keys(fieldsToUpdate).length === 0) {
                return res.status(400).json({ error: 'No fields provided for update' });
            }

            const updateQuery = 'UPDATE Packages SET ? WHERE package_id = ?';
            const results = await query({ query: updateQuery, values: [fieldsToUpdate, id] });

            if (results.affectedRows > 0) {
                res.status(200).json({ message: 'Package updated successfully' });
            } else {
                const existingPackage = await query({ query: 'SELECT package_id FROM Packages WHERE package_id = ?', values: [id]});
                if (existingPackage.length === 0) {
                    return res.status(404).json({ error: 'Package not found for update' });
                }
                res.status(200).json({ message: 'Package data was the same, no changes made.' });
            }
        } catch (error) {
            console.error(`[API Package PUT ${id}]`, error);
            res.status(500).json({ error: 'Failed to update package', details: error.message });
        }
    } else if (req.method === 'DELETE') {
        // This part is now protected
        try {
            const results = await query({ query: 'DELETE FROM Packages WHERE package_id = ?', values: [id] });
            if (results.affectedRows > 0) {
                res.status(200).json({ message: 'Package deleted successfully' });
            } else {
                res.status(404).json({ error: 'Package not found or already deleted' });
            }
        } catch (error) {
            console.error(`[API Package DELETE ${id}]`, error);
            res.status(500).json({ error: 'Failed to delete package', details: error.message });
        }
    } else {
        res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
        res.status(405).end(`Method ${req.method} Not Allowed in packageIdHandler`);
    }
}

export default async function(req, res) {
    if (req.method === 'PUT' || req.method === 'DELETE') {
        return protectRoute(packageIdHandler)(req, res);
    } else if (req.method === 'GET') {
        return packageIdHandler(req, res);
    } else {
        res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
        res.status(405).end(`Method ${req.method} Not Allowed`);
    }
}
