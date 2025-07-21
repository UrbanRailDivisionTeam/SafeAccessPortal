'use client'

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDownIcon, CheckIcon } from '@heroicons/react/24/outline'
import { cn } from '@/lib/utils'
import { SelectOption } from '@/types'

interface SelectProps {
  options: SelectOption[]
  value?: string
  onChange: (value: string) => void
  placeholder?: string
  label?: string
  required?: boolean
  error?: boolean
  helperText?: string
  searchable?: boolean
  disabled?: boolean
  className?: string
}

export function Select({
  options,
  value,
  onChange,
  placeholder = '请选择...',
  label,
  required,
  error,
  helperText,
  searchable = false,
  disabled = false,
  className
}: SelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const selectRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const selectedOption = options.find(option => option.value === value)
  
  const filteredOptions = searchable
    ? options.filter(option => 
        option.label.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : options

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (selectRef.current && !selectRef.current.contains(event.target as Node)) {
        setIsOpen(false)
        setSearchTerm('')
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    if (isOpen && searchable && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isOpen, searchable])

  const handleSelect = (optionValue: string) => {
    onChange(optionValue)
    setIsOpen(false)
    setSearchTerm('')
  }

  return (
    <div className={cn('relative', className)} ref={selectRef}>
      {label && (
        <label className={cn(
          'block text-sm font-medium text-gray-700 mb-2',
          required && 'after:content-["*"] after:text-red-500 after:ml-1'
        )}>
          {label}
        </label>
      )}
      
      <div className="relative">
        <button
          type="button"
          className={cn(
            'relative w-full cursor-pointer rounded-lg border border-gray-200 bg-white py-2 pl-3 pr-10 text-left shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 transition-all duration-200',
            error && 'border-red-500 focus:border-red-500 focus:ring-red-500',
            disabled && 'cursor-not-allowed opacity-50'
          )}
          onClick={() => !disabled && setIsOpen(!isOpen)}
          disabled={disabled}
        >
          <span className={cn(
            'block truncate',
            !selectedOption ? 'text-gray-500' : 'text-gray-900'
          )}>
            {selectedOption ? selectedOption.label : placeholder}
          </span>
          <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
            <ChevronDownIcon
              className={cn(
                'h-5 w-5 text-gray-400 transition-transform duration-200',
                isOpen && 'transform rotate-180'
              )}
            />
          </span>
        </button>

        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="absolute z-50 mt-1 w-full rounded-lg bg-white shadow-lg border border-gray-200 max-h-60 overflow-auto"
            >
              {searchable && (
                <div className="p-2 border-b border-gray-100">
                  <input
                    ref={inputRef}
                    type="text"
                    className="w-full px-3 py-2 border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500 text-gray-900 placeholder:text-gray-500"
                    placeholder="搜索..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              )}
              
              <div className="py-1">
                {filteredOptions.length === 0 ? (
                  <div className="px-3 py-2 text-sm text-gray-500">
                    {searchable ? '未找到匹配项' : '暂无选项'}
                  </div>
                ) : (
                  filteredOptions.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      className={cn(
                        'relative w-full cursor-pointer select-none py-2 pl-3 pr-9 text-left hover:bg-gray-50 focus:bg-gray-50 focus:outline-none transition-colors duration-150 text-gray-900',
                        value === option.value && 'bg-primary-50 text-primary-700'
                      )}
                      onClick={() => handleSelect(option.value)}
                    >
                      <span className="block truncate">
                        {option.label}
                      </span>
                      {value === option.value && (
                        <span className="absolute inset-y-0 right-0 flex items-center pr-3">
                          <CheckIcon className="h-4 w-4 text-primary-600" />
                        </span>
                      )}
                    </button>
                  ))
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {helperText && (
        <p className={cn(
          'mt-2 text-sm',
          error ? 'text-red-500' : 'text-gray-600'
        )}>
          {helperText}
        </p>
      )}
    </div>
  )
}