'use client'

import { Scale, Bell, Settings } from 'lucide-react'
import Link from 'next/link'

interface HeaderProps {
  title?: string
  showLogo?: boolean
  showSettings?: boolean
  showNotifications?: boolean
}

export function Header({
  title,
  showLogo = true,
  showSettings = false,
  showNotifications = true,
}: HeaderProps) {
  return (
    <header className="sticky top-0 z-40 bg-jury-background/80 backdrop-blur-lg border-b border-jury-surface-light">
      <div className="flex items-center justify-between h-14 px-4 max-w-lg mx-auto">
        <div className="flex items-center gap-2">
          {showLogo && (
            <Link href="/feed" className="flex items-center gap-2">
              <Scale className="w-6 h-6 text-jury-primary" />
              <span className="font-bold text-lg">Jury</span>
            </Link>
          )}
          {title && !showLogo && (
            <h1 className="font-semibold text-lg">{title}</h1>
          )}
        </div>

        <div className="flex items-center gap-2">
          {showNotifications && (
            <button className="p-2 hover:bg-jury-surface rounded-lg transition-colors touch-target">
              <Bell className="w-5 h-5" />
            </button>
          )}
          {showSettings && (
            <Link href="/settings" className="p-2 hover:bg-jury-surface rounded-lg transition-colors touch-target">
              <Settings className="w-5 h-5" />
            </Link>
          )}
        </div>
      </div>
    </header>
  )
}
