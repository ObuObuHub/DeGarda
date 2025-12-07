'use client'

import { useCallback } from 'react'
import { supabase, type User, type Shift, type SwapRequest } from '@/lib/supabase'

interface ToastFunctions {
  success: (message: string) => void
  error: (message: string) => void
  warning: (message: string) => void
  info: (message: string) => void
}

interface UseSwapActionsReturn {
  requestSwap: (requesterShiftId: string, targetShiftIds: string[]) => Promise<void>
  acceptSwapRequest: (swapRequestId: string) => Promise<void>
  rejectSwapRequest: (swapRequestId: string) => Promise<void>
  cancelSwapRequest: (swapRequestId: string) => Promise<void>
}

export function useSwapActions(
  user: User | null,
  shifts: Shift[],
  swapRequests: SwapRequest[],
  onRefreshShifts: () => Promise<void>,
  onRefreshSwapRequests: () => Promise<void>,
  toast?: ToastFunctions
): UseSwapActionsReturn {

  const requestSwap = useCallback(async (requesterShiftId: string, targetShiftIds: string[]) => {
    if (!user) return

    const swapRequestsToCreate = targetShiftIds.map(targetShiftId => {
      const targetShift = shifts.find(s => s.id === targetShiftId)
      if (!targetShift || !targetShift.assigned_to) return null

      return {
        requester_id: user.id,
        requester_shift_id: requesterShiftId,
        target_user_id: targetShift.assigned_to,
        target_shift_id: targetShiftId,
        status: 'pending'
      }
    }).filter(Boolean)

    if (swapRequestsToCreate.length === 0) {
      toast?.error('Nu s-au putut crea cererile de schimb.')
      return
    }

    const { error } = await supabase
      .from('swap_requests')
      .insert(swapRequestsToCreate)

    if (!error) {
      await onRefreshSwapRequests()
      toast?.success(`${swapRequestsToCreate.length} cereri de schimb trimise!`)
    } else {
      toast?.error('Nu s-au putut înregistra cererile de schimb.')
    }
  }, [user, shifts, onRefreshSwapRequests, toast])

  const acceptSwapRequest = useCallback(async (swapRequestId: string) => {
    if (!user) return

    const swapRequest = swapRequests.find(sr => sr.id === swapRequestId)
    if (!swapRequest) return

    if (swapRequest.target_user_id !== user.id) {
      toast?.error('Nu ai autorizare pentru această acțiune.')
      return
    }

    const requesterShift = shifts.find(s => s.id === swapRequest.requester_shift_id)
    const targetShift = shifts.find(s => s.id === swapRequest.target_shift_id)
    if (!requesterShift || !targetShift) {
      toast?.warning('Una din ture nu mai există.')
      await onRefreshSwapRequests()
      return
    }

    // Update requester's shift to go to target user
    const { error: error1 } = await supabase
      .from('shifts')
      .update({ assigned_to: swapRequest.target_user_id, status: 'assigned' })
      .eq('id', swapRequest.requester_shift_id)

    if (error1) {
      toast?.error(`Eroare la schimbarea turei: ${error1.message}`)
      return
    }

    // Update target's shift to go to requester
    const { error: error2 } = await supabase
      .from('shifts')
      .update({ assigned_to: swapRequest.requester_id, status: 'assigned' })
      .eq('id', swapRequest.target_shift_id)

    if (error2) {
      // Rollback
      await supabase
        .from('shifts')
        .update({ assigned_to: swapRequest.requester_id, status: 'assigned' })
        .eq('id', swapRequest.requester_shift_id)
      toast?.error(`Eroare la schimbarea turei: ${error2.message}`)
      return
    }

    // Update swap request status
    await supabase
      .from('swap_requests')
      .update({ status: 'accepted' })
      .eq('id', swapRequestId)

    // Cancel other pending requests for the same shift
    await supabase
      .from('swap_requests')
      .update({ status: 'cancelled' })
      .eq('requester_shift_id', swapRequest.requester_shift_id)
      .eq('status', 'pending')
      .neq('id', swapRequestId)

    await Promise.all([onRefreshShifts(), onRefreshSwapRequests()])
    toast?.success('Schimb acceptat cu succes!')
  }, [user, shifts, swapRequests, onRefreshShifts, onRefreshSwapRequests, toast])

  const rejectSwapRequest = useCallback(async (swapRequestId: string) => {
    if (!user) return

    const swapRequest = swapRequests.find(sr => sr.id === swapRequestId)
    if (!swapRequest) return

    if (swapRequest.target_user_id !== user.id && swapRequest.requester_id !== user.id) {
      toast?.error('Nu ai autorizare pentru această acțiune.')
      return
    }

    const { error } = await supabase
      .from('swap_requests')
      .update({ status: 'rejected' })
      .eq('id', swapRequestId)

    if (!error) {
      await onRefreshSwapRequests()
      toast?.info('Cerere de schimb refuzată.')
    }
  }, [user, swapRequests, onRefreshSwapRequests, toast])

  const cancelSwapRequest = useCallback(async (swapRequestId: string) => {
    if (!user) return

    const swapRequest = swapRequests.find(sr => sr.id === swapRequestId)
    if (!swapRequest) return

    // Only the requester can cancel their own request
    if (swapRequest.requester_id !== user.id) {
      toast?.error('Poți anula doar cererile trimise de tine.')
      return
    }

    const { error } = await supabase
      .from('swap_requests')
      .update({ status: 'cancelled' })
      .eq('id', swapRequestId)

    if (!error) {
      await onRefreshSwapRequests()
      toast?.info('Cerere de schimb anulată.')
    }
  }, [user, swapRequests, onRefreshSwapRequests, toast])

  return {
    requestSwap,
    acceptSwapRequest,
    rejectSwapRequest,
    cancelSwapRequest
  }
}
