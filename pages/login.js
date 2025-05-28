// pages/login.js
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useState } from 'react';

export default function LoginPage() {
    const router = useRouter();
    const [identifier, setIdentifier] = useState(''); // Changed from username to identifier
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(''); 

        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                // Send the content of the first input field as 'identifier'
                body: JSON.stringify({ identifier: identifier, password: password }), 
            });

            const data = await response.json(); // data.user will contain the principal info

            if (!response.ok) {
                throw new Error(data.error || 'Login failed');
            }

            console.log('[Login Page] Login successful. API Response Data:', data);
            
            // Store the detailed principal information
            if (data.user) { 
                localStorage.setItem('loggedInPrincipalInfo', JSON.stringify(data.user));
                // data.user should contain:
                // for admin: { username, role, type: 'admin', userId }
                // for vehicle: { vehiclePlateNumber, displayName, currentOperatorName, type: 'vehicle', vehicleId }
            } else {
                // This case should ideally not happen if API guarantees a user object on success
                console.error('[Login Page] Login API response missing user object on success.');
                throw new Error('Login response from server was incomplete.');
            }
            
            localStorage.setItem('isAuthenticated', 'true'); // Simple flag still useful

            router.push('/'); // Redirect to dashboard
        } catch (err) {
            console.error('[Login Page] Login error:', err);
            setError(err.message || 'An unknown error occurred.');
        }
    };

    return (
        <>
            <Head>
                <title>Login</title> {/* Changed title */}
                <link rel="stylesheet" href="/style.css" /> 
            </Head>
            <div style={{ maxWidth: '400px', margin: '50px auto', padding: '20px', border: '1px solid #ccc', borderRadius: '8px' }}>
                <h1>Login</h1> {/* Changed title */}
                <form id="login-form" onSubmit={handleSubmit}>
                    <div>
                        {/* Changed label and input field to use 'identifier' */}
                        <label htmlFor="identifier">Username or Vehicle Plate #:</label>
                        <input 
                            type="text" 
                            id="identifier" 
                            name="identifier" 
                            required 
                            value={identifier}
                            onChange={(e) => setIdentifier(e.target.value)}
                        />
                    </div>
                    <div>
                        <label htmlFor="password">Password:</label>
                        <input 
                            type="password" 
                            id="password" 
                            name="password" 
                            required 
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                        />
                    </div>
                    <button type="submit">Login</button>
                    {error && <p style={{ color: 'red' }}>{error}</p>}
                </form>
            </div>
        </>
    );
}
