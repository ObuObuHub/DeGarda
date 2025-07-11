# Database Setup Guide

## Neon Database Configuration

### Common Issues

#### ByteString Conversion Error
If you encounter an error like:
```
Cannot convert argument to a ByteString because the character at index X has a value of Y which is greater than 255
```

This is usually caused by special characters in your database connection string.

### Solutions:

1. **Check your DATABASE_URL** in `.env.local`:
   - Ensure the password doesn't contain special Unicode characters
   - If your password has special characters, they must be URL-encoded:
     - `@` becomes `%40`
     - `#` becomes `%23`
     - `$` becomes `%24`
     - `&` becomes `%26`
     - `+` becomes `%2B`
     - `/` becomes `%2F`
     - `:` becomes `%3A`
     - `;` becomes `%3B`
     - `=` becomes `%3D`
     - `?` becomes `%3F`

2. **Example DATABASE_URL format**:
   ```
   postgresql://username:password%40123@host.neon.tech/database?sslmode=require
   ```

3. **Test your connection**:
   - Visit `/api/db/test-connection` to verify your database connection
   - Check the console logs for any warnings about the DATABASE_URL

4. **If you still have issues**:
   - Generate a new password without special characters in Neon dashboard
   - Or ensure all special characters are properly URL-encoded

### Setting up a new Neon Database

1. Go to [Neon](https://neon.tech) and create a new project
2. Copy the connection string from the dashboard
3. Add it to your `.env.local` file
4. Run the database initialization: `npm run db:init`

### Running Migrations

To initialize the database schema:
```bash
npm run db:init
```

To reset the database (WARNING: this will delete all data):
```bash
npm run db:reset
```