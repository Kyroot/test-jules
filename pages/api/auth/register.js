// pages/api/auth/register.js
import { query } from '../../../lib/db'; // Adjust path if needed
import { hashPassword } from '../../../lib/authUtils'; // Corrected path

export default async function handler(req, res) {
    if (req.method === 'POST') {
        try {
            // Destructure expected fields, including the new adminSecret
            const { username, password, adminSecret } = req.body; 

            // Validate presence of required admin registration secret from environment
            if (!process.env.ADMIN_REGISTRATION_SECRET) {
                console.error('[API Auth Register] ADMIN_REGISTRATION_SECRET is not set in environment variables.');
                return res.status(500).json({ error: 'Registration system configuration error.' });
            }

            // Check if the provided secret matches the one in environment variables
            if (adminSecret !== process.env.ADMIN_REGISTRATION_SECRET) {
                console.warn(`[API Auth Register] Invalid admin registration attempt with secret: ${adminSecret}`);
                return res.status(403).json({ error: 'Forbidden: Invalid admin registration secret.' });
            }

            // Proceed with registration only if secret is valid
            if (!username || !password) {
                return res.status(400).json({ error: 'Username and password are required for admin registration.' });
            }

            // Check if user already exists
            const existingUsers = await query({ 
                query: 'SELECT user_id FROM Users WHERE username = ?', 
                values: [username] 
            });
            if (existingUsers.length > 0) {
                return res.status(409).json({ error: 'Username already exists.' });
            }

            const hashedPassword = await hashPassword(password);
            const adminRole = 'admin'; // Always register as admin via this route now

            const addUserQuery = 'INSERT INTO Users (username, password_hash, role) VALUES (?, ?, ?)';
            const userInsertResults = await query({
                query: addUserQuery,
                values: [username, hashedPassword, adminRole],
            });

            if (!userInsertResults.insertId) {
                throw new Error('Admin user registration failed: No user insertId returned.');
            }
            const newUserId = userInsertResults.insertId;
            console.log(`[API Auth Register] Admin user ${username} (ID: ${newUserId}) created successfully.`);

            // No driver profile creation here anymore

            res.status(201).json({ 
                message: 'Admin user registered successfully!', 
                userId: newUserId,
                username: username,
                role: adminRole 
            });

        } catch (error) {
            console.error('[API Auth Register Error]', error);
            res.status(500).json({ error: 'Failed to register admin user', details: error.message });
        }
    } else {
        res.setHeader('Allow', ['POST']);
        res.status(405).end(`Method ${req.method} Not Allowed`);
    }
}
