'use client'

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
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
  Menu,
  X,
  Activity,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { UpdateProvider } from '@/components/updates/update-provider'
import { GlobalStatusBar } from '@/components/updates/global-status-bar'
import { ToastNotificationContainer } from '@/components/updates/toast-notification'
import { UpdatePoller } from '@/components/updates/update-poller'

const SIDEBAR_COLLAPSED_KEY = 'football-ai-sidebar-collapsed'

const navItems = [
  { href: '/', label: 'Dashboard', icon: Home },
  { href: '/predictions', label: 'Predictions', icon: TrendingUp },
  { href: '/standings', label: 'Standings', icon: Trophy },
  { href: '/teams', label: 'Teams', icon: Users },
  { href: '/matches', label: 'Matches', icon: Calendar },
  { href: '/stats', label: 'Statistics', icon: BarChart3 },
  { href: '/activity', label: 'Activity', icon: Activity },
  { href: '/data', label: 'Data', icon: Database },
  { href: '/data/docs', label: 'API Docs', icon: FileText },
]

export function LayoutWrapper({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const [mounted, setMounted] = useState(false)
  const pathname = usePathname()

  // Load collapsed state from localStorage
  useEffect(() => {
    setMounted(true)
    try {
      const stored = localStorage.getItem(SIDEBAR_COLLAPSED_KEY)
      if (stored === 'true') {
        setCollapsed(true)
      }
    } catch (error) {
      console.error('Failed to load sidebar state:', error)
    }
  }, [])

  // Save collapsed state to localStorage
  const toggleCollapsed = () => {
    const newValue = !collapsed
    setCollapsed(newValue)
    try {
      localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(newValue))
    } catch (error) {
      console.error('Failed to save sidebar state:', error)
    }
  }

  // Don't show layout on login page
  if (pathname === '/login') {
    return <>{children}</>
  }

  return (
    <UpdateProvider>
      <div className="flex min-h-screen bg-background">
      {/* Mobile Header */}
      <header className="fixed top-0 left-0 right-0 z-40 bg-card border-b border-border md:hidden">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-lg">⚽</span>
            </div>
            <span className="font-bold">Football AI</span>
          </div>
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 hover:bg-muted rounded-lg"
          >
            <Menu className="w-6 h-6" />
          </button>
        </div>
      </header>

      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 bg-card border-r border-border transform transition-all duration-300 ease-in-out md:relative md:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full',
          mounted && collapsed ? 'md:w-16' : 'md:w-64',
          'w-64' // Mobile always full width
        )}
      >
        <div className="p-4 h-full flex flex-col">
          {/* Logo and Collapse Toggle */}
          <div className="flex items-center justify-between mb-6">
            <div className={cn(
              "flex items-center gap-3 transition-all duration-300",
              mounted && collapsed ? "md:justify-center md:w-full" : "px-3 py-4"
            )}>
              <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center shrink-0">
                <span className="text-xl">⚽</span>
              </div>
              <div className={cn(
                "transition-opacity duration-300",
                mounted && collapsed ? "md:hidden" : ""
              )}>
                <h1 className="font-bold text-lg">Football AI</h1>
                <p className="text-xs text-muted-foreground">Premier League 2025</p>
              </div>
            </div>
            {/* Collapse button - Desktop only */}
            <button
              onClick={toggleCollapsed}
              className={cn(
                "hidden md:flex items-center justify-center p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors",
                mounted && collapsed ? "md:absolute md:right-2 md:top-4" : ""
              )}
              title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {collapsed ? (
                <ChevronRight className="w-5 h-5" />
              ) : (
                <ChevronLeft className="w-5 h-5" />
              )}
            </button>
            {/* Close button - mobile only */}
            <button
              onClick={() => setSidebarOpen(false)}
              className="p-2 hover:bg-muted rounded-lg md:hidden"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="space-y-1 flex-1">
            {navItems.map((item) => {
              const isActive = pathname === item.href ||
                (item.href !== '/' && pathname.startsWith(item.href))
              const Icon = item.icon

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={cn(
                    'flex items-center gap-3 rounded-lg text-sm font-medium transition-all duration-200',
                    mounted && collapsed ? 'md:justify-center md:px-2 md:py-2.5' : 'px-3 py-2.5',
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  )}
                  title={mounted && collapsed ? item.label : undefined}
                >
                  <Icon className="w-5 h-5 shrink-0" />
                  <span className={cn(
                    "transition-opacity duration-300",
                    mounted && collapsed ? "md:hidden" : ""
                  )}>
                    {item.label}
                  </span>
                </Link>
              )
            })}
          </nav>

        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto pt-16 md:pt-0 flex flex-col">
        {/* Global Status Bar - Desktop only */}
        <div className="hidden md:block sticky top-0 z-30">
          <GlobalStatusBar />
        </div>
        <div className="flex-1">
          {children}
        </div>
      </main>

      {/* Toast Notifications */}
      <ToastNotificationContainer />

      {/* Background Poller */}
      <UpdatePoller />
    </div>
    </UpdateProvider>
  )
}
