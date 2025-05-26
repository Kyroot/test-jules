// pages/api/drivers/index.js
import { query } from '../../../lib/db'; 
import { protectRoute } from '../../../lib/authUtils';

async function driversHandler(req, res) { // Renamed original handler
    if (req.method === 'GET') {
        try {
            const drivers = await query({
                query: 'SELECT * FROM Drivers ORDER BY created_at DESC',
                values: [],
            });
            res.status(200).json({ drivers });
        } catch (error) {
            console.error('[API Drivers GET]', error);
            res.status(500).json({ error: 'Failed to fetch drivers', details: error.message });
        }
    } else if (req.method === 'POST') {
        // This part is now protected by protectRoute
        try {
            const { name, contact_info, current_lat, current_lng } = req.body;
            if (!name) {
                return res.status(400).json({ error: 'Driver name is required' });
            }

            const addDriverQuery = `
                INSERT INTO Drivers (name, contact_info, current_lat, current_lng) 
                VALUES (?, ?, ?, ?)
            `;
            const results = await query({
                query: addDriverQuery,
                values: [name, contact_info || null, current_lat || null, current_lng || null],
            });

            if (results.insertId) {
                res.status(201).json({ 
                    message: 'Driver created successfully', 
                    driverId: results.insertId,
                });
            } else {
                throw new Error('Driver creation failed, no insertId returned.');
            }
        } catch (error) {
            console.error('[API Drivers POST]', error);
            res.status(500).json({ error: 'Failed to create driver', details: error.message });
        }
    } else {
        // This 'else' is for the inner driversHandler.
        // The outer default export will handle the main 405 for methods not GET or POST.
        res.setHeader('Allow', ['GET', 'POST']);
        res.status(405).end(`Method ${req.method} Not Allowed in driversHandler`);
    }
}

export default async function(req, res) {
    if (req.method === 'POST') {
        return protectRoute(driversHandler)(req, res); 
    } else if (req.method === 'GET') {
        return driversHandler(req, res);
    } else {
        res.setHeader('Allow', ['GET', 'POST']);
        res.status(405).end(`Method ${req.method} Not Allowed`);
    }
}
