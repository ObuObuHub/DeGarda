import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

// Read .env.local manually
const envFile = readFileSync('.env.local', 'utf-8')
const envVars: Record<string, string> = {}
envFile.split('\n').forEach(line => {
  const [key, ...valueParts] = line.split('=')
  if (key && valueParts.length) {
    envVars[key.trim()] = valueParts.join('=').trim()
  }
})

const supabaseUrl = envVars.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, supabaseKey)

const HOSPITAL_NAME = 'Spitalul Județean de Urgență Piatra-Neamț'
const DEPARTMENT_NAME = 'Laboratorul de Analize Medicale'

const staffMembers = [
  'Biol. Aflorei Magda Elena',
  'Dr. Dobrea Letiția',
  'Dr. Manole Anca',
  'Dr. Gîlea Arina',
  'Dr. Ciorsac Alina',
  'Dr. Gradinariu Cristina',
  'Ch. Dobre Liliana Gabriela',
  'Dr. Chiper Lefferman Andrei',
  'Dr. Constantinescu Raluca',
  'Dr. Zugun Eduard'
]

function generatePersonalCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase()
}

async function main() {
  console.log('Starting staff import...')

  // 1. Get or create hospital
  let { data: hospital } = await supabase
    .from('hospitals')
    .select('id')
    .eq('name', HOSPITAL_NAME)
    .single()

  if (!hospital) {
    console.log('Creating hospital:', HOSPITAL_NAME)
    const { data: newHospital, error } = await supabase
      .from('hospitals')
      .insert({ name: HOSPITAL_NAME })
      .select('id')
      .single()

    if (error) {
      console.error('Failed to create hospital:', error)
      return
    }
    hospital = newHospital
  }

  console.log('Hospital ID:', hospital.id)

  // 2. Get or create department
  let { data: department } = await supabase
    .from('departments')
    .select('id')
    .eq('name', DEPARTMENT_NAME)
    .eq('hospital_id', hospital.id)
    .single()

  if (!department) {
    console.log('Creating department:', DEPARTMENT_NAME)
    const { data: newDepartment, error } = await supabase
      .from('departments')
      .insert({
        name: DEPARTMENT_NAME,
        hospital_id: hospital.id,
        color: '#3B82F6', // Blue
        is_active: true
      })
      .select('id')
      .single()

    if (error) {
      console.error('Failed to create department:', error)
      return
    }
    department = newDepartment
  }

  console.log('Department ID:', department.id)

  // 3. Create default shift type if not exists
  let { data: shiftType } = await supabase
    .from('shift_types')
    .select('id')
    .eq('hospital_id', hospital.id)
    .eq('is_default', true)
    .single()

  if (!shiftType) {
    console.log('Creating default shift type')
    const { data: newShiftType, error } = await supabase
      .from('shift_types')
      .insert({
        name: 'Gardă 24h',
        hospital_id: hospital.id,
        start_time: '08:00:00',
        end_time: '08:00:00',
        duration_hours: 24,
        is_default: true
      })
      .select('id')
      .single()

    if (error) {
      console.error('Failed to create shift type:', error)
      return
    }
    shiftType = newShiftType
  }

  // 4. Insert staff members
  console.log('\nAdding staff members:')

  for (const name of staffMembers) {
    // Check if user already exists
    const { data: existing } = await supabase
      .from('users')
      .select('id')
      .eq('name', name)
      .eq('hospital_id', hospital.id)
      .single()

    if (existing) {
      console.log(`  - ${name} (already exists)`)
      continue
    }

    const personalCode = generatePersonalCode()

    const { error } = await supabase
      .from('users')
      .insert({
        name,
        personal_code: personalCode,
        role: 'STAFF',
        hospital_id: hospital.id,
        department: DEPARTMENT_NAME,
        max_shifts_per_month: 8
      })

    if (error) {
      console.error(`  - ${name} FAILED:`, error.message)
    } else {
      console.log(`  - ${name} (code: ${personalCode})`)
    }
  }

  console.log('\nDone!')
}

main().catch(console.error)
