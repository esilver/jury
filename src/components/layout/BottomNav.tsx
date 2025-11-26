'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, PlusCircle, Map, User, MessageCircle } from 'lucide-react'

const navItems = [
  { href: '/feed', icon: Home, label: 'Feed' },
  { href: '/create', icon: PlusCircle, label: 'Create' },
  { href: '/map', icon: Map, label: 'Map' },
  { href: '/messages', icon: MessageCircle, label: 'Chat' },
  { href: '/profile', icon: User, label: 'Profile' },
]

export function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 glass-strong safe-area-bottom">
      {/* Top gradient line */}
      <div className="h-px bg-gradient-to-r from-transparent via-jury-primary/30 to-transparent" />

      <div className="flex justify-around items-center h-18 max-w-lg mx-auto px-2">
        {navItems.map(({ href, icon: Icon, label }) => {
          const isActive = pathname === href || pathname.startsWith(`${href}/`)
          const isCreate = href === '/create'

          if (isCreate) {
            return (
              <Link
                key={href}
                href={href}
                className="relative flex flex-col items-center justify-center w-16 -mt-4"
              >
                <div className={`
                  relative p-3.5 rounded-2xl transition-all duration-300
                  ${isActive
                    ? 'bg-gradient-to-br from-jury-primary to-jury-secondary shadow-glow-primary'
                    : 'bg-gradient-to-br from-jury-primary/80 to-jury-secondary/80 hover:from-jury-primary hover:to-jury-secondary'
                  }
                `}>
                  <Icon className="w-6 h-6 text-white" strokeWidth={2} />
                </div>
                <span className={`text-[10px] mt-1.5 font-medium transition-colors ${
                  isActive ? 'text-jury-primary' : 'text-slate-500'
                }`}>
                  {label}
                </span>
              </Link>
            )
          }

          return (
            <Link
              key={href}
              href={href}
              className="flex flex-col items-center justify-center w-16 h-full touch-target transition-all duration-200 group"
            >
              <div className={`
                relative p-2 rounded-xl transition-all duration-200
                ${isActive ? 'bg-jury-primary/10' : 'group-hover:bg-slate-100'}
              `}>
                <Icon
                  className={`w-5 h-5 transition-all duration-200 ${
                    isActive
                      ? 'text-jury-primary'
                      : 'text-slate-500 group-hover:text-slate-700'
                  }`}
                  strokeWidth={isActive ? 2.5 : 2}
                />
                {isActive && (
                  <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-jury-primary rounded-full" />
                )}
              </div>
              <span className={`text-[10px] mt-1 font-medium transition-colors ${
                isActive ? 'text-jury-primary' : 'text-slate-500 group-hover:text-slate-600'
              }`}>
                {label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
