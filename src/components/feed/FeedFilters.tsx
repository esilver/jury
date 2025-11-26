'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, Flame, MapPin, Clock, Check } from 'lucide-react'
import type { FeedFilters } from '@/types'

interface FeedFiltersProps {
  filters: FeedFilters
  onFiltersChange: (filters: FeedFilters) => void
}

const sortOptions = [
  { value: 'trending', label: 'Trending', icon: Flame, color: 'text-orange-400' },
  { value: 'distance', label: 'Nearby', icon: MapPin, color: 'text-jury-primary' },
  { value: 'newest', label: 'Newest', icon: Clock, color: 'text-jury-secondary' },
] as const

export function FeedFilters({ filters, onFiltersChange }: FeedFiltersProps) {
  const [showDropdown, setShowDropdown] = useState(false)

  const currentSort = sortOptions.find((o) => o.value === filters.sortBy) || sortOptions[0]
  const SortIcon = currentSort.icon

  return (
    <div className="relative">
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className={`
          flex items-center gap-2.5 px-4 py-2.5 rounded-xl transition-all duration-200
          ${showDropdown
            ? 'bg-jury-primary/15 border border-jury-primary/30'
            : 'bg-jury-surface-light/50 border border-transparent hover:bg-jury-surface-light/70'
          }
        `}
      >
        <SortIcon className={`w-4 h-4 ${currentSort.color}`} />
        <span className="text-sm font-medium text-white">{currentSort.label}</span>
        <ChevronDown
          className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${
            showDropdown ? 'rotate-180' : ''
          }`}
        />
      </button>

      <AnimatePresence>
        {showDropdown && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-10"
              onClick={() => setShowDropdown(false)}
            />

            {/* Dropdown Menu */}
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="absolute top-full left-0 mt-2 w-52 z-20 card-base p-1.5 overflow-hidden"
            >
              {sortOptions.map((option) => {
                const Icon = option.icon
                const isActive = filters.sortBy === option.value

                return (
                  <button
                    key={option.value}
                    onClick={() => {
                      onFiltersChange({ ...filters, sortBy: option.value })
                      setShowDropdown(false)
                    }}
                    className={`
                      w-full flex items-center justify-between gap-3 px-3 py-3 rounded-lg
                      transition-all duration-150
                      ${isActive
                        ? 'bg-jury-primary/15 text-white'
                        : 'text-gray-300 hover:bg-jury-surface-light/60 hover:text-white'
                      }
                    `}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className={`w-4 h-4 ${isActive ? option.color : 'text-gray-500'}`} />
                      <span className="text-sm font-medium">{option.label}</span>
                    </div>
                    {isActive && (
                      <Check className="w-4 h-4 text-jury-primary" />
                    )}
                  </button>
                )
              })}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
