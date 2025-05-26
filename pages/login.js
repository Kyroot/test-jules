// pages/login.js
import Head from 'next/head';
import { useRouter } from 'next/router'; // For redirection
import { useState } from 'react';     // For form state and error messages

export default function LoginPage() {
    const router = useRouter();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(''); // Clear previous errors

        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Login failed');
            }

            // Login successful
            console.log('Login successful:', data);
            // Store non-sensitive user info for UI purposes if needed
            if (data.user) {
                localStorage.setItem('loggedInUser', JSON.stringify(data.user));
            }
            localStorage.setItem('isAuthenticated', 'true'); // Simple flag

            router.push('/'); // Redirect to dashboard
        } catch (err) {
            console.error('Login error:', err);
            setError(err.message || 'An unknown error occurred.');
        }
    };

    return (
        <>
            <Head>
                <title>Admin Login</title>
                <link rel="stylesheet" href="/style.css" /> {/* Assuming global styles */}
            </Head>
            <div style={{ maxWidth: '400px', margin: '50px auto', padding: '20px', border: '1px solid #ccc', borderRadius: '8px' }}>
                <h1>Admin Login</h1>
                <form id="login-form" onSubmit={handleSubmit}>
                    <div>
                        <label htmlFor="username">Username:</label>
                        <input 
                            type="text" 
                            id="username" 
                            name="username" 
                            required 
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
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
