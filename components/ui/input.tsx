'use client'

import { forwardRef, InputHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: boolean
  helperText?: string
  label?: string
  required?: boolean
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, error, helperText, label, required, ...props }, ref) => {
    return (
      <div className="space-y-2">
        {label && (
          <label className={cn(
            'block text-sm font-medium text-gray-700',
            required && 'after:content-["*"] after:text-red-500 after:ml-1'
          )}>
            {label}
          </label>
        )}
        <input
          type={type}
          className={cn(
            'flex h-10 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-200',
            error && 'border-red-500 focus:ring-red-500',
            className
          )}
          ref={ref}
          {...props}
        />
        {helperText && (
          <p className={cn(
            'text-sm',
            error ? 'text-red-500' : 'text-gray-600'
          )}>
            {helperText}
          </p>
        )}
      </div>
    )
  }
)
Input.displayName = 'Input'

const Textarea = forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
  error?: boolean
  helperText?: string
  label?: string
  required?: boolean
}>(
  ({ className, error, helperText, label, required, ...props }, ref) => {
    return (
      <div className="space-y-2">
        {label && (
          <label className={cn(
            'block text-sm font-medium text-gray-700',
            required && 'after:content-["*"] after:text-red-500 after:ml-1'
          )}>
            {label}
          </label>
        )}
        <textarea
          className={cn(
            'flex min-h-[80px] w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-200 resize-vertical',
            error && 'border-red-500 focus:ring-red-500',
            className
          )}
          ref={ref}
          {...props}
        />
        {helperText && (
          <p className={cn(
            'text-sm',
            error ? 'text-red-500' : 'text-gray-600'
          )}>
            {helperText}
          </p>
        )}
      </div>
    )
  }
)
Textarea.displayName = 'Textarea'

export { Input, Textarea }