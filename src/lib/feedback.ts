/**
 * Smart feedback messages for user actions
 * These messages provide context, explain what happened, and suggest next steps
 */

export interface FeedbackMessage {
  title: string
  description: string
  type: 'success' | 'info' | 'warning' | 'error'
  nextStep?: string
}

// Reservation feedback
export const reservationFeedback = {
  created: (isStaff: boolean): FeedbackMessage => ({
    title: 'Rezervare creată!',
    description: isStaff
      ? 'Tura a fost adăugată în lista ta. Managerul o va confirma când generează programul.'
      : 'Tura a fost creată și poate fi acum rezervată de personal.',
    type: 'success',
    nextStep: isStaff ? 'Poți rezerva încă o tură luna aceasta.' : undefined
  }),

  reserved: (daysUntil: number): FeedbackMessage => ({
    title: 'Tură rezervată!',
    description: daysUntil === 0
      ? 'Ai rezervat tura de azi. Verifică orele de lucru!'
      : daysUntil === 1
        ? 'Ai rezervat tura de mâine.'
        : `Ai rezervat o tură peste ${daysUntil} zile.`,
    type: 'success',
    nextStep: 'Rezervarea va fi confirmată când se generează programul final.'
  }),

  cancelled: (): FeedbackMessage => ({
    title: 'Rezervare anulată',
    description: 'Tura a fost eliberată și poate fi rezervată de altcineva.',
    type: 'info'
  }),

  limitReached: (current: number, max: number): FeedbackMessage => ({
    title: 'Limită atinsă',
    description: `Ai deja ${current} rezervări din ${max} permise luna aceasta.`,
    type: 'warning',
    nextStep: 'Poți anula o rezervare existentă pentru a face loc alteia.'
  }),

  deadlinePassed: (): FeedbackMessage => ({
    title: 'Termen limită expirat',
    description: 'Perioada de rezervări s-a încheiat pentru această lună.',
    type: 'error',
    nextStep: 'Contactează managerul dacă ai nevoie de modificări.'
  }),

  wrongDepartment: (): FeedbackMessage => ({
    title: 'Departament diferit',
    description: 'Poți rezerva doar ture din departamentul tău.',
    type: 'error'
  }),

  alreadyTaken: (): FeedbackMessage => ({
    title: 'Tură indisponibilă',
    description: 'Cineva a rezervat această tură înaintea ta.',
    type: 'warning',
    nextStep: 'Încearcă să rezervi o altă zi.'
  })
}

// Preference feedback
export const preferenceFeedback = {
  setUnavailable: (): FeedbackMessage => ({
    title: 'Marcat indisponibil',
    description: 'Nu vei fi programat în această zi (dacă este posibil).',
    type: 'info',
    nextStep: 'Algoritmul va încerca să te evite, dar în caz de urgență s-ar putea să fii totuși programat.'
  }),

  setPreferred: (): FeedbackMessage => ({
    title: 'Zi preferată marcată',
    description: 'Ai indicat că preferi să lucrezi în această zi.',
    type: 'success',
    nextStep: 'Vei avea prioritate la programare în această zi.'
  }),

  removed: (): FeedbackMessage => ({
    title: 'Preferință ștearsă',
    description: 'Ziua este acum disponibilă pentru programare normală.',
    type: 'info'
  }),

  deadlinePassed: (): FeedbackMessage => ({
    title: 'Termen expirat',
    description: 'Nu mai poți modifica preferințele pentru această lună.',
    type: 'error',
    nextStep: 'Contactează managerul pentru modificări urgente.'
  })
}

// Swap request feedback
export const swapFeedback = {
  sent: (count: number): FeedbackMessage => ({
    title: count === 1 ? 'Cerere trimisă!' : `${count} cereri trimise!`,
    description: 'Colegii vor primi notificări și pot accepta sau refuza schimbul.',
    type: 'success',
    nextStep: 'Vei fi notificat când primești un răspuns.'
  }),

  accepted: (partnerName: string): FeedbackMessage => ({
    title: 'Schimb acceptat!',
    description: `Ai făcut schimb de ture cu ${partnerName}. Calendarul a fost actualizat.`,
    type: 'success'
  }),

  rejected: (): FeedbackMessage => ({
    title: 'Cerere refuzată',
    description: 'Colegul nu a putut accepta schimbul.',
    type: 'info',
    nextStep: 'Poți trimite cereri către alți colegi.'
  }),

  cancelled: (): FeedbackMessage => ({
    title: 'Cerere anulată',
    description: 'Cererea de schimb a fost retrasă.',
    type: 'info'
  }),

  received: (fromName: string, shiftDate: string): FeedbackMessage => ({
    title: 'Cerere de schimb primită!',
    description: `${fromName} vrea să schimbe tura din ${shiftDate} cu tine.`,
    type: 'info',
    nextStep: 'Verifică calendarul și decide dacă accepți.'
  })
}

// Conflict feedback with actionable suggestions
export const conflictFeedback = {
  doubleBooking: (): FeedbackMessage => ({
    title: 'Conflict de programare',
    description: 'Ai deja o tură programată în această zi.',
    type: 'error',
    nextStep: 'Alege o altă zi sau solicită schimb pentru tura existentă.'
  }),

  restViolation: (isYesterday: boolean): FeedbackMessage => ({
    title: 'Pauză insuficientă',
    description: isYesterday
      ? 'Ai avut tură ieri - ai nevoie de cel puțin 8 ore de odihnă.'
      : 'Ai tură mâine - ai nevoie de cel puțin 8 ore de odihnă.',
    type: 'warning',
    nextStep: 'Poți continua, dar verifică dacă ai suficientă pauză între ture.'
  }),

  maxExceeded: (current: number, max: number): FeedbackMessage => ({
    title: 'Limită lunară atinsă',
    description: `Ai ${current} ture din ${max} permise luna aceasta.`,
    type: 'warning',
    nextStep: 'Poți continua, dar poate fi obositor. Discută cu managerul.'
  })
}

// Assignment feedback (for managers)
export const assignmentFeedback = {
  assigned: (userName: string): FeedbackMessage => ({
    title: 'Tură asignată',
    description: `${userName} a fost programat pentru această tură.`,
    type: 'success'
  }),

  unassigned: (): FeedbackMessage => ({
    title: 'Tură eliberată',
    description: 'Tura este acum disponibilă pentru rezervare.',
    type: 'info'
  }),

  deleted: (): FeedbackMessage => ({
    title: 'Tură ștearsă',
    description: 'Tura a fost eliminată din program.',
    type: 'info'
  }),

  withConflict: (userName: string, conflictType: string): FeedbackMessage => ({
    title: 'Asignat cu avertisment',
    description: `${userName} a fost programat, dar există un ${conflictType}.`,
    type: 'warning',
    nextStep: 'Verifică dacă persoana poate lucra în aceste condiții.'
  })
}

/**
 * Calculate days until a date
 */
export function getDaysUntil(dateStr: string): number {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const target = new Date(dateStr)
  return Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
}

/**
 * Format a date in Romanian
 */
export function formatDateRo(dateStr: string): string {
  const date = new Date(dateStr)
  const dayNames = ['Duminică', 'Luni', 'Marți', 'Miercuri', 'Joi', 'Vineri', 'Sâmbătă']
  const monthNames = ['ianuarie', 'februarie', 'martie', 'aprilie', 'mai', 'iunie',
                      'iulie', 'august', 'septembrie', 'octombrie', 'noiembrie', 'decembrie']
  return `${dayNames[date.getDay()]}, ${date.getDate()} ${monthNames[date.getMonth()]}`
}
