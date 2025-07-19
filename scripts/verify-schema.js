require('dotenv').config({ path: '.env.local' })
const { neon } = require('@neondatabase/serverless')

const sql = neon(process.env.DATABASE_URL)

async function verifySchema() {
  try {
    console.log('🔍 Verifying database schema...\n')
    
    // Check table structures
    const tables = ['hospitals', 'staff', 'reservations', 'shifts', 'shift_swaps', 'notifications', 'activities']
    
    for (const table of tables) {
      console.log(`📊 Table: ${table}`)
      const columns = await sql`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns
        WHERE table_name = ${table}
        ORDER BY ordinal_position
      `
      
      columns.forEach(col => {
        console.log(`  - ${col.column_name}: ${col.data_type} ${col.is_nullable === 'NO' ? 'NOT NULL' : 'NULL'} ${col.column_default ? `DEFAULT ${col.column_default}` : ''}`)
      })
      console.log()
    }
    
    // Check constraints
    console.log('🔒 Key Constraints:')
    const constraints = await sql`
      SELECT tc.table_name, tc.constraint_name, tc.constraint_type, 
             kcu.column_name, ccu.table_name AS foreign_table_name,
             ccu.column_name AS foreign_column_name
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      LEFT JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
        AND ccu.table_schema = tc.table_schema
      WHERE tc.table_schema = 'public'
        AND tc.table_name IN ('hospitals', 'staff', 'reservations')
        AND tc.constraint_type IN ('PRIMARY KEY', 'FOREIGN KEY', 'UNIQUE')
      ORDER BY tc.table_name, tc.constraint_type
    `
    
    let currentTable = ''
    constraints.forEach(c => {
      if (c.table_name !== currentTable) {
        currentTable = c.table_name
        console.log(`\n  ${currentTable}:`)
      }
      if (c.constraint_type === 'FOREIGN KEY') {
        console.log(`    - ${c.column_name} → ${c.foreign_table_name}.${c.foreign_column_name}`)
      } else {
        console.log(`    - ${c.constraint_type}: ${c.column_name}`)
      }
    })
    
    console.log('\n\n✅ Schema verification complete!')
    
  } catch (error) {
    console.error('❌ Error verifying schema:', error)
    process.exit(1)
  }
}

verifySchema()