# Vercel Deployment Guide for DeGarda

## Environment Variables Setup

To deploy DeGarda on Vercel, you need to configure the following environment variables:

### Required Environment Variables

1. **DATABASE_URL** (Required)
   - Your Neon PostgreSQL connection string
   - Format: `postgresql://username:password@host/database?sslmode=require`
   - **IMPORTANT**: If your password contains special characters, they must be URL-encoded:
     - `@` → `%40`
     - `#` → `%23`
     - `$` → `%24`
     - Special Unicode characters (like ║) should be avoided or replaced

2. **JWT_SECRET** (Optional for now)
   - A secure random string for JWT signing
   - Example: `your-secret-key-here`

3. **NEXT_PUBLIC_APP_URL** (Optional)
   - Your production URL
   - Example: `https://degarda.vercel.app`

## Setting Environment Variables in Vercel

1. Go to your Vercel project dashboard
2. Navigate to Settings → Environment Variables
3. Add each variable:
   - Name: `DATABASE_URL`
   - Value: Your Neon connection string (with encoded special characters)
   - Environment: Production, Preview, Development

## Common Issues

### 500 Error on API Routes

If you're getting 500 errors on production, it's usually due to:

1. **Missing DATABASE_URL**: Make sure it's set in Vercel environment variables
2. **Special characters in DATABASE_URL**: Ensure all special characters are URL-encoded
3. **Database not initialized**: Run the database initialization after deployment

### ByteString Conversion Error

If you see "Cannot convert argument to a ByteString" errors:

1. Check your DATABASE_URL for Unicode characters
2. Replace any special Unicode characters in your password
3. Use URL encoding for special ASCII characters

## Database Initialization

After setting up environment variables:

1. Visit `https://your-app.vercel.app/api/db/test-connection` to test the connection
2. If successful, visit `https://your-app.vercel.app/api/db/init` (POST request) to initialize tables
3. Or use the reset endpoint: `https://your-app.vercel.app/api/db/reset` (POST request)

## Debugging

To debug production issues:

1. Check Vercel Functions logs in your dashboard
2. Test the database connection endpoint first
3. Look for specific error messages in the logs

## Example Working Configuration

```env
DATABASE_URL=postgresql://neondb_owner:encodedpassword%40123@ep-example.aws.neon.tech/neondb?sslmode=require
JWT_SECRET=degarda-production-secret-key
NEXT_PUBLIC_APP_URL=https://degarda.vercel.app
```

## Support

If you continue to have issues:

1. Double-check all environment variables are set correctly
2. Ensure your Neon database is active and accessible
3. Check that your database password doesn't contain problematic Unicode characters