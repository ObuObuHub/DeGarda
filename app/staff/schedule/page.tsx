'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Calendar } from '@/components/Calendar'
import { useHospital } from '@/contexts/HospitalContext'
import { useData } from '@/contexts/DataContext'
import { showToast } from '@/components/Toast'

export default function StaffSchedulePage() {
  const router = useRouter()
  const { selectedHospitalId, selectedHospital } = useHospital()
  const { shifts, isLoading, loadShifts } = useData()
  
  const [currentStaffId, setCurrentStaffId] = useState<string | null>(null)
  const [currentStaffName, setCurrentStaffName] = useState<string | null>(null)
  const [currentStaffDepartment, setCurrentStaffDepartment] = useState<string | null>(null)
  const [myReservations, setMyReservations] = useState<any[]>([])
  const [isLoadingReservations, setIsLoadingReservations] = useState(false)
  
  const currentDate = new Date()
  const [viewMonth, setViewMonth] = useState(currentDate.getMonth())
  const [viewYear, setViewYear] = useState(currentDate.getFullYear())

  useEffect(() => {
    // Get staff info from session
    const staffId = sessionStorage.getItem('currentStaffId')
    const staffName = sessionStorage.getItem('currentStaffName')
    const staffDepartment = sessionStorage.getItem('currentStaffDepartment')
    
    if (!staffId || !selectedHospitalId) {
      router.push('/staff')
      return
    }
    
    setCurrentStaffId(staffId)
    setCurrentStaffName(staffName)
    setCurrentStaffDepartment(staffDepartment)
  }, [selectedHospitalId, router])

  useEffect(() => {
    if (selectedHospitalId && currentStaffId) {
      loadShifts(viewYear, viewMonth, selectedHospitalId)
      loadMyReservations()
    }
  }, [viewYear, viewMonth, selectedHospitalId, currentStaffId, loadShifts])

  const loadMyReservations = async () => {
    if (!currentStaffId) return
    
    setIsLoadingReservations(true)
    try {
      const response = await fetch(`/api/reservations?staffId=${currentStaffId}&month=${viewMonth + 1}&year=${viewYear}`)
      const data = await response.json()
      
      if (data.success) {
        setMyReservations(data.reservations || [])
      }
    } catch (error) {
      console.error('Failed to load reservations:', error)
      showToast('error', 'Eroare', 'Nu s-au putut încărca rezervările')
    } finally {
      setIsLoadingReservations(false)
    }
  }

  const handleDayClick = async (date: string) => {
    if (!currentStaffId) return
    
    const shift = shifts[date]
    
    // Check if this is already assigned
    if (shift && shift.doctorId) {
      if (shift.doctorId === currentStaffId) {
        // This is my shift, can request swap
        showToast('info', 'Garda ta', 'Poți solicita un schimb pentru această gardă')
      } else {
        showToast('warning', 'Gardă ocupată', 'Această gardă este deja atribuită')
      }
      return
    }
    
    // Check if I already have 3 reservations this month
    if (myReservations.length >= 3) {
      showToast('error', 'Limită atinsă', 'Poți rezerva maxim 3 gărzi pe lună')
      return
    }
    
    // Check if already reserved
    const existingReservation = myReservations.find(r => r.shift_date === date)
    
    if (existingReservation) {
      // Cancel reservation
      try {
        const response = await fetch(`/api/reservations?staffId=${currentStaffId}&shiftDate=${date}`, {
          method: 'DELETE'
        })
        
        if (response.ok) {
          await loadMyReservations() // Reload reservations
          showToast('success', 'Rezervare anulată', 'Rezervarea a fost anulată')
        } else {
          const data = await response.json()
          showToast('error', 'Eroare', data.error || 'Nu s-a putut anula rezervarea')
        }
      } catch (error) {
        console.error('Failed to cancel reservation:', error)
        showToast('error', 'Eroare', 'Nu s-a putut anula rezervarea')
      }
    } else {
      // Make reservation
      try {
        const response = await fetch('/api/reservations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            staffId: currentStaffId,
            shiftDate: date,
            department: currentStaffDepartment
          })
        })
        
        const data = await response.json()
        
        if (data.success) {
          await loadMyReservations() // Reload reservations
          showToast('success', 'Rezervare confirmată', 'Garda a fost rezervată pentru tine')
        } else {
          showToast('error', 'Eroare', data.error || 'Nu s-a putut crea rezervarea')
        }
      } catch (error) {
        console.error('Failed to create reservation:', error)
        showToast('error', 'Eroare', 'Nu s-a putut crea rezervarea')
      }
    }
  }

  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11)
      setViewYear(viewYear - 1)
    } else {
      setViewMonth(viewMonth - 1)
    }
  }

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0)
      setViewYear(viewYear + 1)
    } else {
      setViewMonth(viewMonth + 1)
    }
  }

  const handleLogout = () => {
    sessionStorage.removeItem('currentStaffId')
    sessionStorage.removeItem('currentStaffName')
    sessionStorage.removeItem('currentStaffDepartment')
    router.push('/staff')
  }

  // Enhance shifts with reservation info
  const enhancedShifts = { ...shifts }
  myReservations.forEach(reservation => {
    const date = reservation.shift_date
    if (!enhancedShifts[date]) {
      enhancedShifts[date] = {
        id: `reservation_${reservation.id}`,
        date,
        status: 'reserved',
        reservedBy: currentStaffId,
        reservedByName: currentStaffName,
        doctorId: null,
        doctorName: null,
        department: reservation.department
      }
    }
  })

  return (
    <div className="p-4 lg:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-8">
          <div>
            <h1 className="text-xl lg:text-2xl font-bold text-label-primary">
              Programul Meu
            </h1>
            <p className="text-label-secondary text-sm mt-1">
              {currentStaffName} • {currentStaffDepartment} • {selectedHospital?.name}
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={handleLogout}>
            Ieși
          </Button>
        </div>

        {/* Info Card */}
        <Card className="p-4 mb-6 bg-system-blue/5 border-system-blue/20">
          <h3 className="font-medium text-system-blue mb-2">Cum funcționează?</h3>
          <ul className="text-sm text-label-secondary space-y-1">
            <li>• Click pe o zi liberă pentru a rezerva o gardă</li>
            <li>• Poți rezerva maxim 3 gărzi pe lună</li>
            <li>• Click pe o rezervare pentru a o anula</li>
            <li>• Rezervările vor fi luate în considerare la generarea programului</li>
          </ul>
        </Card>

        {/* Calendar */}
        <Card className="p-6">
          {/* Month Navigation */}
          <div className="flex justify-between items-center mb-6">
            <Button variant="ghost" size="sm" onClick={handlePrevMonth} icon="chevronLeft">
              <span className="sr-only">Luna anterioară</span>
            </Button>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={() => {
                setViewMonth(currentDate.getMonth())
                setViewYear(currentDate.getFullYear())
              }}>
                Azi
              </Button>
            </div>
            <Button variant="ghost" size="sm" onClick={handleNextMonth} icon="chevronRight">
              <span className="sr-only">Luna următoare</span>
            </Button>
          </div>

          {isLoading ? (
            <div className="text-center py-8 text-label-tertiary">
              Se încarcă programul...
            </div>
          ) : (
            <Calendar
              year={viewYear}
              month={viewMonth}
              shifts={enhancedShifts}
              onDayClick={handleDayClick}
            />
          )}
        </Card>

        {/* My Stats */}
        <Card className="mt-6 p-4">
          <h3 className="font-semibold mb-3">Statisticile mele luna aceasta</h3>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-label-secondary">Gărzi atribuite</p>
              <p className="text-xl font-bold">
                {Object.values(shifts).filter(s => s.doctorId === currentStaffId).length}
              </p>
            </div>
            <div>
              <p className="text-label-secondary">Rezervări active</p>
              <p className="text-xl font-bold text-system-blue">
                {myReservations.length}
              </p>
            </div>
            <div>
              <p className="text-label-secondary">Rezervări disponibile</p>
              <p className="text-xl font-bold text-system-green">
                {3 - myReservations.length}
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}