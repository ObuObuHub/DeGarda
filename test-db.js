// Test database connection and structure
const { neon } = require('@neondatabase/serverless');

async function testDatabase() {
  // You'll need to set this environment variable
  const DATABASE_URL = process.env.DATABASE_URL;
  
  if (!DATABASE_URL) {
    console.error('Please set DATABASE_URL environment variable');
    console.log('Example: DATABASE_URL="your-connection-string" node test-db.js');
    process.exit(1);
  }

  const sql = neon(DATABASE_URL);

  try {
    console.log('🔍 Testing database connection...\n');

    // 1. Check what tables exist
    console.log('📋 Checking existing tables:');
    const tables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `;
    
    if (tables.length === 0) {
      console.log('❌ No tables found. Database needs to be initialized.');
    } else {
      console.log('✅ Found tables:');
      tables.forEach(t => console.log(`   - ${t.table_name}`));
    }

    // 2. Check if main tables exist and have data
    const mainTables = ['hospitals', 'staff', 'shifts', 'swap_requests', 'notifications'];
    console.log('\n📊 Checking table contents:');
    
    for (const tableName of mainTables) {
      try {
        const count = await sql`
          SELECT COUNT(*) as count 
          FROM ${sql(tableName)}
        `;
        console.log(`   - ${tableName}: ${count[0].count} rows`);
      } catch (e) {
        console.log(`   - ${tableName}: ❌ Table doesn't exist`);
      }
    }

    // 3. Check hospitals specifically
    console.log('\n🏥 Checking hospitals:');
    try {
      const hospitals = await sql`
        SELECT id, name, city 
        FROM hospitals 
        ORDER BY id
        LIMIT 5
      `;
      
      if (hospitals.length > 0) {
        console.log('✅ Sample hospitals:');
        hospitals.forEach(h => console.log(`   - [${h.id}] ${h.name} (${h.city})`));
      } else {
        console.log('❌ No hospitals found');
      }
    } catch (e) {
      console.log('❌ Could not query hospitals table');
    }

    // 4. Check staff/users
    console.log('\n👥 Checking staff:');
    try {
      const staff = await sql`
        SELECT id, name, role, email 
        FROM staff 
        ORDER BY id
        LIMIT 5
      `;
      
      if (staff.length > 0) {
        console.log('✅ Sample staff:');
        staff.forEach(s => console.log(`   - [${s.id}] ${s.name} (${s.role}) - ${s.email}`));
      } else {
        console.log('❌ No staff found');
      }
    } catch (e) {
      console.log('❌ Could not query staff table');
    }

    console.log('\n✅ Database test completed!');
    
  } catch (error) {
    console.error('❌ Database test failed:', error.message);
  }
}

// Run the test
testDatabase();