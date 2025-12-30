'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { ChevronDown, Check, Loader2 } from 'lucide-react'
import { useLeague, LeagueConfig, getSeasonDisplay } from '@/contexts/league-context'
import { cn } from '@/lib/utils'

export function LeagueSelector() {
  const router = useRouter()
  const { currentLeague, leagues, isLoading, setCurrentLeague } = useLeague()
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Close dropdown on escape key
  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false)
      }
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [])

  const handleSelect = (league: LeagueConfig) => {
    setCurrentLeague(league)
    setIsOpen(false)
    // Refresh Server Components to pick up new league from cookie
    router.refresh()
  }

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-sm">Loading...</span>
      </div>
    )
  }

  if (!currentLeague) {
    return null
  }

  // Only show selector if there are multiple leagues
  const showDropdown = leagues.length > 1

  return (
    <div className="relative max-w-full" ref={dropdownRef}>
      <button
        onClick={() => showDropdown && setIsOpen(!isOpen)}
        className={cn(
          "flex items-center gap-2 px-2 sm:px-3 py-2 sm:py-2.5 rounded-lg transition-colors min-h-[44px]",
          showDropdown
            ? "hover:bg-muted cursor-pointer"
            : "cursor-default",
          isOpen && "bg-muted"
        )}
        disabled={!showDropdown}
      >
        {currentLeague.logo && (
          <Image
            src={currentLeague.logo}
            alt={currentLeague.name}
            width={24}
            height={24}
            className="rounded shrink-0"
          />
        )}
        <div className="flex flex-col items-start min-w-0">
          <span className="text-sm font-medium leading-tight truncate max-w-[120px] sm:max-w-none">
            {currentLeague.name}
          </span>
          <span className="text-xs text-muted-foreground leading-tight">
            {getSeasonDisplay(currentLeague.currentSeason)}
          </span>
        </div>
        {showDropdown && (
          <ChevronDown
            className={cn(
              "h-4 w-4 text-muted-foreground transition-transform shrink-0",
              isOpen && "transform rotate-180"
            )}
          />
        )}
      </button>

      {/* Dropdown menu - responsive width, centered on mobile */}
      {isOpen && showDropdown && (
        <div className="absolute top-full left-1/2 -translate-x-1/2 sm:left-0 sm:translate-x-0 mt-1 w-[calc(100vw-2rem)] sm:w-64 max-w-[280px] bg-popover border rounded-lg shadow-lg z-50 py-1 animate-in fade-in-0 zoom-in-95">
          {leagues.map((league) => (
            <button
              key={league.id}
              onClick={() => handleSelect(league)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-3 sm:py-2 hover:bg-muted transition-colors min-h-[48px] sm:min-h-0",
                league.id === currentLeague.id && "bg-muted"
              )}
            >
              {league.logo && (
                <Image
                  src={league.logo}
                  alt={league.name}
                  width={28}
                  height={28}
                  className="rounded shrink-0"
                />
              )}
              <div className="flex flex-col items-start flex-1 min-w-0">
                <span className="text-sm font-medium truncate w-full">{league.name}</span>
                <span className="text-xs text-muted-foreground truncate w-full">
                  {league.country} - {getSeasonDisplay(league.currentSeason)}
                </span>
              </div>
              {league.id === currentLeague.id && (
                <Check className="h-4 w-4 text-primary shrink-0" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
