import { describe, test, expect } from '@jest/globals'
import { render, fireEvent } from '@testing-library/react'
import SwapRequestModal from '../SwapRequestModal'

describe('SwapRequestModal - Swap with Reserved Shift', () => {
  test('can request swap with another user reserved shift', () => {
    // Test data - BOV1 wants to swap with BOT1's reserved shift
    const mockOnSwapRequested = jest.fn()
    
    const currentUser = {
      id: 'bov1-id',
      name: 'Botezatu Viorica',
      code: 'BOV1',
      role: 'STAFF'
    }
    
    const userShifts = [{
      id: 'shift-bov1-aug14',
      shift_date: '2025-08-14',
      department: 'ATI',
      status: 'reserved',
      assigned_to: 'bov1-id',
      user: currentUser
    }]
    
    const targetShifts = [{
      id: 'shift-bot1-aug23',
      shift_date: '2025-08-23',
      department: 'Medicina Interna',
      status: 'reserved',
      assigned_to: 'bot1-id',
      user: {
        id: 'bot1-id',
        name: 'Botezatu Olesea',
        code: 'BOT1'
      }
    }]
    
    // Render component
    const { getByLabelText, getByText } = render(
      <SwapRequestModal
        isOpen={true}
        onClose={jest.fn()}
        currentUser={currentUser}
        userShifts={userShifts}
        targetShifts={targetShifts}
        onSwapRequested={mockOnSwapRequested}
      />
    )
    
    // Select from shift (BOV1's shift)
    const fromSelect = getByLabelText(/tura pe care o ai/i)
    fireEvent.change(fromSelect, { target: { value: 'shift-bov1-aug14' } })
    
    // Select to shift (BOT1's reserved shift)
    const toSelect = getByLabelText(/tura în care vrei/i)
    fireEvent.change(toSelect, { target: { value: 'shift-bot1-aug23' } })
    
    // Submit swap request
    const submitButton = getByText(/trimite cererea/i)
    fireEvent.click(submitButton)
    
    // Verify swap request was created
    expect(mockOnSwapRequested).toHaveBeenCalled()
  })
})

describe('SwapRequestModal - Swap with Assigned Shift', () => {
  test('can request swap with another user assigned shift', () => {
    // Test data - BOV1 wants to swap with BOT1's assigned shift
    const mockOnSwapRequested = jest.fn()
    
    const currentUser = {
      id: 'bov1-id',
      name: 'Botezatu Viorica',
      code: 'BOV1',
      role: 'STAFF'
    }
    
    const userShifts = [{
      id: 'shift-bov1-aug14',
      shift_date: '2025-08-14',
      department: 'ATI',
      status: 'assigned',
      assigned_to: 'bov1-id',
      user: currentUser
    }]
    
    const targetShifts = [{
      id: 'shift-bot1-aug23',
      shift_date: '2025-08-23',
      department: 'Medicina Interna',
      status: 'assigned',
      assigned_to: 'bot1-id',
      user: {
        id: 'bot1-id',
        name: 'Botezatu Olesea',
        code: 'BOT1'
      }
    }]
    
    // Render component
    const { getByLabelText, getByText } = render(
      <SwapRequestModal
        isOpen={true}
        onClose={jest.fn()}
        currentUser={currentUser}
        userShifts={userShifts}
        targetShifts={targetShifts}
        onSwapRequested={mockOnSwapRequested}
      />
    )
    
    // Select from shift (BOV1's shift)
    const fromSelect = getByLabelText(/tura pe care o ai/i)
    fireEvent.change(fromSelect, { target: { value: 'shift-bov1-aug14' } })
    
    // Select to shift (BOT1's assigned shift)
    const toSelect = getByLabelText(/tura în care vrei/i)
    fireEvent.change(toSelect, { target: { value: 'shift-bot1-aug23' } })
    
    // Submit swap request
    const submitButton = getByText(/trimite cererea/i)
    fireEvent.click(submitButton)
    
    // Verify swap request was created
    expect(mockOnSwapRequested).toHaveBeenCalled()
  })
})