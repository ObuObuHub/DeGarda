#!/usr/bin/env node

/**
 * Comprehensive API Test Suite for DeGarda Application
 * 
 * This script tests all critical API endpoints with proper authentication,
 * cookie handling, and error reporting. It follows the authentication flow
 * used by the actual application.
 */

require('dotenv').config({ path: '.env.local' })

class APITester {
  constructor() {
    this.baseURL = process.env.NODE_ENV === 'production' 
      ? 'https://degarda-app.vercel.app' 
      : 'http://localhost:3002'
    
    this.testsPassed = 0
    this.testsFailed = 0
    this.authCookies = new Map()
    this.testResults = []
    
    // Test hospital codes - these should exist in the database
    this.hospitalCodes = ['LAB', 'BUH1', 'BUH2']
    this.managerCodes = ['MGR101', 'MGR102', 'MGR103']
  }

  log(message, type = 'info') {
    const timestamp = new Date().toISOString()
    const prefix = type === 'error' ? '❌' : type === 'success' ? '✅' : 'ℹ️'
    console.log(`${prefix} [${timestamp}] ${message}`)
  }

  logTest(testName, passed, details = '', data = null) {
    const result = {
      name: testName,
      passed,
      details,
      data,
      timestamp: new Date().toISOString()
    }
    
    this.testResults.push(result)
    
    if (passed) {
      this.log(`✅ ${testName}`, 'success')
      this.testsPassed++
      if (details) this.log(`   Details: ${details}`)
    } else {
      this.log(`❌ ${testName}`, 'error')
      this.testsFailed++
      if (details) this.log(`   Error: ${details}`)
    }
  }

