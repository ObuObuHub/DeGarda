# DeGarda v2

A clean, minimalistic medical shift scheduling application with iPhone-style UI design.

## Features

- 🎨 **Clean UI** - Minimalistic iPhone-style design with smooth animations
- 🔐 **Authentication** - Secure JWT-based authentication system
- 🏥 **Multi-Hospital** - Support for multiple medical facilities
- 📅 **Shift Management** - Easy shift scheduling and management
- 🔄 **Shift Swaps** - Request and approve shift exchanges (coming soon)
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

4. Run the development server:
```bash
npm run dev
```

5. Initialize the database:
```bash
npm run db:init
```

Default admin credentials:
- Email: admin@degarda.ro
- Password: admin123

## Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run db:init` - Initialize database with sample data

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

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT