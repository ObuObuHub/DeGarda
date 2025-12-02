'use client'

import { useState, useRef, useEffect, ReactNode } from 'react'

type TooltipPosition = 'top' | 'bottom' | 'left' | 'right'

interface TooltipProps {
  content: ReactNode
  children: ReactNode
  position?: TooltipPosition
  delay?: number
}

export default function Tooltip({
  content,
  children,
  position = 'top',
  delay = 300
}: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [actualPosition, setActualPosition] = useState(position)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const tooltipRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLDivElement>(null)

  const showTooltip = () => {
    timeoutRef.current = setTimeout(() => {
      setIsVisible(true)
    }, delay)
  }

  const hideTooltip = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
    setIsVisible(false)
  }

  // Adjust position if tooltip overflows viewport
  useEffect(() => {
    if (isVisible && tooltipRef.current && triggerRef.current) {
      const tooltip = tooltipRef.current.getBoundingClientRect()
      const trigger = triggerRef.current.getBoundingClientRect()
      const padding = 8

      let newPosition = position

      // Check if tooltip overflows and adjust
      if (position === 'top' && trigger.top - tooltip.height < padding) {
        newPosition = 'bottom'
      } else if (position === 'bottom' && trigger.bottom + tooltip.height > window.innerHeight - padding) {
        newPosition = 'top'
      } else if (position === 'left' && trigger.left - tooltip.width < padding) {
        newPosition = 'right'
      } else if (position === 'right' && trigger.right + tooltip.width > window.innerWidth - padding) {
        newPosition = 'left'
      }

      setActualPosition(newPosition)
    }
  }, [isVisible, position])

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  const positionClasses: Record<TooltipPosition, string> = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2'
  }

  const arrowClasses: Record<TooltipPosition, string> = {
    top: 'top-full left-1/2 -translate-x-1/2 border-t-gray-900 border-l-transparent border-r-transparent border-b-transparent',
    bottom: 'bottom-full left-1/2 -translate-x-1/2 border-b-gray-900 border-l-transparent border-r-transparent border-t-transparent',
    left: 'left-full top-1/2 -translate-y-1/2 border-l-gray-900 border-t-transparent border-b-transparent border-r-transparent',
    right: 'right-full top-1/2 -translate-y-1/2 border-r-gray-900 border-t-transparent border-b-transparent border-l-transparent'
  }

  return (
    <div
      ref={triggerRef}
      className="relative inline-block"
      onMouseEnter={showTooltip}
      onMouseLeave={hideTooltip}
      onFocus={showTooltip}
      onBlur={hideTooltip}
      onTouchStart={() => {
        if (isVisible) {
          hideTooltip()
        } else {
          showTooltip()
        }
      }}
    >
      {children}
      {isVisible && (
        <div
          ref={tooltipRef}
          role="tooltip"
          className={`
            absolute z-50 px-2 py-1 text-xs text-white bg-gray-900 rounded shadow-lg
            whitespace-nowrap pointer-events-none
            animate-in fade-in duration-150
            ${positionClasses[actualPosition]}
          `}
        >
          {content}
          <span
            className={`absolute w-0 h-0 border-4 ${arrowClasses[actualPosition]}`}
          />
        </div>
      )}
    </div>
  )
}

// Simple wrapper for icon buttons with tooltips
interface IconButtonWithTooltipProps {
  icon: ReactNode
  tooltip: string
  onClick?: () => void
  className?: string
  disabled?: boolean
  ariaLabel?: string
}

export function IconButtonWithTooltip({
  icon,
  tooltip,
  onClick,
  className = '',
  disabled = false,
  ariaLabel
}: IconButtonWithTooltipProps) {
  return (
    <Tooltip content={tooltip}>
      <button
        onClick={onClick}
        disabled={disabled}
        className={`p-2 rounded hover:bg-gray-100 transition-colors disabled:opacity-50 ${className}`}
        aria-label={ariaLabel || tooltip}
      >
        {icon}
      </button>
    </Tooltip>
  )
}
