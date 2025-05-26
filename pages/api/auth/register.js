// pages/api/auth/register.js
import { query } from '../../../lib/db';
import { hashPassword } from '../../../lib/authUtils';

export default async function handler(req, res) {
    if (req.method === 'POST') {
        try {
            const { username, password, role = 'admin' } // Default role to admin for this setup
            = req.body;
            if (!username || !password) {
                return res.status(400).json({ error: 'Username and password are required' });
            }

            // Check if user already exists
            const existingUsers = await query({ query: 'SELECT user_id FROM Users WHERE username = ?', values: [username] });
            if (existingUsers.length > 0) {
                return res.status(409).json({ error: 'Username already exists' });
            }

            const hashedPassword = await hashPassword(password);
            const addUserQuery = 'INSERT INTO Users (username, password_hash, role) VALUES (?, ?, ?)';
            const results = await query({
                query: addUserQuery,
                values: [username, hashedPassword, role],
            });

            if (results.insertId) {
                res.status(201).json({ message: 'User registered successfully', userId: results.insertId });
            } else {
                throw new Error('User registration failed');
            }
        } catch (error) {
            console.error('[API Auth Register]', error);
            res.status(500).json({ error: 'Failed to register user', details: error.message });
        }
    } else {
        res.setHeader('Allow', ['POST']);
        res.status(405).end(`Method ${req.method} Not Allowed`);
    }
}
