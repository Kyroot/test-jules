// lib/db.js
import mysql from 'mysql2/promise';

// Function to establish a new connection.
// In a real app, you'd likely use a connection pool for better performance.
// For simplicity here, we'll create a connection on demand, or you can
// create a single connection/pool and export it.

// Let's try to create a pool and export it for better management.
let pool;

function getPool() {
    if (!pool) {
        try {
            pool = mysql.createPool({
                host: process.env.DB_HOST,
                user: process.env.DB_USER,
                password: process.env.DB_PASSWORD,
                database: process.env.DB_NAME,
                waitForConnections: true,
                connectionLimit: 10, // Adjust as needed
                queueLimit: 0
            });
            console.log('[DB] MySQL Connection Pool created successfully.');
        } catch (error) {
            console.error('[DB] Error creating MySQL connection pool:', error);
            // In a real app, you might want to throw this error or handle it more gracefully
            // For now, if pool creation fails, subsequent calls will also fail.
        }
    }
    return pool;
}

// Export a function to execute queries using the pool
export async function query({ query, values = [] }) {
  const dbPool = getPool();
  if (!dbPool) {
    throw new Error("Database connection pool is not available.");
  }
  
  let connection;
  try {
    connection = await dbPool.getConnection();
    console.log('[DB] Acquired connection from pool.');
    const [results] = await connection.execute(query, values);
    return results;
  } catch (error) {
    console.error('[DB] Error executing query:', error.message);
    // In a production app, you might want to log this error to a monitoring service
    throw new Error(`Database query failed: ${error.message}`);
  } finally {
    if (connection) {
      connection.release();
      console.log('[DB] Released connection back to pool.');
    }
  }
}

// Example of how to test the connection (optional, can be run from an API route later)
// async function testConnection() {
//   try {
//     const results = await query({ query: 'SELECT 1 + 1 AS solution' });
//     console.log('[DB] Test query successful:', results);
//   } catch (e) {
//     console.error('[DB] Test query failed:', e);
//   }
// }
// testConnection(); // Don't run testConnection here directly in module scope
