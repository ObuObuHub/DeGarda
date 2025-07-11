import React from 'react'
import { Icon } from './Icon'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  fullWidth?: boolean
  icon?: string
  iconPosition?: 'left' | 'right'
  children: React.ReactNode
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  icon,
  iconPosition = 'left',
  className = '',
  children,
  disabled,
  ...props
}) => {
  const baseClasses = 'font-medium rounded-ios transition-all duration-200 ease-in-out active:scale-95'
  
  const variantClasses = {
    primary: 'bg-system-blue text-white hover:opacity-90 disabled:opacity-50',
    secondary: 'bg-system-gray-6 text-white hover:opacity-90 disabled:opacity-50',
    ghost: 'bg-transparent text-system-blue hover:bg-system-gray-6/10',
    danger: 'bg-system-red text-white hover:opacity-90 disabled:opacity-50',
  }
  
  const sizeClasses = {
    sm: 'px-3 py-2 text-sm',
    md: 'px-4 sm:px-6 py-2.5 sm:py-3 text-sm sm:text-base',
    lg: 'px-6 sm:px-8 py-3 sm:py-4 text-base sm:text-lg',
  }
  
  const widthClass = fullWidth ? 'w-full' : ''
  
  const iconSize = size === 'sm' ? 'sm' : size === 'lg' ? 'lg' : 'md'
  
  return (
    <button
      className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${widthClass} ${className} flex items-center justify-center gap-2`}
      disabled={disabled}
      {...props}
    >
      {icon && iconPosition === 'left' && <Icon name={icon} size={iconSize} />}
      {children}
      {icon && iconPosition === 'right' && <Icon name={icon} size={iconSize} />}
    </button>
  )
}