  async makeRequest(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`
    const defaultOptions = {
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'DeGarda-API-Test/1.0'
      },
      credentials: 'include'
    }

    // Add cookies if available
    if (this.authCookies.size > 0) {
      const cookieHeader = Array.from(this.authCookies.entries())
        .map(([name, value]) => `${name}=${value}`)
        .join('; ')
      defaultOptions.headers['Cookie'] = cookieHeader
    }

    const finalOptions = { ...defaultOptions, ...options }
    
    try {
      const response = await fetch(url, finalOptions)
      
      // Extract cookies from response
      const setCookieHeader = response.headers.get('set-cookie')
      if (setCookieHeader) {
        const cookies = setCookieHeader.split(',').map(c => c.trim())
        cookies.forEach(cookie => {
          const [nameValue] = cookie.split(';')
          const [name, value] = nameValue.split('=')
          if (name && value) {
            this.authCookies.set(name.trim(), value.trim())
          }
        })
      }

      return response
    } catch (error) {
      this.log(`Network error for ${endpoint}: ${error.message}`, 'error')
      throw error
    }
  }

  async testAuthentication() {
    this.log('\n🔐 TESTING AUTHENTICATION ENDPOINTS')
    this.log('═'.repeat(60))

    // Test 1: Invalid access code
    try {
      const response = await this.makeRequest('/api/auth/access-code', {
        method: 'POST',
        body: JSON.stringify({ accessCode: 'INVALID_CODE' })
      })
      
      const data = await response.json()
      this.logTest(
        'Invalid access code rejection',
        response.status === 401 && !data.success,
        `Status: ${response.status}`
      )
    } catch (error) {
      this.logTest('Invalid access code rejection', false, error.message)
    }

    // Test 2: Valid hospital access codes
    for (const code of this.hospitalCodes) {
      try {
        const response = await this.makeRequest('/api/auth/access-code', {
          method: 'POST',
          body: JSON.stringify({ accessCode: code })
        })
        
        const data = await response.json()
        const success = response.ok && data.success && data.user
        
        this.logTest(
          `Hospital access code: ${code}`,
          success,
          success ? `User: ${data.user.name} (${data.user.role})` : `Status: ${response.status}`
        )
        
        if (success) {
          this.log(`   Hospital: ${data.user.hospitalName}`)
          this.log(`   Role: ${data.user.role}`)
          this.log(`   User ID: ${data.user.id}`)
        }
      } catch (error) {
        this.logTest(`Hospital access code: ${code}`, false, error.message)
      }
    }

    // Test 3: Manager access codes
    for (const code of this.managerCodes) {
      try {
        const response = await this.makeRequest('/api/auth/access-code', {
          method: 'POST',
          body: JSON.stringify({ accessCode: code })
        })
        
        const data = await response.json()
        const success = response.ok && data.success && data.user
        
        this.logTest(
          `Manager access code: ${code}`,
          success,
          success ? `Manager: ${data.user.name} (${data.user.role})` : `Status: ${response.status}`
        )
      } catch (error) {
        this.logTest(`Manager access code: ${code}`, false, error.message)
      }
    }

    // Test 4: Token verification (should work after login)
    try {
      const response = await this.makeRequest('/api/auth/verify')
      const data = await response.json()
      
      this.logTest(
        'Token verification',
        response.ok && data.success,
        response.ok ? `Verified user: ${data.user?.name}` : `Status: ${response.status}`
      )
    } catch (error) {
      this.logTest('Token verification', false, error.message)
    }

    // Test 5: Logout functionality
    try {
      const response = await this.makeRequest('/api/auth/logout', {
        method: 'POST'
      })
      
      const data = await response.json()
      this.logTest(
        'Logout endpoint',
        response.ok && data.success,
        `Status: ${response.status}`
      )
      
      // Clear our local cookies after logout
      this.authCookies.clear()
    } catch (error) {
      this.logTest('Logout endpoint', false, error.message)
    }

    // Test 6: Verify token after logout (should fail)
    try {
      const response = await this.makeRequest('/api/auth/verify')
      
      this.logTest(
        'Token verification after logout',
        response.status === 401,
        `Status: ${response.status} (should be 401)`
      )
    } catch (error) {
      this.logTest('Token verification after logout', false, error.message)
    }
  }

  async authenticateForDataTests() {
    this.log('\n🔑 AUTHENTICATING FOR DATA TESTS')
    this.log('─'.repeat(40))
    
    // Authenticate with first hospital code for data tests
    try {
      const response = await this.makeRequest('/api/auth/access-code', {
        method: 'POST',
        body: JSON.stringify({ accessCode: this.hospitalCodes[0] })
      })
      
      const data = await response.json()
      if (response.ok && data.success) {
        this.log(`Authenticated as: ${data.user.name} (${data.user.role})`)
        this.log(`Hospital: ${data.user.hospitalName}`)
        return true
      } else {
        this.log('Failed to authenticate for data tests', 'error')
        return false
      }
    } catch (error) {
      this.log(`Authentication failed: ${error.message}`, 'error')
      return false
    }
  }

  async testDataEndpoints() {
    this.log('\n📊 TESTING DATA ENDPOINTS')
    this.log('═'.repeat(60))

    // Authenticate first
    const authenticated = await this.authenticateForDataTests()
    if (!authenticated) {
      this.log('Skipping data endpoint tests - authentication failed', 'error')
      return
    }

    // Test data endpoints
    const dataEndpoints = [
      { path: '/api/staff', name: 'Staff API' },
      { path: '/api/hospitals', name: 'Hospitals API' },
      { path: '/api/shifts', name: 'Shifts API' },
      { path: '/api/reservations', name: 'Reservations API' },
      { path: '/api/swaps', name: 'Swaps API' }
    ]

    for (const endpoint of dataEndpoints) {
      try {
        const response = await this.makeRequest(endpoint.path)
        
        if (response.ok) {
          const data = await response.json()
          const hasData = data.success !== false
          
          this.logTest(
            `${endpoint.name} - GET`,
            hasData,
            hasData ? `Status: ${response.status}` : `Error: ${data.error || 'Unknown error'}`
          )
          
          if (hasData && data.success) {
            // Log data structure info
            const dataKey = Object.keys(data).find(key => 
              key !== 'success' && Array.isArray(data[key])
            )
            
            if (dataKey && data[dataKey]) {
              this.log(`   Found ${data[dataKey].length} ${dataKey}`)
            }
          }
        } else {
          const errorData = await response.json().catch(() => ({}))
          this.logTest(
            `${endpoint.name} - GET`,
            false,
            `Status: ${response.status}, Error: ${errorData.error || 'Unknown error'}`
          )
        }
      } catch (error) {
        this.logTest(`${endpoint.name} - GET`, false, error.message)
      }
    }
  }

  async testDatabaseManagement() {
    this.log('\n🗄️ TESTING DATABASE MANAGEMENT')
    this.log('═'.repeat(60))

    // Test migration status endpoint
    try {
      const response = await this.makeRequest('/api/db/migrate')
      
      if (response.ok) {
        const data = await response.json()
        this.logTest(
          'Database migration status',
          true,
          `Applied: ${data.appliedMigrations?.length || 0}, Pending: ${data.pendingMigrations?.length || 0}`
        )
      } else {
        const errorData = await response.json().catch(() => ({}))
        this.logTest(
          'Database migration status',
          false,
          `Status: ${response.status}, Error: ${errorData.error || 'Unknown error'}`
        )
      }
    } catch (error) {
      this.logTest('Database migration status', false, error.message)
    }

    // Note: We don't test the POST migration endpoint as it could affect the database
    this.log('   ℹ️ Skipping migration POST endpoint to avoid database changes')
  }

  async testApplicationPages() {
    this.log('\n🌐 TESTING APPLICATION PAGES')
    this.log('═'.repeat(60))

    const pages = [
      { path: '/', name: 'Login page' },
      { path: '/dashboard', name: 'Dashboard' },
      { path: '/schedule', name: 'Schedule' },
      { path: '/reservations', name: 'Reservations' },
      { path: '/management', name: 'Management' },
      { path: '/generate-shifts', name: 'Generate Shifts' },
      { path: '/admin/dashboard', name: 'Admin Dashboard' },
      { path: '/staff/schedule', name: 'Staff Schedule' }
    ]

    for (const page of pages) {
      try {
        const response = await this.makeRequest(page.path)
        
        // Pages should return 200 (success) or 307 (redirect)
        const success = response.status === 200 || response.status === 307
        
        this.logTest(
          `${page.name} (${page.path})`,
          success,
          `Status: ${response.status}`
        )
        
        if (response.status === 307) {
          const location = response.headers.get('location')
          if (location) {
            this.log(`   Redirects to: ${location}`)
          }
        }
      } catch (error) {
        this.logTest(`${page.name} (${page.path})`, false, error.message)
      }
    }
  }

  async testErrorHandling() {
    this.log('\n🚨 TESTING ERROR HANDLING')
    this.log('═'.repeat(60))

    // Test malformed requests
    const errorTests = [
      {
        name: 'Malformed JSON in auth request',
        request: () => this.makeRequest('/api/auth/access-code', {
          method: 'POST',
          body: 'invalid json'
        }),
        expectedStatus: 400
      },
      {
        name: 'Missing access code in auth request',
        request: () => this.makeRequest('/api/auth/access-code', {
          method: 'POST',
          body: JSON.stringify({})
        }),
        expectedStatus: 400
      },
      {
        name: 'Non-existent API endpoint',
        request: () => this.makeRequest('/api/nonexistent'),
        expectedStatus: 404
      }
    ]

    for (const test of errorTests) {
      try {
        const response = await test.request()
        
        this.logTest(
          test.name,
          response.status === test.expectedStatus,
          `Expected: ${test.expectedStatus}, Got: ${response.status}`
        )
      } catch (error) {
        this.logTest(test.name, false, error.message)
      }
    }
  }

  generateReport() {
    this.log('\n📈 COMPREHENSIVE TEST REPORT')
    this.log('═'.repeat(60))
    
    const totalTests = this.testsPassed + this.testsFailed
    const successRate = totalTests > 0 ? Math.round((this.testsPassed / totalTests) * 100) : 0
    
    this.log(`✅ Tests Passed: ${this.testsPassed}`)
    this.log(`❌ Tests Failed: ${this.testsFailed}`)
    this.log(`📊 Total Tests: ${totalTests}`)
    this.log(`🎯 Success Rate: ${successRate}%`)
    
    // Categorize results
    const categories = {
      authentication: this.testResults.filter(r => r.name.toLowerCase().includes('access code') || r.name.toLowerCase().includes('token') || r.name.toLowerCase().includes('logout')),
      dataEndpoints: this.testResults.filter(r => r.name.includes('API')),
      pages: this.testResults.filter(r => r.name.includes('page') || r.name.includes('Dashboard') || r.name.includes('Schedule')),
      database: this.testResults.filter(r => r.name.toLowerCase().includes('database') || r.name.toLowerCase().includes('migration')),
      errors: this.testResults.filter(r => r.name.toLowerCase().includes('error') || r.name.toLowerCase().includes('malformed'))
    }

    this.log('\n📋 RESULTS BY CATEGORY')
    this.log('─'.repeat(40))
    
    Object.entries(categories).forEach(([category, results]) => {
      if (results.length > 0) {
        const passed = results.filter(r => r.passed).length
        const categoryRate = Math.round((passed / results.length) * 100)
        this.log(`${category.toUpperCase()}: ${passed}/${results.length} (${categoryRate}%)`)
      }
    })

    // Show failed tests
    const failedTests = this.testResults.filter(r => !r.passed)
    if (failedTests.length > 0) {
      this.log('\n❌ FAILED TESTS DETAILS')
      this.log('─'.repeat(40))
      failedTests.forEach(test => {
        this.log(`• ${test.name}: ${test.details}`)
      })
    }

    // Overall assessment
    this.log('\n🎯 OVERALL ASSESSMENT')
    this.log('─'.repeat(40))
    
    if (this.testsFailed === 0) {
      this.log('🎉 ALL TESTS PASSED! The DeGarda API is fully functional.')
    } else if (successRate >= 90) {
      this.log('✅ Excellent! Minor issues detected, but core functionality works.')
    } else if (successRate >= 75) {
      this.log('⚠️ Good overall, but some issues need attention.')
    } else if (successRate >= 50) {
      this.log('🔧 Several issues detected. Review and fix required.')
    } else {
      this.log('🚨 Critical issues detected. Immediate attention required.')
    }

    return {
      totalTests,
      passed: this.testsPassed,
      failed: this.testsFailed,
      successRate,
      categories,
      failedTests
    }
  }

  async runAllTests() {
    this.log('🚀 STARTING COMPREHENSIVE API TEST SUITE')
    this.log(`🌐 Target: ${this.baseURL}`)
    this.log('═'.repeat(60))

    const startTime = Date.now()

    try {
      // Run all test suites
      await this.testAuthentication()
      await this.testDataEndpoints()
      await this.testDatabaseManagement()
      await this.testApplicationPages()
      await this.testErrorHandling()

      const endTime = Date.now()
      const duration = ((endTime - startTime) / 1000).toFixed(2)

      this.log(`\n⏱️ Tests completed in ${duration} seconds`)
      
      return this.generateReport()
    } catch (error) {
      this.log(`Critical error during test execution: ${error.message}`, 'error')
      throw error
    }
  }
}

// Main execution
async function main() {
  const tester = new APITester()
  
  try {
    const report = await tester.runAllTests()
    
    // Exit with appropriate code
    process.exit(report.failed > 0 ? 1 : 0)
  } catch (error) {
    console.error('❌ Test suite failed:', error)
    process.exit(1)
  }
}

// Run if called directly
if (require.main === module) {
  main()
}

module.exports = { APITester }