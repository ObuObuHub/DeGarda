'use client'

import { Card } from '@/components/ui/Card'

interface Hospital {
  id: number
  name: string
  city: string
}

interface StaffMember {
  id: number
  name: string
  access_code: string
  role: string
  hospital_id: number
}

interface AccessCodeSummaryProps {
  hospitals: Hospital[]
  staff: StaffMember[]
}

export function AccessCodeSummary({ hospitals, staff }: AccessCodeSummaryProps) {
  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Access Code Summary</h1>
        <div className="text-sm text-gray-600">
          Total Access Codes: {staff.length}
        </div>
      </div>

      {/* Hospital Cards with Access Codes */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {hospitals.map((hospital) => {
          const hospitalStaff = staff.filter(s => s.hospital_id === hospital.id)
          return (
            <Card key={hospital.id} className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <span className="text-xl">🏥</span>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{hospital.name}</h3>
                  <p className="text-sm text-gray-600">{hospital.city}</p>
                </div>
              </div>
              
              <div className="space-y-3">
                {hospitalStaff.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-4">No staff members</p>
                ) : (
                  <>
                    <div className="flex justify-between text-xs text-gray-500 font-medium">
                      <span>Staff ({hospitalStaff.length})</span>
                      <span>Access Code</span>
                    </div>
                    {hospitalStaff.map(member => (
                      <div key={member.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                        <div>
                          <div className="font-medium text-sm">{member.name}</div>
                          <div className="text-xs text-gray-500 capitalize">{member.role}</div>
                        </div>
                        <div className="font-mono text-sm bg-white px-2 py-1 rounded border">
                          {member.access_code}
                        </div>
                      </div>
                    ))}
                  </>
                )}
              </div>
              
              {hospitalStaff.length > 0 && (
                <div className="mt-4 pt-3 border-t border-gray-200">
                  <div className="flex justify-between text-xs text-gray-600">
                    <span>Managers:</span>
                    <span>{hospitalStaff.filter(s => s.role === 'manager').length}</span>
                  </div>
                  <div className="flex justify-between text-xs text-gray-600">
                    <span>Staff:</span>
                    <span>{hospitalStaff.filter(s => s.role === 'staff').length}</span>
                  </div>
                </div>
              )}
            </Card>
          )
        })}
      </div>

      {/* Quick Stats */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4 text-center">
          <div className="text-2xl font-bold text-blue-600">{hospitals.length}</div>
          <div className="text-sm text-gray-600">Total Hospitals</div>
        </Card>
        <Card className="p-4 text-center">
          <div className="text-2xl font-bold text-green-600">{staff.length}</div>
          <div className="text-sm text-gray-600">Total Staff</div>
        </Card>
        <Card className="p-4 text-center">
          <div className="text-2xl font-bold text-purple-600">
            {staff.filter(s => s.role === 'manager').length}
          </div>
          <div className="text-sm text-gray-600">Managers</div>
        </Card>
        <Card className="p-4 text-center">
          <div className="text-2xl font-bold text-orange-600">
            {staff.filter(s => s.role === 'staff').length}
          </div>
          <div className="text-sm text-gray-600">Staff Members</div>
        </Card>
      </div>
    </div>
  )
}