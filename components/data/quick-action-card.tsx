'use client'

import { LucideIcon, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'

export type CardStatus = 'ready' | 'recommended' | 'needs-attention' | 'running'

interface QuickActionCardProps {
  title: string
  description: string
  icon: LucideIcon
  endpoints: string[]
  estimatedTime: string
  status: CardStatus
  onClick: () => void
  disabled?: boolean
  targetDisplay?: string
}

const statusConfig: Record<CardStatus, { dot: string; border: string; bg: string; label: string }> = {
  ready: {
    dot: 'bg-blue-500',
    border: 'border-border hover:border-blue-300',
    bg: 'bg-card hover:bg-blue-50/50',
    label: 'Ready',
  },
  recommended: {
    dot: 'bg-green-500 animate-pulse',
    border: 'border-green-300 hover:border-green-400',
    bg: 'bg-green-50/50 hover:bg-green-50',
    label: 'Recommended',
  },
  'needs-attention': {
    dot: 'bg-amber-500',
    border: 'border-amber-300 hover:border-amber-400',
    bg: 'bg-amber-50/50 hover:bg-amber-50',
    label: 'Needs Attention',
  },
  running: {
    dot: 'bg-primary animate-pulse',
    border: 'border-primary',
    bg: 'bg-primary/5',
    label: 'Running...',
  },
}

export function QuickActionCard({
  title,
  description,
  icon: Icon,
  endpoints,
  estimatedTime,
  status,
  onClick,
  disabled,
  targetDisplay,
}: QuickActionCardProps) {
  const config = statusConfig[status]
  const isRunning = status === 'running'

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          onClick={onClick}
          disabled={disabled || isRunning}
          className={cn(
            'relative flex flex-col items-start p-4 rounded-lg border-2 transition-all text-left w-full',
            config.border,
            config.bg,
            disabled && 'opacity-50 cursor-not-allowed',
            !disabled && !isRunning && 'cursor-pointer'
          )}
        >
          {/* Status indicator dot */}
          <div className="absolute top-3 right-3 flex items-center gap-1.5">
            <span className={cn('w-2.5 h-2.5 rounded-full', config.dot)} />
            <span className="text-[10px] font-medium text-muted-foreground uppercase">
              {config.label}
            </span>
          </div>

          {/* Icon and Title */}
          <div className="flex items-center gap-2 mb-2">
            {isRunning ? (
              <Loader2 className="w-5 h-5 text-primary animate-spin" />
            ) : (
              <Icon className="w-5 h-5 text-primary" />
            )}
            <span className="font-semibold text-sm">{title}</span>
          </div>

          {/* Description */}
          <p className="text-xs text-muted-foreground mb-3">{description}</p>

          {/* Footer: endpoint count and time */}
          <div className="flex items-center justify-between w-full mt-auto pt-2 border-t border-border/50">
            <span className="text-[10px] text-muted-foreground">
              {endpoints.length} endpoints
            </span>
            <span className="text-[10px] font-medium text-muted-foreground">
              {estimatedTime}
            </span>
          </div>

          {/* Target leagues display */}
          {targetDisplay && (
            <div className="mt-2 text-[10px] text-primary font-medium truncate w-full">
              {targetDisplay}
            </div>
          )}
        </button>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="max-w-xs">
        <p className="font-semibold mb-1">{title}</p>
        <p className="text-xs text-muted-foreground mb-2">{description}</p>
        <div className="flex flex-wrap gap-1">
          {endpoints.map((ep) => (
            <code key={ep} className="text-[10px] bg-muted px-1.5 py-0.5 rounded">
              {ep}
            </code>
          ))}
        </div>
      </TooltipContent>
    </Tooltip>
  )
}
