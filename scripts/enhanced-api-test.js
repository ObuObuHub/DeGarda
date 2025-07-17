#!/usr/bin/env node

/**
 * Enhanced API Test Suite for DeGarda Application
 * 
 * This enhanced version addresses the issues found in the initial test:
 * - Tests Shifts API with proper parameters
 * - Tests Reservations API with better error handling
 * - Tests edge cases and performance
 * - Provides detailed debugging information
 */

require('dotenv').config({ path: '.env.local' })

class EnhancedAPITester {
  constructor() {
    this.baseURL = process.env.NODE_ENV === 'production' 
      ? 'https://degarda-app.vercel.app' 
      : 'http://localhost:3002'
    
    this.testsPassed = 0
    this.testsFailed = 0
    this.authCookies = new Map()
    this.testResults = []
    this.authenticatedUser = null
    
    // Test codes
    this.hospitalCodes = ['LAB', 'BUH1', 'BUH2']
    this.managerCodes = ['MGR101', 'MGR102', 'MGR103']
  }

  log(message, type = 'info') {
    const timestamp = new Date().toISOString()
    const prefix = type === 'error' ? '❌' : type === 'success' ? '✅' : type === 'warning' ? '⚠️' : 'ℹ️'
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
        'User-Agent': 'DeGarda-Enhanced-API-Test/1.0'
      },
      credentials: 'include',
      timeout: 10000
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

  async authenticateWithCode(code) {
    try {
      const response = await this.makeRequest('/api/auth/access-code', {
        method: 'POST',
        body: JSON.stringify({ accessCode: code })
      })
      
      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          this.authenticatedUser = data.user
          return data.user
        }
      }
      return null
    } catch (error) {
      this.log(`Authentication failed: ${error.message}`, 'error')
      return null
    }
  }

  async testEnhancedAuthentication() {
    this.log('\n🔐 ENHANCED AUTHENTICATION TESTING')
    this.log('═'.repeat(60))

    // Test 1: Rate limiting simulation
    this.log('\n🚀 Testing Authentication Rate Limiting')
    const invalidAttempts = []
    for (let i = 0; i < 5; i++) {
      try {
        const start = Date.now()
        const response = await this.makeRequest('/api/auth/access-code', {
          method: 'POST',
          body: JSON.stringify({ accessCode: 'INVALID' })
        })
        const duration = Date.now() - start
        invalidAttempts.push({ status: response.status, duration })
      } catch (error) {
        invalidAttempts.push({ error: error.message })
      }
    }
    
    const avgDuration = invalidAttempts
      .filter(a => a.duration)
      .reduce((sum, a) => sum + a.duration, 0) / invalidAttempts.length
    
    this.logTest(
      'Authentication performance under load',
      avgDuration < 2000,
      `Average response time: ${avgDuration.toFixed(0)}ms`
    )

    // Test 2: SQL injection attempts
    const sqlInjectionAttempts = [
      "'; DROP TABLE users; --",
      "' OR 1=1 --",
      "admin' OR 'a'='a",
      "1' UNION SELECT * FROM staff --"
    ]

    for (const attempt of sqlInjectionAttempts) {
      try {
        const response = await this.makeRequest('/api/auth/access-code', {
          method: 'POST',
          body: JSON.stringify({ accessCode: attempt })
        })
        
        this.logTest(
          `SQL injection protection: ${attempt.substring(0, 20)}...`,
          response.status === 401,
          `Status: ${response.status}`
        )
      } catch (error) {
        this.logTest(
          `SQL injection protection: ${attempt.substring(0, 20)}...`,
          false,
          error.message
        )
      }
    }

    // Test 3: Valid authentication with detailed user info
    for (const code of this.hospitalCodes) {
      const user = await this.authenticateWithCode(code)
      if (user) {
        this.logTest(
          `Hospital auth: ${code}`,
          true,
          `User: ${user.name}, Hospital: ${user.hospitalName}`
        )
        
        // Test token verification immediately after login
        const verifyResponse = await this.makeRequest('/api/auth/verify')
        const verifyData = await verifyResponse.json()
        
        this.logTest(
          `Token verification for ${code}`,
          verifyResponse.ok && verifyData.success,
          `User verified: ${verifyData.user?.name}`
        )
      } else {
        this.logTest(`Hospital auth: ${code}`, false, 'Authentication failed')
      }
    }
  }

  async testEnhancedDataEndpoints() {
    this.log('\n📊 ENHANCED DATA ENDPOINTS TESTING')
    this.log('═'.repeat(60))

    // Authenticate first
    const user = await this.authenticateWithCode(this.hospitalCodes[0])
    if (!user) {
      this.log('Skipping data tests - authentication failed', 'error')
      return
    }

    this.log(`Testing as: ${user.name} (${user.role}) at ${user.hospitalName}`)

    // Test 1: Staff API with filters
    try {
      const staffResponse = await this.makeRequest('/api/staff')
      
      if (staffResponse.ok) {
        const staffData = await staffResponse.json()
        
        this.logTest(
          'Staff API - Basic GET',
          staffData.success,
          `Found ${staffData.staff?.length || 0} staff members`
        )
        
        // Test hospital isolation
        if (staffData.staff && staffData.staff.length > 0) {
          const hospitalIds = [...new Set(staffData.staff.map(s => s.hospital_id))]
          this.logTest(
            'Staff API - Hospital isolation',
            hospitalIds.length === 1 && hospitalIds[0] === user.hospitalId,
            `Hospital IDs: ${hospitalIds.join(', ')}`
          )
        }
      } else {
        this.logTest('Staff API - Basic GET', false, `Status: ${staffResponse.status}`)
      }
    } catch (error) {
      this.logTest('Staff API - Basic GET', false, error.message)
    }

    // Test 2: Hospitals API
    try {
      const hospitalsResponse = await this.makeRequest('/api/hospitals')
      
      if (hospitalsResponse.ok) {
        const hospitalsData = await hospitalsResponse.json()
        
        this.logTest(
          'Hospitals API - Basic GET',
          hospitalsData.success,
          `Found ${hospitalsData.hospitals?.length || 0} hospitals`
        )
        
        // Test access control
        if (hospitalsData.hospitals) {
          const userHospital = hospitalsData.hospitals.find(h => h.id === user.hospitalId)
          this.logTest(
            'Hospitals API - Access control',
            userHospital !== undefined,
            `User hospital ${user.hospitalName} is accessible`
          )
        }
      } else {
        this.logTest('Hospitals API - Basic GET', false, `Status: ${hospitalsResponse.status}`)
      }
    } catch (error) {
      this.logTest('Hospitals API - Basic GET', false, error.message)
    }

    // Test 3: Shifts API with proper parameters
    const currentDate = new Date()
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth() + 1

    try {
      const shiftsResponse = await this.makeRequest(`/api/shifts?year=${year}&month=${month}`)
      
      if (shiftsResponse.ok) {
        const shiftsData = await shiftsResponse.json()
        
        this.logTest(
          'Shifts API - With date parameters',
          shiftsData.success,
          `Found ${shiftsData.shifts?.length || 0} shifts for ${year}-${month}`
        )
        
        // Test previous month
        const prevMonth = month === 1 ? 12 : month - 1
        const prevYear = month === 1 ? year - 1 : year
        
        const prevShiftsResponse = await this.makeRequest(`/api/shifts?year=${prevYear}&month=${prevMonth}`)
        const prevShiftsData = await prevShiftsResponse.json()
        
        this.logTest(
          'Shifts API - Previous month',
          prevShiftsResponse.ok,
          `Previous month (${prevYear}-${prevMonth}): ${prevShiftsData.shifts?.length || 0} shifts`
        )
        
      } else {
        const errorData = await shiftsResponse.json()
        this.logTest(
          'Shifts API - With date parameters',
          false,
          `Status: ${shiftsResponse.status}, Error: ${errorData.error}`
        )
      }
    } catch (error) {
      this.logTest('Shifts API - With date parameters', false, error.message)
    }

    // Test 4: Reservations API with error handling
    try {
      const reservationsResponse = await this.makeRequest('/api/reservations')
      
      if (reservationsResponse.ok) {
        const reservationsData = await reservationsResponse.json()
        
        this.logTest(
          'Reservations API - Basic GET',
          reservationsData.success,
          `Found ${reservationsData.reservations?.length || 0} reservations`
        )
      } else {
        const errorData = await reservationsResponse.json().catch(() => ({}))
        
        // Check if it's a known issue
        if (reservationsResponse.status === 500) {
          this.logTest(
            'Reservations API - Database error',
            false,
            `Database error: ${errorData.error || 'Unknown error'}`
          )
          
          // Test with different parameters
          const todayReservations = await this.makeRequest('/api/reservations?date=' + currentDate.toISOString().split('T')[0])
          this.logTest(
            'Reservations API - With date filter',
            todayReservations.ok,
            `Status: ${todayReservations.status}`
          )
        } else {
          this.logTest(
            'Reservations API - Basic GET',
            false,
            `Status: ${reservationsResponse.status}`
          )
        }
      }
    } catch (error) {
      this.logTest('Reservations API - Basic GET', false, error.message)
    }

    // Test 5: Swaps API
    try {
      const swapsResponse = await this.makeRequest('/api/swaps')
      
      if (swapsResponse.ok) {
        const swapsData = await swapsResponse.json()
        
        this.logTest(
          'Swaps API - Basic GET',
          swapsData.success,
          `Found ${swapsData.swaps?.length || 0} swap requests`
        )
        
        // Test filtering by status
        const pendingSwaps = await this.makeRequest('/api/swaps?status=pending')
        if (pendingSwaps.ok) {
          const pendingData = await pendingSwaps.json()
          this.logTest(
            'Swaps API - Status filter',
            pendingData.success,
            `Pending swaps: ${pendingData.swaps?.length || 0}`
          )
        }
      } else {
        this.logTest('Swaps API - Basic GET', false, `Status: ${swapsResponse.status}`)
      }
    } catch (error) {
      this.logTest('Swaps API - Basic GET', false, error.message)
    }
  }

  async testCriticalWorkflows() {
    this.log('\n🔄 TESTING CRITICAL WORKFLOWS')
    this.log('═'.repeat(60))

    // Test 1: Complete authentication workflow
    this.log('\n🎯 Testing Complete Authentication Workflow')
    
    // Login as staff
    const staffUser = await this.authenticateWithCode(this.hospitalCodes[0])
    if (staffUser) {
      this.logTest(
        'Staff login workflow',
        true,
        `Staff ${staffUser.name} logged in successfully`
      )
      
      // Verify token
      const verifyResponse = await this.makeRequest('/api/auth/verify')
      const verifyData = await verifyResponse.json()
      
      this.logTest(
        'Staff token verification',
        verifyResponse.ok && verifyData.success,
        `Token valid for ${verifyData.user?.name}`
      )
      
      // Access staff data
      const staffDataResponse = await this.makeRequest('/api/staff')
      const staffData = await staffDataResponse.json()
      
      this.logTest(
        'Staff data access',
        staffDataResponse.ok && staffData.success,
        `Can access ${staffData.staff?.length || 0} staff records`
      )
      
      // Logout
      const logoutResponse = await this.makeRequest('/api/auth/logout', {
        method: 'POST'
      })
      
      this.logTest(
        'Staff logout',
        logoutResponse.ok,
        `Logout status: ${logoutResponse.status}`
      )
      
      // Verify logout
      const postLogoutVerify = await this.makeRequest('/api/auth/verify')
      
      this.logTest(
        'Post-logout verification',
        postLogoutVerify.status === 401,
        `Status after logout: ${postLogoutVerify.status}`
      )
    }

    // Test 2: Manager workflow
    this.log('\n👨‍💼 Testing Manager Workflow')
    
    const managerUser = await this.authenticateWithCode(this.managerCodes[0])
    if (managerUser) {
      this.logTest(
        'Manager login workflow',
        true,
        `Manager ${managerUser.name} logged in successfully`
      )
      
      // Test manager-specific endpoints
      const hospitalsResponse = await this.makeRequest('/api/hospitals')
      const hospitalsData = await hospitalsResponse.json()
      
      this.logTest(
        'Manager hospital access',
        hospitalsResponse.ok && hospitalsData.success,
        `Manager can access ${hospitalsData.hospitals?.length || 0} hospitals`
      )
    }
  }

  async testSecurityAndPerformance() {
    this.log('\n🔒 SECURITY AND PERFORMANCE TESTING')
    this.log('═'.repeat(60))

    // Test 1: Unauthenticated access
    this.authCookies.clear()
    this.authenticatedUser = null
    
    const protectedEndpoints = [
      '/api/staff',
      '/api/shifts',
      '/api/reservations',
      '/api/swaps'
    ]
    
    for (const endpoint of protectedEndpoints) {
      try {
        const response = await this.makeRequest(endpoint)
        
        this.logTest(
          `Unauthenticated access to ${endpoint}`,
          response.status === 401 || response.status === 403,
          `Status: ${response.status}`
        )
      } catch (error) {
        this.logTest(
          `Unauthenticated access to ${endpoint}`,
          false,
          error.message
        )
      }
    }

    // Test 2: Performance testing
    const user = await this.authenticateWithCode(this.hospitalCodes[0])
    if (user) {
      const performanceTests = [
        { endpoint: '/api/staff', name: 'Staff API' },
        { endpoint: '/api/hospitals', name: 'Hospitals API' },
        { endpoint: '/api/auth/verify', name: 'Auth Verify' }
      ]
      
      for (const test of performanceTests) {
        const times = []
        const successCount = { success: 0, failed: 0 }
        
        for (let i = 0; i < 5; i++) {
          const start = Date.now()
          try {
            const response = await this.makeRequest(test.endpoint)
            const duration = Date.now() - start
            times.push(duration)
            
            if (response.ok) {
              successCount.success++
            } else {
              successCount.failed++
            }
          } catch (error) {
            successCount.failed++
          }
        }
        
        const avgTime = times.reduce((a, b) => a + b, 0) / times.length
        const maxTime = Math.max(...times)
        
        this.logTest(
          `${test.name} performance`,
          avgTime < 2000 && maxTime < 5000,
          `Avg: ${avgTime.toFixed(0)}ms, Max: ${maxTime}ms, Success: ${successCount.success}/5`
        )
      }
    }
  }

  generateDetailedReport() {
    this.log('\n📈 DETAILED TEST REPORT')
    this.log('═'.repeat(60))
    
    const totalTests = this.testsPassed + this.testsFailed
    const successRate = totalTests > 0 ? Math.round((this.testsPassed / totalTests) * 100) : 0
    
    this.log(`✅ Tests Passed: ${this.testsPassed}`)
    this.log(`❌ Tests Failed: ${this.testsFailed}`)
    this.log(`📊 Total Tests: ${totalTests}`)
    this.log(`🎯 Success Rate: ${successRate}%`)
    
    // Critical issues
    const criticalIssues = this.testResults.filter(r => 
      !r.passed && (
        r.name.includes('SQL injection') ||
        r.name.includes('Authentication') ||
        r.name.includes('Unauthenticated access')
      )
    )
    
    if (criticalIssues.length > 0) {
      this.log('\n🚨 CRITICAL SECURITY ISSUES')
      this.log('─'.repeat(40))
      criticalIssues.forEach(issue => {
        this.log(`• ${issue.name}: ${issue.details}`)
      })
    }
    
    // Performance issues
    const performanceIssues = this.testResults.filter(r => 
      !r.passed && r.name.includes('performance')
    )
    
    if (performanceIssues.length > 0) {
      this.log('\n⚡ PERFORMANCE ISSUES')
      this.log('─'.repeat(40))
      performanceIssues.forEach(issue => {
        this.log(`• ${issue.name}: ${issue.details}`)
      })
    }
    
    // Recommendations
    this.log('\n💡 RECOMMENDATIONS')
    this.log('─'.repeat(40))
    
    const failedTests = this.testResults.filter(r => !r.passed)
    
    if (failedTests.some(t => t.name.includes('Reservations API'))) {
      this.log('• Fix the reservations table/database schema issue')
    }
    
    if (failedTests.some(t => t.name.includes('Shifts API'))) {
      this.log('• Consider making year/month parameters optional with defaults')
    }
    
    if (failedTests.some(t => t.name.includes('MGR103'))) {
      this.log('• Check if MGR103 manager code exists in the database')
    }
    
    if (failedTests.some(t => t.name.includes('Malformed JSON'))) {
      this.log('• Add better JSON parsing error handling')
    }
    
    // Overall assessment
    this.log('\n🎯 OVERALL ASSESSMENT')
    this.log('─'.repeat(40))
    
    if (criticalIssues.length > 0) {
      this.log('🚨 CRITICAL: Security vulnerabilities detected!')
    } else if (this.testsFailed === 0) {
      this.log('🎉 EXCELLENT: All tests passed!')
    } else if (successRate >= 90) {
      this.log('✅ GOOD: Minor issues detected, core functionality works')
    } else if (successRate >= 75) {
      this.log('⚠️ FAIR: Several issues need attention')
    } else {
      this.log('❌ POOR: Major issues detected, needs immediate attention')
    }

    return {
      totalTests,
      passed: this.testsPassed,
      failed: this.testsFailed,
      successRate,
      criticalIssues,
      performanceIssues,
      failedTests
    }
  }

  async runEnhancedTests() {
    this.log('🚀 STARTING ENHANCED API TEST SUITE')
    this.log(`🌐 Target: ${this.baseURL}`)
    this.log('═'.repeat(60))

    const startTime = Date.now()

    try {
      await this.testEnhancedAuthentication()
      await this.testEnhancedDataEndpoints()
      await this.testCriticalWorkflows()
      await this.testSecurityAndPerformance()

      const endTime = Date.now()
      const duration = ((endTime - startTime) / 1000).toFixed(2)

      this.log(`\n⏱️ Tests completed in ${duration} seconds`)
      
      return this.generateDetailedReport()
    } catch (error) {
      this.log(`Critical error during test execution: ${error.message}`, 'error')
      throw error
    }
  }
}

// Main execution
async function main() {
  const tester = new EnhancedAPITester()
  
  try {
    const report = await tester.runEnhancedTests()
    
    // Exit with appropriate code
    process.exit(report.failed > 0 ? 1 : 0)
  } catch (error) {
    console.error('❌ Enhanced test suite failed:', error)
    process.exit(1)
  }
}

// Run if called directly
if (require.main === module) {
  main()
}

module.exports = { EnhancedAPITester }