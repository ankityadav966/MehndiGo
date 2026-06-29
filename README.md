# Mehndi Go: Full-Stack Production-Ready App Documentation

Mehndi Go is a premium full-stack SaaS platform connecting customers with professional mehndi artists. It provides location-based artist searches, interactive scheduling slot bookings, online Razorpay payments, real-time message chat, and detailed dashboards for Clients, Artists, and Administrators.

---

## 1. System Architecture

The application is structured following Clean Architecture and SOLID design patterns:

- **Frontend**: Single Page Application built using React, Vite, and custom responsive Vanilla CSS (supporting Dark/Light theme toggle).
- **Backend API**: Node.js and Express REST server offering secure role-based routes (RBAC).
- **Database**: PostgreSQL object-relational database mapped through Sequelize ORM.
- **Real-Time Communication**: Socket.io servers handling instant notifications and bidirectional chat channels.
- **File Storage**: Multer integration with Cloudinary for handling artist selfie/Aadhaar document uploads.

---

## 2. Database Schema

### Users Table
- `id` (INTEGER, Primary Key)
- `name` (VARCHAR)
- `phone` (VARCHAR, Unique, Indexed)
- `email` (VARCHAR, Unique, Nullable)
- `role` (ENUM: `'USER'`, `'ARTIST'`, `'ADMIN'`)
- `profile_image` (VARCHAR, Nullable)
- `gender` (ENUM: `'MALE'`, `'FEMALE'`, `'OTHER'`)
- `is_verified` (BOOLEAN, Default: `false`)
- `last_login_at` (TIMESTAMP)

### Artist Profiles Table
- `id` (INTEGER, Primary Key)
- `user_id` (INTEGER, Foreign Key -> Users)
- `bio` (TEXT)
- `experience_years` (INTEGER)
- `avg_rating` (FLOAT, Default: `0`)
- `total_reviews` (INTEGER, Default: `0`)
- `verification_status` (ENUM: `'PENDING'`, `'APPROVED'`, `'REJECTED'`)
- `rejection_reason` (TEXT, Nullable)
- `city`, `state`, `pincode`, `location` (VARCHAR)

### Services Table
- `id` (INTEGER, Primary Key)
- `artist_id` (INTEGER, Foreign Key -> ArtistProfiles)
- `specialization_name` (VARCHAR)
- `category` (VARCHAR)
- `minimum_price` (INTEGER)
- `duration_minutes` (INTEGER)

### Bookings Table
- `id` (INTEGER, Primary Key)
- `booking_code` (VARCHAR, Unique)
- `user_id` (INTEGER, Foreign Key -> Users)
- `artist_id` (INTEGER, Foreign Key -> ArtistProfiles)
- `service_id` (INTEGER, Foreign Key -> Services)
- `slot_id` (INTEGER, Foreign Key -> AvailabilitySlots)
- `total_price` (INTEGER)
- `booking_status` (ENUM: `'PENDING'`, `'CONFIRMED'`, `'COMPLETED'`, `'CANCELLED'`)
- `payment_status` (ENUM: `'PENDING'`, `'PAID'`)
- `address` (TEXT)

---

## 3. Environment Variables Configuration

Create a `.env` file in the root folder with the following variables:

```env
# Server Port
PORT=3000

# Database Configuration
DB_HOST=127.0.0.1
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=your_password
DB_NAME=mehandigo

# JWT Auth Secret
JWT_SECRET=your_jwt_signing_secret

# Twilio SMS OTP Gateway Credentials
TWILIO_ACCOUNT_SID=your_twilio_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_PHONE_NUMBER=your_twilio_number

# Razorpay Online Payment Gateway Details
RAZORPAY_KEY_ID=your_razorpay_key_id
RAZORPAY_KEY_SECRET=your_razorpay_key_secret

# Cloudinary CDN Storage Settings
CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret
```

---

## 4. Installation & Seeding Guide

### Step 1: Install Backend & Frontend Dependencies
```bash
# Install backend dependencies
pnpm install

# Go inside frontend folder and install dependencies
cd frontend
npm install
```

### Step 2: Set Up Database & Run Seed Data
```bash
# Run PostgreSQL schema migrations
npx sequelize-cli db:migrate

# Seed verification test accounts (Admin, Artist, Customer)
node seed.js
```

### Step 3: Run Servers Locally
```bash
# Start backend server (listening on Port 3000)
npm start

# Start frontend Vite server (usually on Port 5173)
cd frontend
npm run dev
```

---

## 5. API Directory

### Authentication (Public)
- `POST /api/v1/mehndigo/user/send-otp` - Triggers a 6-digit OTP SMS verification.
- `POST /api/v1/mehndigo/user/verify-otp` - Validates OTP code and returns bearer JWT token.
- `POST /api/v1/mehndigo/user/login` - Initiates login for already registered phone numbers.

### User Profiles (Authenticated)
- `GET /api/v1/mehndigo/user/profile` - Fetches current user profile.
- `PUT /api/v1/mehndigo/user/profile` - Updates name, email, or gender.

### Directory Listing (Authenticated/Public)
- `GET /api/v1/mehndigo/user/artists` - Returns a directory grid of approved artists.
- `GET /api/v1/mehndigo/user/artists/nearby` - Returns artists sorted by proximity/location.

### Artist Catalog & Bookings (Authenticated)
- `POST /api/v1/mehndigo/artist/profile` - Sets up Aadhaar documents and selfies.
- `POST /api/v1/mehndigo/artist/service` - Creates a new mehndi style catalog option.
- `GET /api/v1/mehndigo/artist/getallservicesdata` - Fetches the artist's services catalog.
- `POST /api/v1/mehndigo/artist/slot` - Sets a free time availability window.
- `POST /api/v1/mehndigo/artist/booking` - Places a new mehndi booking.
- `PUT /api/v1/mehndigo/artist/booking/:id` - Updates booking states (Accept/Complete/Cancel).

### Payments Integration (Authenticated)
- `POST /api/v1/mehndigo/artist/create-order` - Generates a Razorpay order.
- `POST /api/v1/mehndigo/artist/verify-payment` - Verifies Razorpay signature and updates statuses to paid/confirmed.

### Real-Time Chat (Authenticated)
- `GET /api/v1/mehndigo/chat/:receiverId` - Retrieves historical chat threads.
