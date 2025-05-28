// pages/api/vehicles/[vehicle_id].js
import { query } from '../../../lib/db';
import { protectRoute } from '../../../lib/authUtils';
import { hashPassword } from '../../../lib/authUtils'; // For updating password

async function singleVehicleHandler(req, res) {
    const { vehicle_id } = req.query;
    const id = parseInt(vehicle_id);

    if (isNaN(id)) {
        return res.status(400).json({ error: 'Invalid vehicle ID.' });
    }

    if (req.method === 'GET') { // Get single vehicle (for Admin)
        try {
            const vehicles = await query({
                query: 'SELECT vehicle_id, vehicle_plate_number, display_name, current_operator_name, operator_contact_info, current_lat, current_lng, is_active FROM Vehicles WHERE vehicle_id = ?',
                values: [id],
            });
            if (vehicles.length === 0) {
                return res.status(404).json({ error: 'Vehicle not found' });
            }
            res.status(200).json({ vehicle: vehicles[0] });
        } catch (error) {
            console.error(`[API Vehicle GET ${id}]`, error);
            res.status(500).json({ error: 'Failed to fetch vehicle', details: error.message });
        }
    } else if (req.method === 'PUT') { // Update vehicle (by Admin)
        try {
            const { 
                vehicle_plate_number, // Admin might change this, ensure uniqueness if so
                password,             // Admin can set a new password for the vehicle
                display_name, 
                current_operator_name, 
                operator_contact_info,
                current_lat,          // Admin can also manually update location
                current_lng,
                is_active 
            } = req.body;

            const fieldsToUpdate = {};
            if (vehicle_plate_number !== undefined) fieldsToUpdate.vehicle_plate_number = vehicle_plate_number;
            if (password !== undefined) { // If password is being updated, hash it
                if (password.trim() === '') return res.status(400).json({ error: 'Password cannot be empty if provided for update.'});
                fieldsToUpdate.password_hash = await hashPassword(password);
            }
            if (display_name !== undefined) fieldsToUpdate.display_name = display_name;
            if (current_operator_name !== undefined) fieldsToUpdate.current_operator_name = current_operator_name;
            if (operator_contact_info !== undefined) fieldsToUpdate.operator_contact_info = operator_contact_info;
            if (current_lat !== undefined) fieldsToUpdate.current_lat = current_lat === null ? null : parseFloat(current_lat);
            if (current_lng !== undefined) fieldsToUpdate.current_lng = current_lng === null ? null : parseFloat(current_lng);
            if (is_active !== undefined) fieldsToUpdate.is_active = Boolean(is_active);
            
            if (Object.keys(fieldsToUpdate).length === 0) {
                return res.status(400).json({ error: 'No fields provided for update.' });
            }

            // If vehicle_plate_number is being updated, check for uniqueness
            if (vehicle_plate_number) {
                const existingVehicle = await query({
                    query: 'SELECT vehicle_id FROM Vehicles WHERE vehicle_plate_number = ? AND vehicle_id != ?',
                    values: [vehicle_plate_number, id]
                });
                if (existingVehicle.length > 0) {
                    return res.status(409).json({ error: 'Another vehicle with this plate number already exists.' });
                }
            }

            const updateQuery = 'UPDATE Vehicles SET ? WHERE vehicle_id = ?';
            const results = await query({ query: updateQuery, values: [fieldsToUpdate, id] });

            if (results.affectedRows > 0) {
                res.status(200).json({ message: 'Vehicle updated successfully' });
            } else {
                 const existing = await query({ query: 'SELECT vehicle_id FROM Vehicles WHERE vehicle_id = ?', values: [id]});
                 if (existing.length === 0) return res.status(404).json({ error: 'Vehicle not found for update' });
                 res.status(200).json({ message: 'Vehicle data was the same or no active change, no rows affected.' });
            }
        } catch (error) {
            console.error(`[API Vehicle PUT ${id}]`, error);
            res.status(500).json({ error: 'Failed to update vehicle', details: error.message });
        }
    } else if (req.method === 'DELETE') { // Delete vehicle (by Admin)
        try {
            // Packages.assigned_vehicle_id is ON DELETE SET NULL
            const results = await query({ query: 'DELETE FROM Vehicles WHERE vehicle_id = ?', values: [id] });
            if (results.affectedRows > 0) {
                res.status(200).json({ message: 'Vehicle deleted successfully' });
            } else {
                res.status(404).json({ error: 'Vehicle not found or already deleted' });
            }
        } catch (error) {
            console.error(`[API Vehicle DELETE ${id}]`, error);
            res.status(500).json({ error: 'Failed to delete vehicle', details: error.message });
        }
    } else {
        res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
        res.status(405).end(`Method ${req.method} Not Allowed`);
    }
}
export default protectRoute(singleVehicleHandler, ['admin']); // Only Admin
