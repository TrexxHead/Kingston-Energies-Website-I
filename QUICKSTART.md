# Quick Start Guide

## 5-Minute Setup

### Step 1: Install Node.js
Download from https://nodejs.org/ (click the LTS button) and run the installer.

### Step 2: Install PostgreSQL
Download from https://www.postgresql.org/download/windows/ and install it.
Remember the password you set for the postgres user.

### Step 3: Open Terminal and Navigate
```bash
cd C:\Users\jfearon\kingston-energies
```

### Step 4: Install Dependencies
```bash
npm install
```

### Step 5: Create Database
Open pgAdmin (included with PostgreSQL) and create a new database named `kingston_energies`.

### Step 6: Set Up Environment
Create `.env.local` file in the project root:
```
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5432/kingston_energies"
NEXTAUTH_SECRET="mysecretkey123456789"
NEXTAUTH_URL="http://localhost:3000"
```

Replace `YOUR_PASSWORD` with your PostgreSQL password.

### Step 7: Initialize Database
```bash
npm run db:push
```

### Step 8: Start Development Server
```bash
npm run dev
```

### Step 9: Open in Browser
Visit http://localhost:3000

## What You Get

### Public Website (Everyone Can See)
- http://localhost:3000/ → Home page
- http://localhost:3000/about → About page
- http://localhost:3000/services → Services listing
- http://localhost:3000/contact → Contact form

### Admin Dashboard (Login Required)
- http://localhost:3000/admin/login → Login page
- http://localhost:3000/admin/dashboard → Dashboard

Use any email/password to login (demo mode enabled).

## Next Steps

1. **Customize Colors**: Edit `tailwind.config.js` to change the primary (#93c93f) and secondary (#f7941e) colors
2. **Add Database Connection**: Update `.env.local` with your real PostgreSQL credentials
3. **Create Admin Account**: Add real admin users via the database or admin panel
4. **Deploy**: Use Vercel (https://vercel.com) for free hosting

## File Structure

- `app/` → All pages and API routes
- `components/` → Reusable UI components
- `lib/` → Database and utilities
- `prisma/` → Database schema
- `public/` → Static files (images, etc.)

## Useful Commands

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm start            # Start production server
npm run db:push      # Sync database schema
npm run db:studio    # Open database GUI
```

## Troubleshooting

**npm not found**: Make sure Node.js is installed and restart your terminal

**Database connection error**: Check DATABASE_URL in .env.local and that PostgreSQL is running

**Port 3000 already in use**: Kill the process or use `npm run dev -- -p 3001`

## Support

For more details, see README.md in the project folder.
