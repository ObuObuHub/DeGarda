import { describe, test, expect } from '@jest/globals'
import { render, fireEvent } from '@testing-library/react'
import Calendar from '../Calendar'
import React from 'react'

describe('Calendar - Shift Reservation', () => {
  test('clicking available shift calls onReserveShift with shift id', () => {
    // Test data
    const mockOnReserveShift = jest.fn()
    const testShift = {
      id: 'shift-123',
      shift_date: '2025-02-01',
      department: 'Security',
      status: 'available',
      assigned_to: null,
      user: null
    }
    
    const currentUser = {
      id: 'user-1',
      name: 'Test User',
      role: 'STAFF'
    }
    
    // Render component
    const { getByText } = render(
      <Calendar
        shifts={[testShift]}
        unavailableDates={[]}
        onReserveShift={mockOnReserveShift}
        onCancelShift={jest.fn()}
        onMarkUnavailable={jest.fn()}
        onRemoveUnavailable={jest.fn()}
        currentUser={currentUser}
        selectedDate={new Date('2025-02-01')}
        onDateChange={jest.fn()}
      />
    )
    
    // Find and click the shift
    const shiftElement = getByText('Liber')
    fireEvent.click(shiftElement)
    
    // Find and click reserve option
    const reserveButton = getByText('📌 Rezervă tura')
    fireEvent.click(reserveButton)
    
    // Verify onReserveShift was called
    expect(mockOnReserveShift).toHaveBeenCalledWith('shift-123')
  })
})

describe('Calendar - Shift Cancellation', () => {
  test('clicking own shift calls onCancelShift with shift id', () => {
    // Test data
    const mockOnCancelShift = jest.fn()
    const testShift = {
      id: 'shift-456',
      shift_date: '2025-02-01',
      department: 'Security',
      status: 'reserved',
      assigned_to: 'user-1',
      user: {
        id: 'user-1',
        name: 'Test User'
      }
    }
    
    const currentUser = {
      id: 'user-1',
      name: 'Test User',
      role: 'STAFF'
    }
    
    // Render component
    const { getByText } = render(
      <Calendar
        shifts={[testShift]}
        unavailableDates={[]}
        onReserveShift={jest.fn()}
        onCancelShift={mockOnCancelShift}
        onMarkUnavailable={jest.fn()}
        onRemoveUnavailable={jest.fn()}
        currentUser={currentUser}
        selectedDate={new Date('2025-02-01')}
        onDateChange={jest.fn()}
      />
    )
    
    // Find and click the shift
    const shiftElement = getByText('Test')
    fireEvent.click(shiftElement)
    
    // Find and click cancel option
    const cancelButton = getByText('❌ Anulează tura')
    fireEvent.click(cancelButton)
    
    // Verify onCancelShift was called
    expect(mockOnCancelShift).toHaveBeenCalledWith('shift-456')
  })
})

describe('Calendar - Swap Request', () => {
  test('clicking swap option on own shift should trigger swap modal', () => {
    // Test data
    const mockSetShowSwapModal = jest.fn()
    const testShift = {
      id: 'shift-789',
      shift_date: '2025-02-01', 
      department: 'Security',
      status: 'reserved',
      assigned_to: 'user-1',
      user: {
        id: 'user-1',
        name: 'Test User'
      }
    }
    
    const currentUser = {
      id: 'user-1',
      name: 'Test User',
      role: 'STAFF'
    }
    
    // Mock useState for swap modal
    jest.spyOn(React, 'useState').mockImplementationOnce(() => [false, mockSetShowSwapModal])
    
    // Render component
    const { getByText } = render(
      <Calendar
        shifts={[testShift]}
        unavailableDates={[]}
        onReserveShift={jest.fn()}
        onCancelShift={jest.fn()}
        onMarkUnavailable={jest.fn()}
        onRemoveUnavailable={jest.fn()}
        currentUser={currentUser}
        selectedDate={new Date('2025-02-01')}
        onDateChange={jest.fn()}
      />
    )
    
    // Find and click the shift
    const shiftElement = getByText('Test')
    fireEvent.click(shiftElement)
    
    // Find and click swap option
    const swapButton = getByText('🔄 Solicită schimb')
    fireEvent.click(swapButton)
    
    // Verify swap modal state was set to true
    expect(mockSetShowSwapModal).toHaveBeenCalledWith(true)
  })
})

describe('Calendar - Empty Cell Reservation', () => {
  test('clicking empty cell creates reservation', () => {
    // Test data
    const mockOnCreateReservation = jest.fn()
    const testDate = new Date('2025-08-14')
    
    const currentUser = {
      id: 'user-1',
      name: 'Test User',
      role: 'STAFF',
      department: 'ATI'
    }
    
    // Render calendar with no shifts for test date
    const { container } = render(
      <Calendar
        shifts={[]}
        unavailableDates={[]}
        onReserveShift={jest.fn()}
        onCancelShift={jest.fn()}
        onMarkUnavailable={jest.fn()}
        onRemoveUnavailable={jest.fn()}
        onCreateReservation={mockOnCreateReservation}
        currentUser={currentUser}
        selectedDate={testDate}
        onDateChange={jest.fn()}
      />
    )
    
    // Find the cell for August 14
    const dayCell = container.querySelector('[data-date="2025-08-14"]')
    expect(dayCell).toBeTruthy()
    
    // Find and click the + button
    const addButton = dayCell.querySelector('.add-reservation-btn')
    fireEvent.click(addButton)
    
    // Verify onCreateReservation was called with the date
    expect(mockOnCreateReservation).toHaveBeenCalledWith(expect.any(Date))
    const calledDate = mockOnCreateReservation.mock.calls[0][0]
    expect(calledDate.toISOString().split('T')[0]).toBe('2025-08-14')
  })
})