# DeGarda v2

A clean, minimalistic medical shift scheduling application with iPhone-style UI design.

## Features

- 🎨 **Clean UI** - Minimalistic iPhone-style design with smooth animations
- 🔐 **Authentication** - Secure JWT-based authentication system
- 🏥 **Multi-Hospital** - Support for multiple medical facilities
- 📅 **Shift Management** - Easy shift scheduling and management
- 🔄 **Shift Swaps** - Request and approve shift exchanges
- 📊 **Activity Tracking** - Real-time activity monitoring
- 🔐 **Secure Passwords** - Auto-generated secure passwords for staff
- 📱 **Responsive** - Works perfectly on all devices

## Tech Stack

- **Framework**: Next.js 15 with TypeScript
- **Styling**: Tailwind CSS with custom iPhone-style design system
- **Database**: PostgreSQL (Neon)
- **Authentication**: JWT with bcrypt

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL database (or Neon account)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/degarda-v2.git
cd degarda-v2
```

2. Install dependencies:
```bash
npm install
```

3. Create `.env.local` file:
```env
DATABASE_URL=your_postgres_connection_string
JWT_SECRET=your_jwt_secret_key
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

4. Initialize the database schema:
```bash
npm run db:init
```

5. Run database migration to add initial data:
```bash
npm run db:migrate
```

6. Run the development server:
```bash
npm run dev
```

Note: Admin credentials are auto-generated during database initialization. Check the console output or server logs for the secure password.

## Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run db:init` - Initialize database schema
- `npm run db:migrate` - Populate database with initial data
- `npm run lint` - Run ESLint
- `npm run typecheck` - Check TypeScript types

## Project Structure

```
degarda-v2/
├── app/              # Next.js app directory
│   ├── api/         # API routes
│   └── admin/       # Admin pages
├── components/      # Reusable components
│   └── ui/         # UI components
├── lib/            # Utilities and helpers
├── styles/         # Global styles
└── scripts/        # Utility scripts
```

## Deployment

### Vercel Deployment

1. Push your code to GitHub
2. Import the project in Vercel
3. Set environment variables in Vercel dashboard:
   - `DATABASE_URL` - Your Neon PostgreSQL connection string
   - `JWT_SECRET` - A strong secret key for production
   - `NEXT_PUBLIC_APP_URL` - Your production URL (e.g., https://your-app.vercel.app)

4. After deployment, run the migration script:
   - You can use Vercel's deployment hooks
   - Or run it manually: `npm run db:migrate` with production DATABASE_URL

### Database Initialization

To initialize the database with the activities table:
```bash
# First, create the base tables
curl -X POST https://your-app.vercel.app/api/db/init

# Then, add the activities table
curl -X POST https://your-app.vercel.app/api/db/add-activities-table
```

### Manual Deployment

1. Build the application:
```bash
npm run build
```

2. Set production environment variables
3. Run database migrations:
```bash
npm run db:migrate
```

4. Start the production server:
```bash
npm start
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT