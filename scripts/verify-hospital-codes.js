#!/usr/bin/env node

/**
 * Hospital Access Code Verification Script
 * 
 * This script verifies that hospital access codes are properly configured
 * and tests the authentication flow for each hospital.
 * 
 * Expected access codes: LAB, BUH1, BUH2
 * 
 * Usage: node scripts/verify-hospital-codes.js
 */

const { neon } = require('@neondatabase/serverless');
// Load environment variables from .env.local
require('dotenv').config({ path: '.env.local' });

const REQUIRED_CODES = ['LAB', 'BUH1', 'BUH2'];
const AUTH_ENDPOINT = 'http://localhost:3000/api/auth/access-code';

class HospitalCodeVerifier {
  constructor() {
    this.sql = null;
    this.issues = [];
    this.results = {
      database: {
        connected: false,
        hasAccessCodeColumn: false,
        hospitalsFound: 0,
        accessCodes: []
      },
      authentication: {
        endpointAvailable: false,
        codesWorking: {},
        staffAssigned: {}
      }
    };
  }

  async initialize() {
    const DATABASE_URL = process.env.DATABASE_URL;
    
    if (!DATABASE_URL) {
      throw new Error('DATABASE_URL environment variable is not set');
    }

    this.sql = neon(DATABASE_URL);
    
    try {
      await this.sql`SELECT 1`;
      this.results.database.connected = true;
      console.log('✅ Database connection successful');
    } catch (error) {
      throw new Error(`Database connection failed: ${error.message}`);
    }
  }

  async checkDatabaseStructure() {
    console.log('\n🔍 Checking database structure...');
    
    // Check if hospitals table has access_code column
    try {
      const columns = await this.sql`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'hospitals' 
        AND column_name = 'access_code'
      `;
      
      if (columns.length === 0) {
        this.issues.push('❌ CRITICAL: hospitals table missing access_code column');
        console.log('❌ hospitals table missing access_code column');
        return false;
      }
      
      this.results.database.hasAccessCodeColumn = true;
      console.log('✅ hospitals table has access_code column');
    } catch (error) {
      this.issues.push(`❌ Error checking table structure: ${error.message}`);
      return false;
    }

    return true;
  }

  async checkHospitalAccessCodes() {
    console.log('\n🏥 Checking hospital access codes...');
    
    try {
      const hospitals = await this.sql`
        SELECT id, name, city, access_code
        FROM hospitals
        ORDER BY id
      `;
      
      this.results.database.hospitalsFound = hospitals.length;
      
      if (hospitals.length === 0) {
        this.issues.push('❌ No hospitals found in database');
        console.log('❌ No hospitals found in database');
        return false;
      }
      
      console.log(`✅ Found ${hospitals.length} hospitals:`);
      
      for (const hospital of hospitals) {
        const accessCode = hospital.access_code || 'NULL';
        this.results.database.accessCodes.push({
          id: hospital.id,
          name: hospital.name,
          city: hospital.city,
          accessCode: accessCode
        });
        
        console.log(`   [${hospital.id}] ${hospital.name} (${hospital.city}) - Code: ${accessCode}`);
        
        if (!hospital.access_code) {
          this.issues.push(`❌ Hospital "${hospital.name}" has no access code`);
        }
      }
      
      // Check for required codes
      const foundCodes = hospitals.map(h => h.access_code).filter(Boolean);
      
      for (const requiredCode of REQUIRED_CODES) {
        if (!foundCodes.includes(requiredCode)) {
          this.issues.push(`❌ Missing required access code: ${requiredCode}`);
        }
      }
      
      return true;
    } catch (error) {
      this.issues.push(`❌ Error checking hospitals: ${error.message}`);
      return false;
    }
  }

  async checkStaffAssignment() {
    console.log('\n👥 Checking staff assignment to hospitals...');
    
    try {
      const hospitalStaff = await this.sql`
        SELECT 
          h.id as hospital_id,
          h.name as hospital_name,
          h.access_code,
          COUNT(s.id) as staff_count,
          COUNT(CASE WHEN s.role = 'staff' AND s.is_active = true THEN 1 END) as active_staff_count
        FROM hospitals h
        LEFT JOIN staff s ON h.id = s.hospital_id
        GROUP BY h.id, h.name, h.access_code
        ORDER BY h.id
      `;
      
      for (const hospital of hospitalStaff) {
        const staffCount = parseInt(hospital.staff_count || 0);
        const activeStaffCount = parseInt(hospital.active_staff_count || 0);
        
        this.results.authentication.staffAssigned[hospital.access_code] = {
          total: staffCount,
          active: activeStaffCount
        };
        
        console.log(`   ${hospital.hospital_name} (${hospital.access_code}): ${activeStaffCount} active staff / ${staffCount} total`);
        
        if (hospital.access_code && activeStaffCount === 0) {
          this.issues.push(`❌ Hospital with code "${hospital.access_code}" has no active staff members`);
        }
      }
      
      return true;
    } catch (error) {
      this.issues.push(`❌ Error checking staff assignment: ${error.message}`);
      return false;
    }
  }

  async testAuthenticationEndpoint() {
    console.log('\n🔐 Testing authentication endpoint...');
    
    // Check if fetch is available (Node.js 18+)
    if (typeof fetch === 'undefined') {
      console.log('⚠️  Fetch not available, skipping authentication endpoint test');
      console.log('   (To test authentication, ensure Node.js 18+ and server is running)');
      return true;
    }
    
    // Check if endpoint is available
    try {
      const response = await fetch(AUTH_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ accessCode: 'INVALID_CODE' })
      });
      
      if (response.status === 404) {
        this.issues.push('❌ Authentication endpoint not found');
        console.log('❌ Authentication endpoint not found');
        return false;
      }
      
      this.results.authentication.endpointAvailable = true;
      console.log('✅ Authentication endpoint is available');
    } catch (error) {
      this.issues.push(`❌ Cannot reach authentication endpoint: ${error.message}`);
      console.log(`❌ Cannot reach authentication endpoint: ${error.message}`);
      console.log('   (Make sure the development server is running: npm run dev)');
      return false;
    }
    
    // Test each access code
    for (const code of REQUIRED_CODES) {
      try {
        const response = await fetch(AUTH_ENDPOINT, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ accessCode: code })
        });
        
        const data = await response.json();
        
        if (response.ok && data.success) {
          this.results.authentication.codesWorking[code] = true;
          console.log(`✅ Access code "${code}" works - authenticated as ${data.user.name}`);
        } else {
          this.results.authentication.codesWorking[code] = false;
          console.log(`❌ Access code "${code}" failed: ${data.error || 'Unknown error'}`);
          this.issues.push(`❌ Access code "${code}" authentication failed`);
        }
      } catch (error) {
        this.results.authentication.codesWorking[code] = false;
        this.issues.push(`❌ Error testing access code "${code}": ${error.message}`);
        console.log(`❌ Error testing access code "${code}": ${error.message}`);
      }
    }
    
    return true;
  }

  async generateReport() {
    console.log('\n📊 HOSPITAL ACCESS CODE VERIFICATION REPORT');
    console.log('=' .repeat(60));
    
    // Database Status
    console.log('\n🗄️  DATABASE STATUS:');
    console.log(`   Connection: ${this.results.database.connected ? '✅ Connected' : '❌ Failed'}`);
    console.log(`   Access Code Column: ${this.results.database.hasAccessCodeColumn ? '✅ Present' : '❌ Missing'}`);
    console.log(`   Hospitals Found: ${this.results.database.hospitalsFound}`);
    
    // Access Codes
    console.log('\n🔑 ACCESS CODES:');
    if (this.results.database.accessCodes.length > 0) {
      for (const hospital of this.results.database.accessCodes) {
        console.log(`   ${hospital.name}: ${hospital.accessCode}`);
      }
    } else {
      console.log('   ❌ No access codes found');
    }
    
    // Required Codes Status
    console.log('\n📋 REQUIRED CODES STATUS:');
    const foundCodes = this.results.database.accessCodes.map(h => h.accessCode).filter(code => code !== 'NULL');
    
    for (const requiredCode of REQUIRED_CODES) {
      const found = foundCodes.includes(requiredCode);
      const working = this.results.authentication.codesWorking[requiredCode];
      const staffInfo = this.results.authentication.staffAssigned[requiredCode];
      
      console.log(`   ${requiredCode}: ${found ? '✅ Found' : '❌ Missing'} | Auth: ${working ? '✅ Working' : '❌ Failed'} | Staff: ${staffInfo ? `${staffInfo.active} active` : 'N/A'}`);
    }
    
    // Authentication Status
    console.log('\n🔐 AUTHENTICATION STATUS:');
    console.log(`   Endpoint Available: ${this.results.authentication.endpointAvailable ? '✅ Yes' : '❌ No'}`);
    
    const workingCodes = Object.entries(this.results.authentication.codesWorking).filter(([_, working]) => working).length;
    const totalCodes = REQUIRED_CODES.length;
    console.log(`   Working Codes: ${workingCodes}/${totalCodes}`);
    
    // Issues Summary
    console.log('\n⚠️  ISSUES FOUND:');
    if (this.issues.length === 0) {
      console.log('   ✅ No issues found - all systems working correctly!');
    } else {
      for (const issue of this.issues) {
        console.log(`   ${issue}`);
      }
    }
    
    // Recommendations
    console.log('\n💡 RECOMMENDATIONS:');
    
    if (!this.results.database.hasAccessCodeColumn) {
      console.log('   1. Run migration 009_add_hospital_access_codes.sql to add access_code column');
    }
    
    if (this.results.database.hospitalsFound === 0) {
      console.log('   2. Run database seeder to populate hospitals table');
    }
    
    const missingCodes = REQUIRED_CODES.filter(code => !foundCodes.includes(code));
    if (missingCodes.length > 0) {
      console.log('   3. Add missing access codes:');
      for (const code of missingCodes) {
        console.log(`      UPDATE hospitals SET access_code = '${code}' WHERE id = ?;`);
      }
    }
    
    const codesWithoutStaff = Object.entries(this.results.authentication.staffAssigned)
      .filter(([code, staff]) => staff && staff.active === 0)
      .map(([code]) => code);
      
    if (codesWithoutStaff.length > 0) {
      console.log('   4. Assign active staff to hospitals with codes:', codesWithoutStaff.join(', '));
    }
    
    if (!this.results.authentication.endpointAvailable) {
      console.log('   5. Start the development server (npm run dev) to test authentication');
    }
    
    console.log('\n' + '=' .repeat(60));
    
    return this.issues.length === 0;
  }

  async run() {
    try {
      console.log('🚀 Starting Hospital Access Code Verification...');
      
      await this.initialize();
      
      const structureOk = await this.checkDatabaseStructure();
      if (!structureOk) {
        await this.generateReport();
        return false;
      }
      
      await this.checkHospitalAccessCodes();
      await this.checkStaffAssignment();
      await this.testAuthenticationEndpoint();
      
      const allGood = await this.generateReport();
      return allGood;
      
    } catch (error) {
      console.error('❌ Verification failed:', error.message);
      return false;
    }
  }
}

// Run the verification
if (require.main === module) {
  const verifier = new HospitalCodeVerifier();
  verifier.run().then(success => {
    process.exit(success ? 0 : 1);
  }).catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = HospitalCodeVerifier;