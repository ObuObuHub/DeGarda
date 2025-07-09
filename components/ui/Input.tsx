import React from 'react'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  icon?: React.ReactNode
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  icon,
  className = '',
  ...props
}) => {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-label-secondary mb-2">
          {label}
        </label>
      )}
      <div className="relative">
        {icon && (
          <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-system-gray-1">
            {icon}
          </div>
        )}
        <input
          className={`
            w-full px-4 py-3 
            ${icon ? 'pl-10' : ''}
            bg-background-secondary
            border border-transparent
            rounded-ios
            text-base text-label-primary
            placeholder:text-label-tertiary
            input-focus
            disabled:opacity-50 disabled:cursor-not-allowed
            ${error ? 'border-system-red' : ''}
            ${className}
          `}
          {...props}
        />
      </div>
      {error && (
        <p className="mt-2 text-sm text-system-red">{error}</p>
      )}
    </div>
  )
}