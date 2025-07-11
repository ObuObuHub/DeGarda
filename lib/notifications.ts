import { sql } from './db'

export type NotificationType = 'shift_assigned' | 'swap_request' | 'swap_approved' | 'swap_rejected' | 'shift_reserved'

interface CreateNotificationParams {
  userId: string
  type: NotificationType
  title: string
  message: string
  metadata?: Record<string, any>
}

export async function createNotification({
  userId,
  type,
  title,
  message,
  metadata = {}
}: CreateNotificationParams) {
  try {
    await sql`
      INSERT INTO notifications (user_id, type, title, message, metadata)
      VALUES (${userId}, ${type}, ${title}, ${message}, ${JSON.stringify(metadata)})
    `
    return true
  } catch (error) {
    console.error('Failed to create notification:', error)
    return false
  }
}

// Helper functions for common notifications
export async function notifyShiftAssignment(staffId: string, shiftDate: string, hospitalName: string) {
  return createNotification({
    userId: staffId,
    type: 'shift_assigned',
    title: 'Gardă Atribuită',
    message: `Ți-a fost atribuită o gardă pe data de ${new Date(shiftDate).toLocaleDateString('ro-RO')} la ${hospitalName}`,
    metadata: { shiftDate, hospitalName }
  })
}

export async function notifySwapRequest(targetStaffId: string, fromStaffName: string, shiftDate: string) {
  return createNotification({
    userId: targetStaffId,
    type: 'swap_request',
    title: 'Cerere de Schimb',
    message: `${fromStaffName} dorește să schimbe garda din ${new Date(shiftDate).toLocaleDateString('ro-RO')}`,
    metadata: { fromStaffName, shiftDate }
  })
}

export async function notifySwapDecision(
  staffId: string, 
  decision: 'approved' | 'rejected', 
  shiftDate: string
) {
  const type = decision === 'approved' ? 'swap_approved' : 'swap_rejected'
  const title = decision === 'approved' ? 'Schimb Aprobat' : 'Schimb Respins'
  const message = decision === 'approved' 
    ? `Cererea ta de schimb pentru ${new Date(shiftDate).toLocaleDateString('ro-RO')} a fost aprobată`
    : `Cererea ta de schimb pentru ${new Date(shiftDate).toLocaleDateString('ro-RO')} a fost respinsă`

  return createNotification({
    userId: staffId,
    type,
    title,
    message,
    metadata: { shiftDate, decision }
  })
}