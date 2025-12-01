'use client'

import { ReactNode } from 'react'

interface FormModalProps {
  isOpen: boolean
  title: string
  onClose: () => void
  onSubmit: (e: React.FormEvent) => void
  loading?: boolean
  submitText?: string
  cancelText?: string
  children: ReactNode
}

export default function FormModal({
  isOpen,
  title,
  onClose,
  onSubmit,
  loading = false,
  submitText = 'Salvează',
  cancelText = 'Anulează',
  children
}: FormModalProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b sticky top-0 bg-white">
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        </div>
        <form onSubmit={onSubmit}>
          <div className="p-6 space-y-4">
            {children}
          </div>
          <div className="px-6 pb-6 flex justify-end gap-3 sticky bottom-0 bg-white pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50"
            >
              {cancelText}
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50"
            >
              {loading ? 'Se salvează...' : submitText}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// Reusable form field components
interface FormFieldProps {
  label: string
  required?: boolean
  children: ReactNode
}

export function FormField({ label, required, children }: FormFieldProps) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      {children}
    </div>
  )
}

interface TextInputProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  required?: boolean
  type?: 'text' | 'email' | 'number'
  pattern?: string
  title?: string
  min?: number
  max?: number
  className?: string
}

export function TextInput({
  value,
  onChange,
  placeholder,
  required,
  type = 'text',
  pattern,
  title,
  min,
  max,
  className = ''
}: TextInputProps) {
  return (
    <input
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      required={required}
      pattern={pattern}
      title={title}
      min={min}
      max={max}
      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${className}`}
    />
  )
}

interface SelectInputProps {
  value: string
  onChange: (value: string) => void
  options: Array<{ value: string; label: string }>
  placeholder?: string
  required?: boolean
  className?: string
}

export function SelectInput({
  value,
  onChange,
  options,
  placeholder,
  required,
  className = ''
}: SelectInputProps) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      required={required}
      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${className}`}
    >
      {placeholder && <option value="">{placeholder}</option>}
      {options.map(opt => (
        <option key={opt.value} value={opt.value}>{opt.label}</option>
      ))}
    </select>
  )
}
