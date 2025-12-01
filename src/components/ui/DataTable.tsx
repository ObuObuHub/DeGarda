'use client'

import { ReactNode } from 'react'

export interface Column<T> {
  key: string
  header: string
  render: (item: T) => ReactNode
  className?: string
}

interface DataTableProps<T> {
  data: T[]
  columns: Column<T>[]
  keyExtractor: (item: T) => string
  onEdit?: (item: T) => void
  onDelete?: (item: T) => void
  emptyMessage?: string
  showActions?: boolean
}

export default function DataTable<T>({
  data,
  columns,
  keyExtractor,
  onEdit,
  onDelete,
  emptyMessage = 'Nu există date de afișat.',
  showActions = true
}: DataTableProps<T>) {
  if (data.length === 0) {
    return (
      <p className="text-gray-500 text-center py-8">{emptyMessage}</p>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b bg-gray-50">
            {columns.map(col => (
              <th
                key={col.key}
                className={`text-left py-3 px-4 font-medium text-gray-700 ${col.className || ''}`}
              >
                {col.header}
              </th>
            ))}
            {showActions && (onEdit || onDelete) && (
              <th className="text-right py-3 px-4 font-medium text-gray-700">
                Acțiuni
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {data.map(item => (
            <tr key={keyExtractor(item)} className="border-b hover:bg-gray-50">
              {columns.map(col => (
                <td key={col.key} className={`py-3 px-4 ${col.className || ''}`}>
                  {col.render(item)}
                </td>
              ))}
              {showActions && (onEdit || onDelete) && (
                <td className="py-3 px-4 text-right">
                  <div className="flex justify-end gap-2">
                    {onEdit && (
                      <button
                        onClick={() => onEdit(item)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                        title="Editează"
                      >
                        <EditIcon />
                      </button>
                    )}
                    {onDelete && (
                      <button
                        onClick={() => onDelete(item)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded transition-colors"
                        title="Șterge"
                      >
                        <DeleteIcon />
                      </button>
                    )}
                  </div>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function EditIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
      <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
    </svg>
  )
}

function DeleteIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
    </svg>
  )
}

// Badge component for status display
interface BadgeProps {
  children: ReactNode
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'purple'
}

export function Badge({ children, variant = 'default' }: BadgeProps) {
  const variants = {
    default: 'bg-gray-100 text-gray-800',
    success: 'bg-green-100 text-green-800',
    warning: 'bg-yellow-100 text-yellow-800',
    danger: 'bg-red-100 text-red-800',
    info: 'bg-blue-100 text-blue-800',
    purple: 'bg-purple-100 text-purple-800'
  }

  return (
    <span className={`px-2 py-1 rounded text-xs font-medium ${variants[variant]}`}>
      {children}
    </span>
  )
}
