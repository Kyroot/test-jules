// pages/api/packages/[package_id].js
import { query } from '../../../lib/db';
import { protectRoute } from '../../../lib/authUtils';

async function singlePackageHandler(req, res) {
    const { package_id } = req.query;
    const id = parseInt(package_id);

    if (isNaN(id)) {
        return res.status(400).json({ error: 'Invalid package ID.' });
    }

    if (req.method === 'GET') {
        try {
            const packages = await query({
                query: `
                    SELECT 
                        p.*, 
                        v.vehicle_plate_number, 
                        v.display_name as vehicle_display_name 
                    FROM Packages p
                    LEFT JOIN Vehicles v ON p.assigned_vehicle_id = v.vehicle_id
                    WHERE p.package_id = ?
                `,
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
        try {
            const currentPackageResult = await query({ 
                query: 'SELECT * FROM Packages WHERE package_id = ?', 
                values: [id] 
            });
            if (currentPackageResult.length === 0) {
                return res.status(404).json({ error: 'Package not found' });
            }
            const currentPackage = currentPackageResult[0];
            const loggedInPrincipal = req.user; // JWT payload: { sub, type, vehicleId?, vehiclePlateNumber?, userId?, username?, role? }

            const requestedFields = req.body;
            const fieldsToUpdate = {};

            if (loggedInPrincipal.type === 'vehicle') {
                const vehicleId = loggedInPrincipal.vehicleId;
                if (currentPackage.assigned_vehicle_id !== vehicleId) {
                    return res.status(403).json({ error: 'Forbidden: Package not assigned to this vehicle.' });
                }

                if (requestedFields.status === 'accepted_by_driver' && currentPackage.status === 'assigned') { // "accepted_by_driver" status for vehicle operator
                    fieldsToUpdate.status = 'accepted_by_driver';
                } else if (requestedFields.status === 'declined_by_driver' && (currentPackage.status === 'assigned' || currentPackage.status === 'accepted_by_driver')) {
                    fieldsToUpdate.status = 'declined_by_driver';
                    fieldsToUpdate.assigned_vehicle_id = null; // Unassign on decline
                } else if (requestedFields.status !== undefined) { // If status is provided but not one of the above
                    return res.status(403).json({ error: 'Forbidden: Vehicles can only accept or decline packages with specific status transitions.' });
                }
                
                // Check if any other fields are being updated by vehicle
                for (const key in requestedFields) {
                    if (key !== 'status') {
                         return res.status(403).json({ error: `Forbidden: Vehicles cannot update field '${key}'.` });
                    }
                }
                if (Object.keys(fieldsToUpdate).length === 0 && requestedFields.status === undefined) {
                     return res.status(400).json({ error: 'No valid action (accept/decline) provided for vehicle.' });
                }


            } else if (loggedInPrincipal.type === 'admin' && loggedInPrincipal.role === 'admin') {
                // Admin can update more fields
                if (requestedFields.description !== undefined) fieldsToUpdate.description = requestedFields.description;
                if (requestedFields.number_abroad !== undefined) fieldsToUpdate.number_abroad = requestedFields.number_abroad;
                if (requestedFields.local_number !== undefined) fieldsToUpdate.local_number = requestedFields.local_number;
                if (requestedFields.weight_kg !== undefined) fieldsToUpdate.weight_kg = requestedFields.weight_kg;
                if (requestedFields.direction !== undefined) fieldsToUpdate.direction = requestedFields.direction;
                if (requestedFields.sender_name !== undefined) fieldsToUpdate.sender_name = requestedFields.sender_name;
                if (requestedFields.recipient_name !== undefined) fieldsToUpdate.recipient_name = requestedFields.recipient_name;
                if (requestedFields.delivery_address !== undefined) fieldsToUpdate.delivery_address = requestedFields.delivery_address;
                if (requestedFields.pickup_address_details !== undefined) fieldsToUpdate.pickup_address_details = requestedFields.pickup_address_details;
                if (requestedFields.pickup_lat !== undefined) fieldsToUpdate.pickup_lat = requestedFields.pickup_lat;
                if (requestedFields.pickup_lng !== undefined) fieldsToUpdate.pickup_lng = requestedFields.pickup_lng;
                if (requestedFields.assigned_vehicle_id !== undefined) {
                    fieldsToUpdate.assigned_vehicle_id = requestedFields.assigned_vehicle_id === null || requestedFields.assigned_vehicle_id === '' ? null : parseInt(requestedFields.assigned_vehicle_id);
                }
                if (requestedFields.status !== undefined) fieldsToUpdate.status = requestedFields.status;
            } else {
                return res.status(403).json({ error: 'Forbidden: Action not allowed for this user type/role.' });
            }

            if (Object.keys(fieldsToUpdate).length === 0) {
                 return res.status(400).json({ error: 'No valid fields provided for update or action not permitted for your role.' });
            }

            const updateQuery = 'UPDATE Packages SET ? WHERE package_id = ?';
            const results = await query({ query: updateQuery, values: [fieldsToUpdate, id] });

            if (results.affectedRows > 0) {
                 res.status(200).json({ message: 'Package updated successfully' });
            } else {
                 // Check if the package actually exists as the update might not change anything if data is the same
                 const existingPackageVerify = await query({ query: 'SELECT package_id FROM Packages WHERE package_id = ?', values: [id]});
                 if (existingPackageVerify.length === 0) {
                     return res.status(404).json({ error: 'Package not found after update attempt' });
                 }
                 res.status(200).json({ message: 'Package data was the same, no changes made.' });
            }

        } catch (error) {
            console.error(`[API Package PUT ${id}]`, error);
            res.status(500).json({ error: 'Failed to update package', details: error.message });
        }
    } else if (req.method === 'DELETE') { // Admin Only
        if (req.user.type !== 'admin' || req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Forbidden: Only admins can delete packages.' });
        }
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
        res.status(405).end(`Method ${req.method} Not Allowed in singlePackageHandler`);
    }
}

// Apply protectRoute to the handler, allowing 'admin' and 'vehicle' types/roles.
// Specific logic within the PUT handler will differentiate permissions.
// GET remains public. DELETE is handled inside for admin only.
export default async function(req, res) {
    if (req.method === 'PUT' || req.method === 'DELETE') { // DELETE is also protected now at this level
        return protectRoute(singlePackageHandler, ['admin', 'vehicle'])(req, res);
    } else if (req.method === 'GET') {
        return singlePackageHandler(req, res); // GET remains public
    } else {
        res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
        res.status(405).end(`Method ${req.method} Not Allowed`);
    }
}
