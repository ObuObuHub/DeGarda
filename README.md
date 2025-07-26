# Degarda Simple - Hospital Shift Management

A simple, beautiful hospital shift management app with Romanian interface.

## Quick Setup

### 1. Install Dependencies
```bash
npm install
```

### 2. Supabase Setup (5 minutes)
1. Go to [supabase.com](https://supabase.com) and create a free account
2. Create a new project (choose any name and password)
3. Go to **SQL Editor** in your project dashboard
4. Copy/paste the entire content from `supabase-schema.sql` and click **"Run"**
5. Go to **Authentication > Settings** and turn **OFF** "Enable email confirmations"
6. Go to **Project Settings > API** to get your credentials

### 3. Environment Configuration
1. Copy `.env.local.example` to `.env.local`:
   ```bash
   cp .env.local.example .env.local
   ```
2. Edit `.env.local` and replace the placeholder values:
   - `NEXT_PUBLIC_SUPABASE_URL`: Your project URL (looks like `https://abcdefg.supabase.co`)
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Your anon/public key (long JWT token)

### 4. Verify Sample Users
The schema automatically creates sample users with personal codes:
- `ANA1` - Dr. Ana Popescu (Manager, ATI)
- `MAR1` - Asist. Maria Ionescu (Staff, ATI)  
- `ION1` - Asist. Ion Gheorghe (Staff, Urgente)
- `ELE1` - Dr. Elena Radu (Staff, Chirurgie)

No additional user setup required!

### 5. Run the Application
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and log in with the personal codes above.

## Features
- 🏥 Department-specific shifts (ATI, Urgente, Chirurgie, Medicina Interna)
- 📅 Beautiful calendar view
- 👥 Simple login with personal codes (no emails!)
- 🔄 Shift reservations and swaps
- 👨‍💼 Manager tools (generate shifts, approve swaps)
- 📊 CSV export
- 📱 Works on all devices

## Personal Codes
- Manager: `ANA1`
- Staff: `MAR1`, `ION1`, `ELE1`

## Development Commands

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
```

## Troubleshooting

### Build Errors
- **"Invalid URL" error**: Make sure you've configured your `.env.local` file with real Supabase credentials
- **Tailwind CSS errors**: PostCSS should be configured automatically, but run `npm install` if you see CSS compilation issues

### Authentication Issues
- **"Cod personal invalid"**: Make sure the personal code exists in the users table
- **Database errors**: Make sure you've run the `supabase-schema.sql` script in the SQL Editor

### Environment Variables
- Variables must start with `NEXT_PUBLIC_` to be accessible in the browser
- Restart the dev server after changing environment variables