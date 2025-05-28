// pages/api/vehicles/index.js
import { query } from '../../../lib/db';
import { protectRoute } from '../../../lib/authUtils';
import { hashPassword } from '../../../lib/authUtils'; // For hashing vehicle password on creation

async function vehiclesHandler(req, res) {
    if (req.method === 'GET') { // Get all vehicles (for Admin)
        try {
            const vehicles = await query({
                query: 'SELECT vehicle_id, vehicle_plate_number, display_name, current_operator_name, operator_contact_info, current_lat, current_lng, is_active FROM Vehicles ORDER BY created_at DESC',
            });
            res.status(200).json({ vehicles });
        } catch (error) {
            console.error('[API Vehicles GET]', error);
            res.status(500).json({ error: 'Failed to fetch vehicles', details: error.message });
        }
    } else if (req.method === 'POST') { // Create new vehicle (by Admin)
        try {
            const { 
                vehicle_plate_number, 
                password, // Plain text password for the new vehicle
                display_name, 
                current_operator_name, 
                operator_contact_info,
                is_active 
            } = req.body;

            if (!vehicle_plate_number || !password) {
                return res.status(400).json({ error: 'Vehicle plate number and password are required.' });
            }

            // Check if vehicle plate number already exists
            const existingVehicle = await query({
                query: 'SELECT vehicle_id FROM Vehicles WHERE vehicle_plate_number = ?',
                values: [vehicle_plate_number]
            });
            if (existingVehicle.length > 0) {
                return res.status(409).json({ error: 'Vehicle with this plate number already exists.' });
            }

            const hashedPassword = await hashPassword(password);

            const addVehicleQuery = `
                INSERT INTO Vehicles (vehicle_plate_number, password_hash, display_name, current_operator_name, operator_contact_info, is_active) 
                VALUES (?, ?, ?, ?, ?, ?)
            `;
            const results = await query({
                query: addVehicleQuery,
                values: [
                    vehicle_plate_number, 
                    hashedPassword, 
                    display_name || null, 
                    current_operator_name || null, 
                    operator_contact_info || null,
                    is_active !== undefined ? is_active : true
                ],
            });

            if (results.insertId) {
                res.status(201).json({ 
                    message: 'Vehicle created successfully', 
                    vehicleId: results.insertId,
                    vehicle_plate_number: vehicle_plate_number
                });
            } else {
                throw new Error('Vehicle creation failed.');
            }
        } catch (error) {
            console.error('[API Vehicles POST]', error);
            res.status(500).json({ error: 'Failed to create vehicle', details: error.message });
        }
    } else {
        res.setHeader('Allow', ['GET', 'POST']);
        res.status(405).end(`Method ${req.method} Not Allowed`);
    }
}
export default protectRoute(vehiclesHandler, ['admin']); // Only Admin can list all and create
