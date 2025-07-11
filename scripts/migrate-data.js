const { neon } = require('@neondatabase/serverless');
const bcrypt = require('bcryptjs');

// Database connection
const DATABASE_URL = process.env.DATABASE_URL || 'postgres://neondb_owner:npg_O6Wz7SkAvZNx@ep-billowing-brook-a2xtu503-pooler.eu-central-1.aws.neon.tech/neondb?sslmode=require';
const sql = neon(DATABASE_URL);

// Initial data - migrated from lib/data.ts
const initialHospitals = [
  {
    name: 'Spitalul Județean de Urgență Piatra-Neamț',
    city: 'Piatra-Neamț'
  },
  {
    name: 'Spitalul "Prof. Dr. Eduard Apetrei" Buhuși',
    city: 'Buhuși'
  }
];

const initialStaff = [
  {
    name: 'Dr. Zugun Eduard',
    email: 'zugun.eduard@degarda.ro',
    type: 'medic',
    specialization: 'Laborator',
    hospitalName: 'Spitalul Județean de Urgență Piatra-Neamț',
    role: 'staff'
  },
  {
    name: 'Dr. Gîlea Arina',
    email: 'gilea.arina@degarda.ro',
    type: 'medic',
    specialization: 'Laborator',
    hospitalName: 'Spitalul Județean de Urgență Piatra-Neamț',
    role: 'manager'
  },
  {
    name: 'Biol. Marciuc Mihaela',
    email: 'marciuc.mihaela@degarda.ro',
    type: 'biolog',
    specialization: 'Microbiologie',
    hospitalName: 'Spitalul Județean de Urgență Piatra-Neamț',
    role: 'staff'
  },
  {
    name: 'Ch. Rusu Cristian',
    email: 'rusu.cristian@degarda.ro',
    type: 'chimist',
    specialization: 'Biochimie',
    hospitalName: 'Spitalul Județean de Urgență Piatra-Neamț',
    role: 'staff'
  },
  {
    name: 'As. Tanase Florina',
    email: 'tanase.florina@degarda.ro',
    type: 'asistent',
    specialization: 'Laborator',
    hospitalName: 'Spitalul Județean de Urgență Piatra-Neamț',
    role: 'staff'
  },
  {
    name: 'Dr. Munteanu George',
    email: 'munteanu.george@degarda.ro',
    type: 'medic',
    specialization: 'Laborator',
    hospitalName: 'Spitalul "Prof. Dr. Eduard Apetrei" Buhuși',
    role: 'manager'
  },
  {
    name: 'Biol. Dascalu Alina',
    email: 'dascalu.alina@degarda.ro',
    type: 'biolog',
    specialization: 'Hematologie',
    hospitalName: 'Spitalul "Prof. Dr. Eduard Apetrei" Buhuși',
    role: 'staff'
  },
  {
    name: 'Ch. Ungureanu Razvan',
    email: 'ungureanu.razvan@degarda.ro',
    type: 'chimist',
    specialization: 'Biochimie',
    hospitalName: 'Spitalul "Prof. Dr. Eduard Apetrei" Buhuși',
    role: 'staff'
  },
  {
    name: 'As. Miron Elena',
    email: 'miron.elena@degarda.ro',
    type: 'asistent',
    specialization: 'Laborator',
    hospitalName: 'Spitalul "Prof. Dr. Eduard Apetrei" Buhuși',
    role: 'staff'
  }
];

async function migrateData() {
  try {
    console.log('Starting data migration...');
    
    // Check if data already exists
    const existingHospitals = await sql`SELECT COUNT(*) as count FROM hospitals`;
    if (parseInt(existingHospitals[0].count) > 2) {
      console.log('Data already migrated. Skipping...');
      return;
    }
    
    // Insert hospitals if they don't exist
    console.log('Inserting hospitals...');
    const hospitalMap = {};
    
    for (const hospital of initialHospitals) {
      // Check if hospital already exists
      const existing = await sql`
        SELECT id, name FROM hospitals WHERE name = ${hospital.name}
      `;
      
      let result;
      if (existing.length > 0) {
        result = existing;
        console.log(`  Hospital already exists: ${hospital.name}`);
      } else {
        result = await sql`
          INSERT INTO hospitals (name, city)
          VALUES (${hospital.name}, ${hospital.city})
          RETURNING id, name
        `;
      }
      hospitalMap[hospital.name] = result[0].id;
      console.log(`✓ Inserted hospital: ${hospital.name}`);
    }
    
    // Insert staff members
    console.log('\nInserting staff members...');
    for (const staff of initialStaff) {
      const hospitalId = hospitalMap[staff.hospitalName];
      if (!hospitalId) {
        console.error(`Hospital not found for staff: ${staff.name}`);
        continue;
      }
      
      // Generate password hash
      const tempPassword = staff.email.split('@')[0] + '123';
      const hashedPassword = await bcrypt.hash(tempPassword, 10);
      
      try {
        // Check if staff already exists
        const existing = await sql`
          SELECT id FROM staff WHERE email = ${staff.email}
        `;
        
        if (existing.length > 0) {
          await sql`
            UPDATE staff
            SET 
              name = ${staff.name},
              role = ${staff.role},
              hospital_id = ${hospitalId},
              specialization = ${staff.specialization},
              is_active = true
            WHERE email = ${staff.email}
          `;
          console.log(`✓ Updated existing staff: ${staff.name} (${staff.email})`);
        } else {
          await sql`
            INSERT INTO staff (name, email, password, role, hospital_id, specialization, is_active)
            VALUES (
              ${staff.name},
              ${staff.email},
              ${hashedPassword},
              ${staff.role},
              ${hospitalId},
              ${staff.specialization},
              true
            )
          `;
          console.log(`✓ Inserted new staff: ${staff.name} (${staff.email})`);
        }
      } catch (err) {
        console.error(`Error inserting staff ${staff.name}:`, err.message);
      }
    }
    
    // Insert admin user if not exists
    console.log('\nInserting admin user...');
    const adminExists = await sql`
      SELECT id FROM staff WHERE email = 'admin@degarda.ro'
    `;
    
    if (adminExists.length === 0) {
      const adminPassword = await bcrypt.hash('admin123', 10);
      await sql`
        INSERT INTO staff (name, email, password, role, hospital_id, specialization, is_active)
        VALUES (
          'Administrator',
          'admin@degarda.ro',
          ${adminPassword},
          'admin',
          ${hospitalMap['Spitalul Județean de Urgență Piatra-Neamț']},
          'Administration',
          true
        )
      `;
      console.log('✓ Admin user created (admin@degarda.ro / admin123)');
    } else {
      console.log('  Admin user already exists');
    }
    
    console.log('\nData migration completed successfully!');
    
    // Show summary
    const staffCount = await sql`SELECT COUNT(*) as count FROM staff WHERE is_active = true`;
    const hospitalCount = await sql`SELECT COUNT(*) as count FROM hospitals`;
    
    console.log('\nSummary:');
    console.log(`- Hospitals: ${hospitalCount[0].count}`);
    console.log(`- Staff members: ${staffCount[0].count}`);
    
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

// Run migration
migrateData();