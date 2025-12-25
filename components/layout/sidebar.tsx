'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  Home,
  TrendingUp,
  Trophy,
  Users,
  Calendar,
  BarChart3,
  Database,
  FileText,
} from 'lucide-react'

const navItems = [
  { href: '/', label: 'Dashboard', icon: Home },
  { href: '/predictions', label: 'Predictions', icon: TrendingUp },
  { href: '/standings', label: 'Standings', icon: Trophy },
  { href: '/teams', label: 'Teams', icon: Users },
  { href: '/matches', label: 'Matches', icon: Calendar },
  { href: '/stats', label: 'Statistics', icon: BarChart3 },
  { href: '/data', label: 'Data Management', icon: Database },
  { href: '/data/docs', label: 'API Docs', icon: FileText },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-64 bg-card border-r border-border min-h-screen p-4">
      {/* Logo */}
      <div className="flex items-center gap-3 px-3 py-4 mb-6">
        <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
          <span className="text-xl">⚽</span>
        </div>
        <div>
          <h1 className="font-bold text-lg">Football AI</h1>
          <p className="text-xs text-muted-foreground">Premier League 2025</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="space-y-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href ||
            (item.href !== '/' && pathname.startsWith(item.href))
          const Icon = item.icon

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              <Icon className="w-5 h-5" />
              {item.label}
            </Link>
          )
        })}
      </nav>

    </aside>
  )
}
