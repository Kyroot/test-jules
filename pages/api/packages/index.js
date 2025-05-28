// pages/api/packages/index.js
import { query } from '../../../lib/db';
import { geocodeZipToCoords } from '../../../lib/geocode';
import { protectRoute } from '../../../lib/authUtils'; 

async function packagesHandler(req, res) {
    if (req.method === 'GET') {
        try {
            const { status, assigned_vehicle_id } = req.query; // Changed from assigned_driver_id
            let queryString = 'SELECT * FROM Packages';
            const queryParams = [];
            const conditions = [];

            if (status) {
                conditions.push('status = ?');
                queryParams.push(status);
            }
            if (assigned_vehicle_id) { // Changed from assigned_driver_id
                conditions.push('assigned_vehicle_id = ?');
                queryParams.push(parseInt(assigned_vehicle_id));
            }

            if (conditions.length > 0) {
                queryString += ' WHERE ' + conditions.join(' AND ');
            }
            queryString += ' ORDER BY created_at DESC';

            const packages = await query({ query: queryString, values: queryParams });
            res.status(200).json({ packages });
        } catch (error) {
            console.error('[API Packages GET]', error);
            res.status(500).json({ error: 'Failed to fetch packages', details: error.message });
        }
    } else if (req.method === 'POST') { // Admin-protected
        try {
            let { 
                description,
                number_abroad,
                local_number,
                weight_kg,
                direction,
                sender_name,
                recipient_name,
                delivery_address,
                pickup_address_details,
                pickup_lat, pickup_lng, 
                pickup_zip_code, pickup_country,
                assigned_vehicle_id, // Changed from assigned_driver_id
                status 
            } = req.body;
            
            if (!recipient_name || !delivery_address || !direction || !sender_name) {
                return res.status(400).json({ error: 'Recipient name, delivery address, direction and sender name are required.' });
            }
            
            if ((pickup_lat === undefined || pickup_lng === undefined) && pickup_zip_code) {
                try {
                    const coords = await geocodeZipToCoords(pickup_zip_code, pickup_country || 'Moldova');
                    pickup_lat = coords.lat;
                    pickup_lng = coords.lng;
                    pickup_address_details = pickup_address_details || `Geocoded from ZIP: ${pickup_zip_code}, ${pickup_country || 'Moldova'}`;
                } catch (geoError) {
                    console.error('[API Packages POST] Geocoding error:', geoError);
                    return res.status(400).json({ error: 'Geocoding failed for provided ZIP code.', details: geoError.message });
                }
            } else if (pickup_lat === undefined || pickup_lng === undefined) {
                 return res.status(400).json({ error: 'Pickup location (lat/lng or ZIP code) is required.' });
            }


            const unique_tracking_number = `PKG-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
            
            const addPackageQuery = `
                INSERT INTO Packages (unique_tracking_number, description, number_abroad, local_number, weight_kg, direction, sender_name, recipient_name, delivery_address, pickup_address_details, pickup_lat, pickup_lng, assigned_vehicle_id, status)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `;
            const results = await query({
                query: addPackageQuery,
                values: [
                    unique_tracking_number, description || null, number_abroad || null, 
                    local_number || null, weight_kg || null, direction,
                    sender_name, recipient_name, delivery_address, 
                    pickup_address_details || null,
                    pickup_lat, pickup_lng, 
                    assigned_vehicle_id || null, 
                    status || 'pending'
                ],
            });

            if (results.insertId) {
                res.status(201).json({ 
                    message: 'Package created successfully', 
                    packageId: results.insertId, 
                    unique_tracking_number: unique_tracking_number,
                    // Return the full package object as created in DB
                    package: { 
                        package_id: results.insertId, unique_tracking_number, description, number_abroad, local_number, weight_kg, direction, sender_name, recipient_name, delivery_address, pickup_address_details, pickup_lat, pickup_lng, assigned_vehicle_id: assigned_vehicle_id || null, status: status || 'pending'
                    }
                });
            } else { 
                throw new Error('Package creation failed'); 
            }
        } catch (error) {
            console.error('[API Packages POST]', error);
            res.status(500).json({ error: 'Failed to create package', details: error.message });
        }
    } else {
        res.setHeader('Allow', ['GET', 'POST']);
        res.status(405).end(`Method ${req.method} Not Allowed`);
    }
}

export default function(req, res) {
    if (req.method === 'POST') {
        // Protect POST route for admin users only
        return protectRoute(packagesHandler, ['admin'])(req, res); 
    }
    // GET can be public or handled by page-level auth if needed elsewhere
    return packagesHandler(req, res); 
}
