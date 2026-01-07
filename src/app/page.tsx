'use client'

import { useState, useEffect, useRef } from 'react'
import { auth } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { type Hospital } from '@/types'

export default function LoginPage() {
  const [personalCode, setPersonalCode] = useState('')
  const [selectedHospitalId, setSelectedHospitalId] = useState<string | null>(null)
  const [hospitals, setHospitals] = useState<Hospital[]>([])
  const [loading, setLoading] = useState(false)
  const [hospitalsLoading, setHospitalsLoading] = useState(true)
  const [error, setError] = useState('')
  const [step, setStep] = useState<1 | 2>(1)
  const codeInputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  const selectedHospital = hospitals.find(h => h.id === selectedHospitalId)

  useEffect(() => {
    if (auth.isAuthenticated()) {
      router.push('/dashboard')
      return
    }
    loadHospitals()
  }, [router])

  // Auto-advance to step 2 when hospital is selected
  useEffect(() => {
    if (selectedHospitalId && step === 1) {
      setStep(2)
      // Focus on code input after a short delay for animation
      setTimeout(() => codeInputRef.current?.focus(), 100)
    }
  }, [selectedHospitalId, step])

  const loadHospitals = async (): Promise<void> => {
    try {
      const { data, error: fetchError } = await supabase
        .from('hospitals')
        .select('*')
        .order('name')

      if (fetchError) {
        console.error('Failed to load hospitals:', fetchError)
        setError('Nu s-au putut încărca spitalele. Verifică conexiunea la internet.')
        return
      }
      setHospitals(data || [])
    } finally {
      setHospitalsLoading(false)
    }
  }

  const handleLogin = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault()

    if (!personalCode.trim()) {
      setError('Introdu codul personal')
      return
    }

    setLoading(true)
    setError('')

    const isSuperAdminCode = personalCode.toUpperCase() === 'SUPER'

    try {
      const { user, error: loginError } = await auth.loginWithCode(
        personalCode,
        isSuperAdminCode ? undefined : (selectedHospitalId || undefined)
      )

      if (loginError || !user) {
        setError(loginError || 'Cod personal invalid')
      } else {
        router.push('/dashboard')
      }
    } catch {
      setError('Eroare la conectare. Încearcă din nou.')
    } finally {
      setLoading(false)
    }
  }

  const handleHospitalSelect = (hospitalId: string): void => {
    setSelectedHospitalId(hospitalId)
    setError('')
  }

  const handleBackToStep1 = (): void => {
    setStep(1)
    setSelectedHospitalId(null)
    setPersonalCode('')
    setError('')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-4">
      <div className="card w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
            <span className="text-3xl">🏥</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-800">DeGardă</h1>
          <p className="text-gray-500 text-sm mt-1">Programare Gărzi Medicale</p>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-center mb-6">
          <div className="flex items-center gap-2">
            <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium transition-all ${
              step >= 1 ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-500'
            }`}>
              {selectedHospitalId ? '✓' : '1'}
            </div>
            <span className={`text-sm ${step >= 1 ? 'text-gray-700' : 'text-gray-400'}`}>Spital</span>

            <div className={`w-8 h-0.5 ${step >= 2 ? 'bg-blue-500' : 'bg-gray-200'}`} />

            <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium transition-all ${
              step >= 2 ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-500'
            }`}>
              2
            </div>
            <span className={`text-sm ${step >= 2 ? 'text-gray-700' : 'text-gray-400'}`}>Cod</span>
          </div>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          {/* Step 1: Hospital Selection */}
          {step === 1 && (
            <div className="space-y-3 animate-in">
              <label className="block text-sm font-medium text-gray-700">
                Selectează spitalul tău
              </label>

              {hospitalsLoading ? (
                <div className="space-y-2">
                  {[1, 2].map(i => (
                    <div key={i} className="h-16 bg-gray-100 rounded-lg animate-pulse" />
                  ))}
                </div>
              ) : (
                <div className="space-y-2">
                  {hospitals.map((hospital) => (
                    <button
                      key={hospital.id}
                      type="button"
                      onClick={() => handleHospitalSelect(hospital.id)}
                      className={`w-full p-4 text-left rounded-lg border-2 transition-all hover:border-blue-300 hover:bg-blue-50 ${
                        selectedHospitalId === hospital.id
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 bg-white'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex-shrink-0 w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                          <span className="text-lg">🏥</span>
                        </div>
                        <div className="flex-grow min-w-0">
                          <p className="font-medium text-gray-900 truncate">{hospital.name}</p>
                          <p className="text-sm text-gray-500">{hospital.location}</p>
                        </div>
                        <div className="flex-shrink-0">
                          <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              <p className="text-xs text-gray-500 text-center mt-4">
                Selectează spitalul pentru a continua
              </p>
            </div>
          )}

          {/* Step 2: Personal Code */}
          {step === 2 && (
            <div className="space-y-4 animate-in">
              {/* Selected Hospital Display */}
              <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg border border-blue-100">
                <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-sm">🏥</span>
                </div>
                <div className="flex-grow min-w-0">
                  <p className="text-sm font-medium text-blue-900 truncate">
                    {selectedHospital?.name}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleBackToStep1}
                  className="flex-shrink-0 text-blue-600 hover:text-blue-800 text-sm font-medium"
                >
                  Schimbă
                </button>
              </div>

              {/* Code Input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Introdu codul tău personal
                </label>
                <input
                  ref={codeInputRef}
                  type="text"
                  value={personalCode}
                  onChange={(e) => {
                    setPersonalCode(e.target.value.toUpperCase())
                    setError('')
                  }}
                  className="input text-center text-xl font-mono tracking-widest uppercase"
                  placeholder="• • • •"
                  maxLength={20}
                  autoComplete="off"
                  autoCapitalize="characters"
                />
                <p className="text-xs text-gray-500 mt-2 text-center">
                  Codul primit de la administrator (ex: FAL1, POP1)
                </p>
              </div>

              {/* Error Message */}
              {error && (
                <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-100 rounded-lg text-red-700 text-sm animate-in">
                  <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                  <span>{error}</span>
                </div>
              )}

              {/* Login Button */}
              <button
                type="submit"
                disabled={loading || !personalCode.trim()}
                className="btn btn-primary w-full h-12 text-base disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Se conectează...
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    Intră în cont
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                  </span>
                )}
              </button>

              {/* Back Button */}
              <button
                type="button"
                onClick={handleBackToStep1}
                className="w-full text-center text-sm text-gray-500 hover:text-gray-700 py-2"
              >
                ← Înapoi la selectarea spitalului
              </button>
            </div>
          )}
        </form>

        {/* Footer */}
        <div className="mt-6 pt-6 border-t border-gray-100">
          <p className="text-xs text-gray-400 text-center">
            Aplicație creată de Dr. Chiper pentru colegii medici
          </p>
          <p className="text-xs text-gray-400 text-center mt-1">
            <a href="mailto:drchiperleferman@gmail.com" className="text-blue-500 hover:underline">
              drchiperleferman@gmail.com
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}
