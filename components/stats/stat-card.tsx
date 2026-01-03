'use client'

import { cn } from '@/lib/utils'
import { LucideIcon, TrendingUp, TrendingDown, Minus, Info } from 'lucide-react'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

interface StatCardProps {
  label: string
  value: string | number
  icon?: LucideIcon
  trend?: 'up' | 'down' | 'neutral'
  trendValue?: string
  description?: string
  info?: string
  color?: 'default' | 'green' | 'red' | 'amber' | 'blue' | 'purple'
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const colorClasses = {
  default: 'border-border',
  green: 'border-green-500/30 bg-green-500/5',
  red: 'border-red-500/30 bg-red-500/5',
  amber: 'border-amber-500/30 bg-amber-500/5',
  blue: 'border-blue-500/30 bg-blue-500/5',
  purple: 'border-purple-500/30 bg-purple-500/5',
}

const iconColorClasses = {
  default: 'text-primary',
  green: 'text-green-500',
  red: 'text-red-500',
  amber: 'text-amber-500',
  blue: 'text-blue-500',
  purple: 'text-purple-500',
}

const sizeClasses = {
  sm: { container: 'p-3', value: 'text-xl', label: 'text-xs', icon: 'w-4 h-4' },
  md: { container: 'p-4', value: 'text-2xl', label: 'text-sm', icon: 'w-5 h-5' },
  lg: { container: 'p-5', value: 'text-3xl', label: 'text-base', icon: 'w-6 h-6' },
}

export function StatCard({
  label,
  value,
  icon: Icon,
  trend,
  trendValue,
  description,
  info,
  color = 'default',
  size = 'md',
  className,
}: StatCardProps) {
  const sizes = sizeClasses[size]

  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus
  const trendColor = trend === 'up' ? 'text-green-500' : trend === 'down' ? 'text-red-500' : 'text-muted-foreground'

  return (
    <div
      className={cn(
        'bg-card border rounded-lg',
        colorClasses[color],
        sizes.container,
        className
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className={cn('text-muted-foreground font-medium flex items-center gap-1', sizes.label)}>
            <span>{label}</span>
            {info && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="w-3 h-3 cursor-help opacity-60 hover:opacity-100 transition-opacity" />
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-[250px]">
                    <p className="text-xs">{info}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
          <p className={cn('font-bold mt-1', sizes.value)}>
            {value}
          </p>
          {description && (
            <p className="text-xs text-muted-foreground mt-1 truncate">
              {description}
            </p>
          )}
          {trend && trendValue && (
            <div className={cn('flex items-center gap-1 mt-1', trendColor)}>
              <TrendIcon className="w-3 h-3" />
              <span className="text-xs font-medium">{trendValue}</span>
            </div>
          )}
        </div>
        {Icon && (
          <div className={cn('shrink-0', iconColorClasses[color])}>
            <Icon className={sizes.icon} />
          </div>
        )}
      </div>
    </div>
  )
}
