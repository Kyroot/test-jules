// lib/authUtils.js
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { query } from './db'; // Assuming db.js is in the same lib folder

const JWT_SECRET = process.env.JWT_SECRET || 'your-very-secure-secret-fallback'; // Fallback only for dev if .env is missing
const JWT_EXPIRES_IN = '1h'; // Token expiry

export async function hashPassword(password) {
    const salt = await bcrypt.genSalt(10);
    return await bcrypt.hash(password, salt);
}

export async function verifyPassword(password, hashedPassword) {
    return await bcrypt.compare(password, hashedPassword);
}

export function generateToken(payload) {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

export function verifyToken(token) {
    try {
        return jwt.verify(token, JWT_SECRET);
    } catch (e) {
        return null; // Invalid or expired token
    }
}

// Middleware to protect routes
export function protectRoute(handler) {
    return async (req, res) => {
        // Check for token in Authorization header (Bearer token) or a cookie
        let token;
        if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
            token = req.headers.authorization.split(' ')[1];
        } else if (req.cookies && req.cookies.authToken) { // Using 'cookie-parser' middleware would make this easier
                                                          // For Next.js API routes, req.cookies is available if cookies are sent
            token = req.cookies.authToken;
        }

        if (!token) {
            return res.status(401).json({ error: 'Authentication required: No token provided.' });
        }

        const decoded = verifyToken(token);
        if (!decoded) {
            return res.status(401).json({ error: 'Authentication failed: Invalid or expired token.' });
        }

        // Attach user info (e.g., userId, role from token) to request object for handler use
        req.user = decoded; 
        
        // Check role if necessary (e.g., only admin)
        if (req.user.role !== 'admin') {
             return res.status(403).json({ error: 'Forbidden: Insufficient privileges.' });
        }

        return handler(req, res);
    };
}
