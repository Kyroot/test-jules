// pages/api/auth/login.js
import { query } from '../../../lib/db'; // Adjust path
import { verifyPassword, generateToken } from '../../../lib/authUtils'; // Adjust path
import { serialize } from 'cookie';

export default async function handler(req, res) {
    if (req.method === 'POST') {
        try {
            const { identifier, password } = req.body; // 'identifier' can be username or vehicle_plate_number
            if (!identifier || !password) {
                return res.status(400).json({ error: 'Identifier and password are required' });
            }

            // 1. Attempt to log in as an Admin User
            const users = await query({
                query: 'SELECT user_id, username, password_hash, role FROM Users WHERE username = ?',
                values: [identifier],
            });

            if (users.length > 0) {
                const adminUser = users[0];
                // Ensure only users with 'admin' role in Users table can login this way
                if (adminUser.role !== 'admin') { 
                    console.warn(`[API Auth Login] Non-admin user found in Users table attempting admin login: ${identifier}`);
                    // Treat as failed login to not reveal user existence with non-admin role
                    return res.status(401).json({ error: 'Invalid identifier or password' }); 
                }

                const passwordIsValid = await verifyPassword(password, adminUser.password_hash);
                if (passwordIsValid) {
                    const tokenPayload = { 
                        sub: adminUser.user_id, 
                        userId: adminUser.user_id, 
                        username: adminUser.username, 
                        role: adminUser.role,
                        type: 'admin' 
                    };
                    const token = generateToken(tokenPayload);
                    res.setHeader('Set-Cookie', serialize('authToken', token, {
                        httpOnly: true, secure: process.env.NODE_ENV !== 'development',
                        sameSite: 'strict', maxAge: 60 * 60 * 24 * 7, path: '/', // 1 week expiry
                    }));
                    return res.status(200).json({ 
                        message: 'Admin login successful', 
                        user: { userId: adminUser.user_id, username: adminUser.username, role: adminUser.role, type: 'admin' } 
                    });
                }
            }

            // 2. If not an admin or admin login failed, attempt to log in as a Vehicle
            const vehicles = await query({
                query: 'SELECT vehicle_id, vehicle_plate_number, password_hash, display_name, current_operator_name, is_active FROM Vehicles WHERE vehicle_plate_number = ?',
                values: [identifier],
            });

            if (vehicles.length > 0) {
                const vehicle = vehicles[0];
                if (!vehicle.is_active) {
                    console.log(`[API Auth Login] Attempt to log in with inactive vehicle: ${identifier}`);
                    return res.status(403).json({ error: 'Vehicle account is inactive. Please contact admin.' });
                }

                const vehiclePasswordIsValid = await verifyPassword(password, vehicle.password_hash);
                if (vehiclePasswordIsValid) {
                    const tokenPayload = {
                        sub: vehicle.vehicle_id, 
                        vehicleId: vehicle.vehicle_id, 
                        vehiclePlateNumber: vehicle.vehicle_plate_number,
                        displayName: vehicle.display_name,
                        currentOperatorName: vehicle.current_operator_name,
                        type: 'vehicle'
                        // Vehicles don't have a 'role' in the Users table sense. Their 'type' is 'vehicle'.
                    };
                    const token = generateToken(tokenPayload);
                    res.setHeader('Set-Cookie', serialize('authToken', token, {
                        httpOnly: true, secure: process.env.NODE_ENV !== 'development',
                        sameSite: 'strict', maxAge: 60 * 60 * 24 * 7, path: '/', // 1 week expiry
                    }));
                    return res.status(200).json({ 
                        message: 'Vehicle login successful', 
                        user: { // Keep 'user' object structure for frontend consistency
                            vehicleId: vehicle.vehicle_id,
                            vehiclePlateNumber: vehicle.vehicle_plate_number, 
                            displayName: vehicle.display_name,
                            currentOperatorName: vehicle.current_operator_name,
                            type: 'vehicle',
                        } 
                    });
                }
            }

            // 3. If neither login attempt was successful
            console.log(`[API Auth Login] Failed login attempt for identifier: ${identifier}`);
            return res.status(401).json({ error: 'Invalid identifier or password' });

        } catch (error) {
            console.error('[API Auth Login Error]', error);
            res.status(500).json({ error: 'Login failed due to server error', details: error.message });
        }
    } else {
        res.setHeader('Allow', ['POST']);
        res.status(405).end(`Method ${req.method} Not Allowed`);
    }
}
