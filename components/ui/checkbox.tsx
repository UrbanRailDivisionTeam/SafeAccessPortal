'use client'

import { forwardRef, InputHTMLAttributes } from 'react'
import { CheckIcon } from '@heroicons/react/24/outline'
import { cn } from '@/lib/utils'

interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string
  description?: string
  error?: boolean
}

const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, label, description, error, ...props }, ref) => {
    return (
      <div className="flex items-start space-x-3">
        <div className="relative flex items-center">
          <input
            type="checkbox"
            ref={ref}
            className={cn(
              'peer h-4 w-4 shrink-0 rounded border border-gray-300 focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-200',
              'checked:bg-primary-600 checked:border-primary-600',
              error && 'border-red-500 focus:ring-red-500',
              className
            )}
            {...props}
          />
          <CheckIcon className="absolute h-3 w-3 text-white opacity-0 peer-checked:opacity-100 transition-opacity duration-200 pointer-events-none left-0.5 top-0.5" />
        </div>
        {(label || description) && (
          <div className="flex flex-col">
            {label && (
              <label className={cn(
                'text-sm font-medium text-gray-700 cursor-pointer',
                error && 'text-red-700'
              )}>
                {label}
              </label>
            )}
            {description && (
              <p className={cn(
                'text-sm text-gray-500',
                error && 'text-red-500'
              )}>
                {description}
              </p>
            )}
          </div>
        )}
      </div>
    )
  }
)
Checkbox.displayName = 'Checkbox'

interface CheckboxGroupProps {
  options: { value: string; label: string; description?: string }[]
  value: string[]
  onChange: (value: string[]) => void
  label?: string
  required?: boolean
  error?: boolean
  helperText?: string
  className?: string
}

export function CheckboxGroup({
  options,
  value,
  onChange,
  label,
  required,
  error,
  helperText,
  className
}: CheckboxGroupProps) {
  const handleChange = (optionValue: string, checked: boolean) => {
    if (checked) {
      // 如果选择的是'无'，则清除其他所有选项
      if (optionValue === 'none') {
        onChange(['none'])
      } else {
        // 如果选择的是其他选项，则先移除'无'选项，再添加当前选项
        const newValue = value.filter(v => v !== 'none')
        onChange([...newValue, optionValue])
      }
    } else {
      onChange(value.filter(v => v !== optionValue))
    }
  }

  return (
    <div className={cn('space-y-3', className)}>
      {label && (
        <label className={cn(
          'block text-sm font-medium text-gray-700',
          required && 'after:content-["*"] after:text-red-500 after:ml-1'
        )}>
          {label}
        </label>
      )}
      
      <div className="space-y-3">
        {options.map((option) => (
          <Checkbox
            key={option.value}
            label={option.label}
            description={option.description}
            checked={value.includes(option.value)}
            onChange={(e) => handleChange(option.value, e.target.checked)}
            error={error}
          />
        ))}
      </div>
      
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

export { Checkbox }