# Kingston Energies Website

A full-stack Next.js application for Kingston Energies with a public website and admin dashboard.

## Features

### Public Website
- Landing page with hero section
- About page with company information
- Services page with product listings
- Contact form with lead capture
- Responsive mobile design
- Tailwind CSS styling

### Admin Dashboard
- User authentication with NextAuth.js
- Dashboard with key metrics
- Lead management system
- Product management
- User management
- Energy data tracking and analytics
- Secure session management

## Tech Stack

- **Frontend**: React 19, Next.js 15, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: NextAuth.js
- **Styling**: Tailwind CSS

## Prerequisites

- Node.js 18+ (https://nodejs.org/)
- PostgreSQL 12+ (https://www.postgresql.org/)
- npm or yarn

## Installation

### 1. Install Node.js

Download and install from https://nodejs.org/ (LTS version recommended)

### 2. Clone/Extract Project

The project is located at `C:\Users\jfearon\kingston-energies\`

### 3. Install Dependencies

```bash
cd C:\Users\jfearon\kingston-energies
npm install
```

### 4. Set Up Database

Create a PostgreSQL database:
```bash
createdb kingston_energies
```

### 5. Configure Environment

Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```

Update `.env.local` with your database URL:
```
DATABASE_URL="postgresql://username:password@localhost:5432/kingston_energies"
NEXTAUTH_SECRET="your-secret-key-here"
NEXTAUTH_URL="http://localhost:3000"
```

### 6. Set Up Database Schema

```bash
npm run db:push
```

### 7. Run Development Server

```bash
npm run dev
```

Visit http://localhost:3000

## Usage

### Public Website
- **Home**: http://localhost:3000/
- **About**: http://localhost:3000/about
- **Services**: http://localhost:3000/services
- **Contact**: http://localhost:3000/contact

### Admin Dashboard
- **Login**: http://localhost:3000/admin/login
- **Dashboard**: http://localhost:3000/admin/dashboard
- **Demo credentials**: Use any email/password (configured for demo mode)

### Admin Features
- View dashboard metrics
- Manage customer leads
- Manage products and services
- Manage users
- Track energy data

## Database Schema

### Tables
- **User**: Admin users with authentication
- **Account**: OAuth account linkage
- **Session**: User sessions
- **Product**: Energy products and services
- **Subscription**: User subscriptions to products
- **EnergyData**: Energy consumption and production data
- **Lead**: Contact form submissions

## API Endpoints

### Public
- `POST /api/contact` - Submit contact form

### Admin
- `GET/POST /api/auth/[...nextauth]` - Authentication

## Project Structure

```
kingston-energies/
├── app/
│   ├── admin/                  # Admin dashboard pages
│   │   ├── dashboard/
│   │   ├── leads/
│   │   ├── users/
│   │   ├── products/
│   │   ├── energy-data/
│   │   └── login/
│   ├── api/                    # API routes
│   │   ├── auth/
│   │   └── contact/
│   ├── (public pages)/         # Public website pages
│   │   ├── page.tsx            # Home
│   │   ├── about/
│   │   ├── services/
│   │   └── contact/
│   ├── layout.tsx              # Root layout
│   └── globals.css             # Global styles
├── components/                 # Reusable components
│   ├── Navbar.tsx
│   └── Footer.tsx
├── lib/                        # Utilities
│   └── prisma.ts              # Prisma client
├── prisma/
│   └── schema.prisma          # Database schema
├── package.json
├── tsconfig.json
├── tailwind.config.js
└── next.config.js
```

## Building for Production

```bash
npm run build
npm start
```

## Contributing

1. Create a new branch for your feature
2. Make your changes
3. Test thoroughly
4. Submit a pull request

## License

Copyright © 2024 Kingston Energies. All rights reserved.
