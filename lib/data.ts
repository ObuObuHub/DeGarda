export interface Hospital {
  id: string
  name: string
  city: string
  departments?: number
  staff?: number
}

export interface StaffMember {
  id: string
  name: string
  email: string
  type: 'medic' | 'biolog' | 'chimist' | 'asistent'
  specialization: string
  hospitalId: string
  role: 'admin' | 'manager' | 'staff'
}

export const hospitals: Hospital[] = [
  {
    id: '1',
    name: 'Spitalul Județean de Urgență Piatra-Neamț',
    city: 'Piatra-Neamț',
    departments: 8,
    staff: 45
  },
  {
    id: '2',
    name: 'Spitalul "Prof. Dr. Eduard Apetrei" Buhuși',
    city: 'Buhuși',
    departments: 5,
    staff: 28
  }
]

export const staff: StaffMember[] = [
  {
    id: '1',
    name: 'Dr. Zugun Eduard',
    email: 'zugun.eduard@degarda.ro',
    type: 'medic',
    specialization: 'Laborator',
    hospitalId: '1',
    role: 'staff'
  },
  {
    id: '2',
    name: 'Dr. Gîlea Arina',
    email: 'gilea.arina@degarda.ro',
    type: 'medic',
    specialization: 'Laborator',
    hospitalId: '1',
    role: 'staff'
  },
  {
    id: '3',
    name: 'Dr. Manole Anca',
    email: 'manole.anca@degarda.ro',
    type: 'medic',
    specialization: 'Laborator',
    hospitalId: '1',
    role: 'staff'
  },
  {
    id: '4',
    name: 'Biol. Alforei Magda Elena',
    email: 'alforei.magda@degarda.ro',
    type: 'biolog',
    specialization: 'Laborator',
    hospitalId: '1',
    role: 'staff'
  },
  {
    id: '5',
    name: 'Dr. Rusica Iovu Elena',
    email: 'rusica.elena@degarda.ro',
    type: 'medic',
    specialization: 'Laborator',
    hospitalId: '1',
    role: 'staff'
  },
  {
    id: '6',
    name: 'Dr. Grădinariu Cristina',
    email: 'gradinariu.cristina@degarda.ro',
    type: 'medic',
    specialization: 'Laborator',
    hospitalId: '1',
    role: 'staff'
  },
  {
    id: '7',
    name: 'Dr. Ciorsac Alina',
    email: 'ciorsac.alina@degarda.ro',
    type: 'medic',
    specialization: 'Laborator',
    hospitalId: '1',
    role: 'staff'
  },
  {
    id: '8',
    name: 'Dr. Constantinescu Raluca',
    email: 'constantinescu.raluca@degarda.ro',
    type: 'medic',
    specialization: 'Laborator',
    hospitalId: '1',
    role: 'staff'
  },
  {
    id: '9',
    name: 'Dr. Dobrea Letiția',
    email: 'dobrea.letitia@degarda.ro',
    type: 'medic',
    specialization: 'Laborator',
    hospitalId: '1',
    role: 'staff'
  },
  {
    id: '10',
    name: 'Ch. Dobre Liliana Gabriela',
    email: 'dobre.liliana@degarda.ro',
    type: 'chimist',
    specialization: 'Laborator',
    hospitalId: '1',
    role: 'staff'
  },
  {
    id: '11',
    name: 'Dr. Chiper Leferman Andrei',
    email: 'chiper.andrei@degarda.ro',
    type: 'medic',
    specialization: 'Laborator',
    hospitalId: '1',
    role: 'staff'
  }
]