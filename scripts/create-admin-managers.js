/**
 * Script to create admin and manager accounts
 * Run with: node scripts/create-admin-managers.js
 */

const { neon } = require('@neondatabase/serverless')
const bcrypt = require('bcryptjs')

// Get database URL from environment
const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_O6Wz7SkAvZNx@ep-billowing-brook-a2xtu503-pooler.eu-central-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require'
const sql = neon(DATABASE_URL)

async function createAdminAndManagers() {
  console.log('🚀 Creating admin and manager accounts...')
  
  try {
    // Get hospitals
    const hospitals = await sql`SELECT id, name FROM hospitals ORDER BY id`
    console.log(`🏥 Found ${hospitals.length} hospitals`)
    
    hospitals.forEach(h => {
      console.log(`  - ID: ${h.id}, Name: ${h.name}`)
    })
    
    // Create admin account
    console.log('\n👑 Creating admin account...')
    const adminPassword = 'ADMIN'
    const adminPasswordHash = await bcrypt.hash(adminPassword, 10)
    
    await sql`
      INSERT INTO staff (name, email, password, role, hospital_id, specialization, is_active)
      VALUES (
        'Administrator Sistem',
        'admin@degarda.ro',
        ${adminPasswordHash},
        'admin',
        ${hospitals[0].id},
        'System Administration',
        true
      )
      ON CONFLICT (email) DO UPDATE SET
        password = EXCLUDED.password,
        role = EXCLUDED.role,
        name = EXCLUDED.name,
        specialization = EXCLUDED.specialization
    `
    
    // Get the admin staff ID
    const adminStaff = await sql`
      SELECT id FROM staff WHERE email = 'admin@degarda.ro'
    `
    
    // Create admin password entry
    await sql`
      INSERT INTO staff_passwords (staff_id, password_hash, password_plain, hospital_id, is_active)
      VALUES (${adminStaff[0].id}, ${adminPasswordHash}, ${adminPassword}, ${hospitals[0].id}, true)
      ON CONFLICT (staff_id) DO UPDATE SET
        password_hash = EXCLUDED.password_hash,
        password_plain = EXCLUDED.password_plain,
        updated_at = CURRENT_TIMESTAMP
    `
    
    console.log(`✅ Admin account created: ${adminPassword} → Administrator Sistem`)
    
    // Create manager accounts for each hospital
    console.log('\n👨‍💼 Creating manager accounts...')
    
    for (const hospital of hospitals) {
      const managerPassword = `MGR${hospital.id}`
      const managerPasswordHash = await bcrypt.hash(managerPassword, 10)
      const managerName = `Manager ${hospital.name.split(' ')[0]}`
      const managerEmail = `manager${hospital.id}@degarda.ro`
      
      await sql`
        INSERT INTO staff (name, email, password, role, hospital_id, specialization, is_active)
        VALUES (
          ${managerName},
          ${managerEmail},
          ${managerPasswordHash},
          'manager',
          ${hospital.id},
          'Management',
          true
        )
        ON CONFLICT (email) DO UPDATE SET
          password = EXCLUDED.password,
          role = EXCLUDED.role,
          name = EXCLUDED.name,
          specialization = EXCLUDED.specialization
      `
      
      // Get the manager staff ID
      const managerStaff = await sql`
        SELECT id FROM staff WHERE email = ${managerEmail}
      `
      
      // Create manager password entry
      await sql`
        INSERT INTO staff_passwords (staff_id, password_hash, password_plain, hospital_id, is_active)
        VALUES (${managerStaff[0].id}, ${managerPasswordHash}, ${managerPassword}, ${hospital.id}, true)
        ON CONFLICT (staff_id) DO UPDATE SET
          password_hash = EXCLUDED.password_hash,
          password_plain = EXCLUDED.password_plain,
          updated_at = CURRENT_TIMESTAMP
      `
      
      console.log(`✅ Manager account created: ${managerPassword} → ${managerName} (${hospital.name})`)
    }
    
    console.log('\n🎉 Admin and manager accounts created successfully!')
    
    // Display final account summary
    console.log('\n=== ACCOUNT SUMMARY ===')
    console.log('ADMIN → Administrator Sistem (Full system access)')
    
    for (const hospital of hospitals) {
      console.log(`MGR${hospital.id} → Manager ${hospital.name.split(' ')[0]} (${hospital.name})`)
    }
    
    console.log('\n📋 All accounts are ready for use!')
    
  } catch (error) {
    console.error('❌ Error creating admin and managers:', error)
    process.exit(1)
  }
}

// Run the script
createAdminAndManagers()