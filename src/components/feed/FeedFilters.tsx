'use client'

import { useState } from 'react'
import { ChevronDown, Flame, MapPin, Clock } from 'lucide-react'
import type { FeedFilters } from '@/types'

interface FeedFiltersProps {
  filters: FeedFilters
  onFiltersChange: (filters: FeedFilters) => void
}

const sortOptions = [
  { value: 'trending', label: 'Trending', icon: Flame },
  { value: 'distance', label: 'Nearby', icon: MapPin },
  { value: 'newest', label: 'Newest', icon: Clock },
] as const

export function FeedFilters({ filters, onFiltersChange }: FeedFiltersProps) {
  const [showDropdown, setShowDropdown] = useState(false)

  const currentSort = sortOptions.find((o) => o.value === filters.sortBy) || sortOptions[0]
  const SortIcon = currentSort.icon

  return (
    <div className="relative">
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-jury-surface hover:bg-jury-surface-light transition-colors"
      >
        <SortIcon className="w-4 h-4 text-jury-primary" />
        <span className="text-sm font-medium">{currentSort.label}</span>
        <ChevronDown className={`w-4 h-4 transition-transform ${showDropdown ? 'rotate-180' : ''}`} />
      </button>

      {showDropdown && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setShowDropdown(false)}
          />
          <div className="absolute top-full left-0 mt-2 w-48 bg-jury-surface rounded-lg shadow-lg border border-jury-surface-light z-20 overflow-hidden">
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
                  className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-jury-surface-light transition-colors ${
                    isActive ? 'text-jury-primary' : ''
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="text-sm">{option.label}</span>
                </button>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
