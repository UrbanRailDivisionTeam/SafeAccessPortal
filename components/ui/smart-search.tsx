'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { MagnifyingGlassIcon, XMarkIcon } from '@heroicons/react/24/outline'
import { Input } from './input'
import { Button } from './button'

interface SearchSuggestion {
  id: number
  name: string
  employee_number?: string
  department?: string
}

interface SmartSearchProps {
  /**
   * API端点，比如 '/api/companies' 或 '/api/personnel'
   */
  apiEndpoint: string
  /**
   * 占位符文本
   */
  placeholder?: string
  /**
   * 当用户选择一个选项时的回调函数
   */
  onSelect: (value: string, item?: SearchSuggestion) => void
  /**
   * 初始值
   */
  value?: string
  /**
   * 是否禁用
   */
  disabled?: boolean
  /**
   * 最小搜索长度，默认2个字符
   */
  minSearchLength?: number
  /**
   * 搜索防抖延迟，默认300ms
   */
  debounceMs?: number
  /**
   * 最大建议数量，默认10条
   */
  maxSuggestions?: number
}

/**
 * 智能搜索组件 - 就像一个聪明的助手，帮你快速找到想要的内容
 * 支持实时搜索、防抖、键盘导航等功能
 */
export function SmartSearch({
  apiEndpoint,
  placeholder = '开始输入进行搜索...',
  onSelect,
  value = '',
  disabled = false,
  minSearchLength = 2,
  debounceMs = 300,
  maxSuggestions = 10
}: SmartSearchProps) {
  const [inputValue, setInputValue] = useState(value)
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const [searchHistory, setSearchHistory] = useState<string[]>([])
  
  const inputRef = useRef<HTMLInputElement>(null)
  const suggestionsRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<NodeJS.Timeout>()
  const abortControllerRef = useRef<AbortController>()

  // 从本地存储加载搜索历史
  useEffect(() => {
    const history = localStorage.getItem(`search-history-${apiEndpoint}`)
    if (history) {
      setSearchHistory(JSON.parse(history))
    }
  }, [apiEndpoint])

  // 保存搜索历史到本地存储
  const saveToHistory = useCallback((searchTerm: string) => {
    if (searchTerm.length < minSearchLength) return
    
    const newHistory = [searchTerm, ...searchHistory.filter(h => h !== searchTerm)].slice(0, 10)
    setSearchHistory(newHistory)
    localStorage.setItem(`search-history-${apiEndpoint}`, JSON.stringify(newHistory))
  }, [searchHistory, minSearchLength, apiEndpoint])

  // 搜索建议的函数
  const searchSuggestions = useCallback(async (searchTerm: string) => {
    if (searchTerm.length < minSearchLength) {
      setSuggestions([])
      setIsLoading(false)
      return
    }

    // 取消之前的请求
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }

    // 创建新的请求控制器
    abortControllerRef.current = new AbortController()
    
    try {
      setIsLoading(true)
      const response = await fetch(
        `${apiEndpoint}?search=${encodeURIComponent(searchTerm)}&suggestions=true&limit=${maxSuggestions}`,
        { signal: abortControllerRef.current.signal }
      )
      
      if (response.ok) {
        const data = await response.json()
        setSuggestions(data.suggestions || [])
      }
    } catch (error) {
      if (error instanceof Error && error.name !== 'AbortError') {
        console.error('搜索建议失败:', error)
      }
    } finally {
      setIsLoading(false)
    }
  }, [apiEndpoint, minSearchLength, maxSuggestions])

  // 防抖搜索
  const debouncedSearch = useCallback((searchTerm: string) => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }
    
    debounceRef.current = setTimeout(() => {
      searchSuggestions(searchTerm)
    }, debounceMs)
  }, [searchSuggestions, debounceMs])

  // 处理输入变化
  const handleInputChange = (newValue: string) => {
    setInputValue(newValue)
    setSelectedIndex(-1)
    
    if (newValue.length >= minSearchLength) {
      setShowSuggestions(true)
      debouncedSearch(newValue)
    } else {
      setShowSuggestions(false)
      setSuggestions([])
    }
  }

  // 处理选择建议
  const handleSelectSuggestion = (suggestion: SearchSuggestion) => {
    setInputValue(suggestion.name)
    setShowSuggestions(false)
    setSuggestions([])
    saveToHistory(suggestion.name)
    onSelect(suggestion.name, suggestion)
  }

  // 处理键盘导航
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions || suggestions.length === 0) return

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setSelectedIndex(prev => 
          prev < suggestions.length - 1 ? prev + 1 : 0
        )
        break
      case 'ArrowUp':
        e.preventDefault()
        setSelectedIndex(prev => 
          prev > 0 ? prev - 1 : suggestions.length - 1
        )
        break
      case 'Enter':
        e.preventDefault()
        if (selectedIndex >= 0) {
          handleSelectSuggestion(suggestions[selectedIndex])
        } else if (inputValue.trim()) {
          setShowSuggestions(false)
          saveToHistory(inputValue.trim())
          onSelect(inputValue.trim())
        }
        break
      case 'Escape':
        setShowSuggestions(false)
        inputRef.current?.blur()
        break
    }
  }

  // 清空输入
  const handleClear = () => {
    setInputValue('')
    setSuggestions([])
    setShowSuggestions(false)
    onSelect('')
    inputRef.current?.focus()
  }

  // 处理焦点
  const handleFocus = () => {
    if (inputValue.length >= minSearchLength) {
      setShowSuggestions(true)
    }
  }

  const handleBlur = () => {
    // 延迟隐藏建议，允许点击建议项
    setTimeout(() => {
      setShowSuggestions(false)
    }, 200)
  }

  // 渲染建议项
  const renderSuggestion = (suggestion: SearchSuggestion, index: number) => {
    const isSelected = index === selectedIndex
    
    return (
      <motion.div
        key={suggestion.id}
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.05 }}
        className={`
          px-4 py-3 cursor-pointer border-b border-gray-100 last:border-b-0
          ${isSelected ? 'bg-blue-50 text-blue-700' : 'hover:bg-gray-50'}
        `}
        onClick={() => handleSelectSuggestion(suggestion)}
      >
        <div className="font-medium">{suggestion.name}</div>
        {suggestion.employee_number && (
          <div className="text-sm text-gray-500">
            工号: {suggestion.employee_number}
            {suggestion.department && ` • ${suggestion.department}`}
          </div>
        )}
      </motion.div>
    )
  }

  return (
    <div className="relative">
      <div className="relative">
        <Input
          ref={inputRef}
          value={inputValue}
          onChange={(e) => handleInputChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder={placeholder}
          disabled={disabled}
          className="pr-20"
        />
        
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {isLoading && (
            <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          )}
          
          {inputValue && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleClear}
              className="h-6 w-6 p-0 hover:bg-gray-100"
            >
              <XMarkIcon className="h-4 w-4" />
            </Button>
          )}
          
          <MagnifyingGlassIcon className="h-4 w-4 text-gray-400" />
        </div>
      </div>

      {/* 搜索建议下拉框 */}
      <AnimatePresence>
        {showSuggestions && suggestions.length > 0 && (
          <motion.div
            ref={suggestionsRef}
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-64 overflow-y-auto"
          >
            {suggestions.map((suggestion, index) => renderSuggestion(suggestion, index))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* 无结果提示 */}
      <AnimatePresence>
        {showSuggestions && !isLoading && inputValue.length >= minSearchLength && suggestions.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg p-4 text-center text-gray-500"
          >
            未找到匹配的结果
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}