# Package Tracking SPA (Full-Stack Next.js & MySQL)

This is a Single Page Application (SPA) with a Next.js backend and MySQL database, designed for a business owner to track driver locations, manage packages, and handle assignments.

## Architecture Overview

*   **Frontend:** Next.js (React) serving static assets and making API calls from `public/app.js` (Leaflet.js for maps).
*   **Backend:** Next.js API routes handling business logic and database interactions.
*   **Database:** MySQL, with schema defined in `schema.sql`.
*   **Authentication:** JWT-based authentication for admin users, with tokens handled via HttpOnly cookies.

## Key Features Implemented
*   **Full CRUD for Drivers:** Admin can create, view, update (including location), and delete drivers.
*   **Full CRUD for Packages:** Admin can create (with server-side geocoding for ZIP codes via Nominatim), view, update (assign to driver, change status), and delete packages.
*   **Predefined Pickup Locations:** Admin can manage a list of predefined pickup locations (CRUD operations via API, though UI for this admin part is basic).
*   **Admin Authentication:** Login/logout for admin users. Protected API routes for sensitive operations.
*   **Interactive Maps:** Leaflet.js maps displaying driver and package locations.
    *   Overall dashboard map.
    *   Driver-specific view map that centers on selected driver.
*   **Simulated Telegram Notifications:** Console logs simulate notifications upon package assignment.
*   **Database Persistence:** All core data (users, drivers, packages, predefined locations) is stored in MySQL.

## Local Development Setup

### 1. Prerequisites
*   **Node.js:** (e.g., v18.x or later) and npm.
*   **MySQL Server:** A running MySQL instance (e.g., local install, Docker).
*   **Web Browser:** A modern web browser.

### 2. Database Setup
1.  **Create Database:** Ensure you have a MySQL database created (e.g., `package_tracker_db`).
2.  **Run Schema:** Execute the SQL commands in `schema.sql` against your database. This will create the necessary tables (`Users`, `Drivers`, `Packages`, `PredefinedPickupLocations`).
    *   The schema includes sample data for `PredefinedPickupLocations`.
3.  **Seed Admin User (Important for First Login):**
    *   You need at least one admin user in the `Users` table to log in. You can:
        *   Manually INSERT one (remember to hash the password if doing so directly, or insert plain and update hash later).
        *   Or, temporarily make the `/api/auth/register` route accessible (e.g., remove `protectRoute` from it if you added it, or ensure it's callable without auth for the first user) and send a POST request using a tool like Postman/curl or a simple HTML form:
            *   Endpoint: `POST /api/auth/register`
            *   Body (JSON): `{ "username": "youradmin", "password": "yourpassword", "role": "admin" }`
            *   **Remember to re-protect or remove the public register route after creating your admin user.**

### 3. Application Setup
1.  **Clone/Download Files:** Ensure all project files are in your local directory.
2.  **Install Dependencies:**
    ```bash
    npm install
    ```
3.  **Environment Variables:**
    *   Create a file named `.env.local` in the project root.
    *   Copy the contents of `.env.local.example` into it.
    *   Update `.env.local` with your actual MySQL database credentials and a strong, unique `JWT_SECRET`:
        ```env
        DB_HOST="localhost" # Or your MySQL host
        DB_USER="your_mysql_user"
        DB_PASSWORD="your_mysql_password"
        DB_NAME="package_tracker_db" # Or your database name
        JWT_SECRET="generate-a-very-strong-random-secret-here" 
        ```
4.  **Run the Development Server:**
    ```bash
    npm run dev
    ```
5.  **Access Application:** Open your browser and go to `http://localhost:3000`. You should be redirected to `/login`.

## How to Use
1.  **Login:** Use the admin credentials you created to log in.
2.  **Overall Dashboard Tab:**
    *   **Driver Management:** Add, view, edit, and delete drivers. Driver locations updated here will reflect on maps.
    *   **Package Management:** Add new packages (using predefined locations or custom ZIP code for pickup). Assign pending packages to drivers. Delete packages.
    *   View drivers and packages on the main map.
3.  **Drivers View Tab:**
    *   Select a driver to see their location and assigned packages.
    *   Conceptually "Accept" or "Decline" packages on behalf of the driver (updates status).

## API Endpoints Overview (Next.js API Routes)
*   **Auth:**
    *   `POST /api/auth/login`
    *   `POST /api/auth/logout`
    *   `POST /api/auth/register` (for initial admin setup)
*   **Drivers:**
    *   `GET, POST /api/drivers`
    *   `GET, PUT, DELETE /api/drivers/:driver_id`
*   **Packages:**
    *   `GET, POST /api/packages` (GET supports `status` and `assigned_driver_id` filters)
    *   `GET, PUT, DELETE /api/packages/:package_id`
*   **Predefined Pickup Locations:**
    *   `GET, POST /api/predefinedlocations`
    *   `PUT, DELETE /api/predefinedlocations/:location_id`
*(Protected routes require admin authentication via HttpOnly cookie)*

## Technology & Credits
*   **Framework:** Next.js (React)
*   **Database:** MySQL
*   **Mapping Library:** [Leaflet.js](https://leafletjs.com/)
*   **Map Tiles:** &copy; [OpenStreetMap contributors](https://www.openstreetmap.org/copyright)
*   **Geocoding (Server-Side):** [Nominatim](https://nominatim.openstreetmap.org/) (via OpenStreetMap). (Respect Nominatim's [Usage Policy](https://operations.osmfoundation.org/policies/nominatim/)).
*   **Styling:** Basic CSS (`public/style.css`).

## Deployment to Vercel (Considerations)
*   **Database:** Vercel cannot directly connect to a local MySQL database. For a fully functional deployment, you will need to use a **cloud-hosted MySQL database provider** (e.g., PlanetScale, Neon, Railway, Aiven, AWS RDS, Google Cloud SQL).
*   **Environment Variables:** Configure all necessary environment variables (`DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `JWT_SECRET`) in your Vercel project settings. The database variables must point to your cloud database.
*   **Build Command:** Next.js default (`npm run build` or `next build`).
*   **Output Directory:** Next.js default (`.next`).

## Data Persistence
*   With the MySQL backend, data is now persistent. Driver simulation in `app.js` only affects frontend markers; actual driver locations are updated via the Admin "Edit Driver" form.
```
