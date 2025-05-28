// pages/api/auth/logout.js
import { serialize } from 'cookie';

export default async function handler(req, res) {
    if (req.method === 'POST') {
        // Clear the authentication cookie
        res.setHeader('Set-Cookie', serialize('authToken', '', {
            httpOnly: true,
            secure: process.env.NODE_ENV !== 'development',
            sameSite: 'strict',
            expires: new Date(0), // Set expiry to past date
            path: '/',
        }));
        res.status(200).json({ message: 'Logout successful' });
    } else {
        res.setHeader('Allow', ['POST']);
        res.status(405).end(`Method ${req.method} Not Allowed`);
    }
}
