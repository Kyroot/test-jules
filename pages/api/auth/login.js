// pages/api/auth/login.js
import { query } from '../../../lib/db';
import { verifyPassword, generateToken } from '../../../lib/authUtils';
import { serialize } from 'cookie'; // For setting cookie

export default async function handler(req, res) {
    if (req.method === 'POST') {
        try {
            const { username, password } = req.body;
            if (!username || !password) {
                return res.status(400).json({ error: 'Username and password are required' });
            }

            const users = await query({
                query: 'SELECT user_id, username, password_hash, role FROM Users WHERE username = ?',
                values: [username],
            });

            if (users.length === 0) {
                return res.status(401).json({ error: 'Invalid username or password' });
            }

            const user = users[0];
            const passwordIsValid = await verifyPassword(password, user.password_hash);

            if (!passwordIsValid) {
                return res.status(401).json({ error: 'Invalid username or password' });
            }

            const tokenPayload = { userId: user.user_id, username: user.username, role: user.role };
            const token = generateToken(tokenPayload);

            // Set token in an HTTP-only cookie for security
            res.setHeader('Set-Cookie', serialize('authToken', token, {
                httpOnly: true,
                secure: process.env.NODE_ENV !== 'development', // Use secure cookies in production
                sameSite: 'strict',
                maxAge: 60 * 60, // 1 hour (same as JWT_EXPIRES_IN)
                path: '/', 
            }));

            res.status(200).json({ message: 'Login successful', user: { username: user.username, role: user.role } });

        } catch (error) {
            console.error('[API Auth Login]', error);
            res.status(500).json({ error: 'Login failed', details: error.message });
        }
    } else {
        res.setHeader('Allow', ['POST']);
        res.status(405).end(`Method ${req.method} Not Allowed`);
    }
}
