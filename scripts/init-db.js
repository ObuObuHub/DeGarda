async function initDatabase() {
  try {
    const response = await fetch('http://localhost:3000/api/db/init', {
      method: 'POST',
    })
    
    const data = await response.json()
    
    if (data.success) {
      console.log('✅ Database initialized successfully')
      console.log('\n📍 Hospitals imported:')
      console.log('   • Spitalul Județean de Urgență Piatra-Neamț')
      console.log('   • Spitalul "Prof. Dr. Eduard Apetrei" Buhuși')
      console.log('\n👥 Staff members imported:')
      console.log('   • 11 medical staff members (8 doctors, 1 biologist, 1 chemist)')
      console.log('   • All assigned to Laboratory department')
      console.log('\n📧 Admin credentials:')
      console.log('   Email: admin@degarda.ro')
      console.log('   Password: admin123')
      console.log('\n📧 Manager credentials:')
      console.log('   Email: manager@degarda.ro')
      console.log('   Password: manager123')
      console.log('\n📧 Staff credentials:')
      console.log('   Default password for all staff: staff123')
    } else {
      console.error('❌ Failed to initialize database:', data.error)
    }
  } catch (error) {
    console.error('❌ Error:', error.message)
    console.log('Make sure the dev server is running (npm run dev)')
  }
}

initDatabase()