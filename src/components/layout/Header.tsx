'use client'

import { Scale, Bell, Settings, Sparkles } from 'lucide-react'
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
    <header className="sticky top-0 z-50 glass-strong">
      <div className="flex items-center justify-between h-16 px-4 max-w-lg mx-auto">
        <div className="flex items-center gap-3">
          {showLogo && (
            <Link href="/feed" className="flex items-center gap-2.5 group">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-jury-primary to-jury-secondary rounded-xl blur-lg opacity-50 group-hover:opacity-75 transition-opacity" />
                <div className="relative p-2 bg-gradient-to-br from-jury-primary to-jury-secondary rounded-xl">
                  <Scale className="w-5 h-5 text-white" />
                </div>
              </div>
              <span className="font-bold text-xl tracking-tight">
                <span className="text-gradient-primary">Jury</span>
              </span>
            </Link>
          )}
          {title && !showLogo && (
            <h1 className="font-semibold text-lg text-slate-800">{title}</h1>
          )}
        </div>

        <div className="flex items-center gap-1">
          {showNotifications && (
            <button className="icon-btn relative group">
              <Bell className="w-5 h-5 text-slate-500 group-hover:text-slate-800 transition-colors" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-jury-primary rounded-full animate-pulse" />
            </button>
          )}
          {showSettings && (
            <Link href="/settings" className="icon-btn group">
              <Settings className="w-5 h-5 text-slate-500 group-hover:text-slate-800 transition-colors" />
            </Link>
          )}
        </div>
      </div>
      {/* Subtle bottom gradient line */}
      <div className="h-px bg-gradient-to-r from-transparent via-jury-primary/30 to-transparent" />
    </header>
  )
}
