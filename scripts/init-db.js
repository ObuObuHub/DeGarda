async function initDatabase() {
  try {
    const response = await fetch('http://localhost:3000/api/db/init', {
      method: 'POST',
    })
    
    const data = await response.json()
    
    if (data.success) {
      console.log('✅ Database initialized successfully')
      console.log('📧 Admin credentials:')
      console.log('   Email: admin@degarda.ro')
      console.log('   Password: admin123')
    } else {
      console.error('❌ Failed to initialize database:', data.error)
    }
  } catch (error) {
    console.error('❌ Error:', error.message)
    console.log('Make sure the dev server is running (npm run dev)')
  }
}

initDatabase()