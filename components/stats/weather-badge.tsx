'use client'

import { Cloud, Sun, CloudRain, Wind, Snowflake, CloudFog } from 'lucide-react'
import { cn } from '@/lib/utils'

interface WeatherBadgeProps {
  weather: {
    temperature?: number
    condition?: string
    windSpeed?: number
  }
  variant?: 'inline' | 'full'
  className?: string
}

const weatherIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  clear: Sun,
  sunny: Sun,
  cloudy: Cloud,
  clouds: Cloud,
  overcast: Cloud,
  rain: CloudRain,
  drizzle: CloudRain,
  snow: Snowflake,
  fog: CloudFog,
  mist: CloudFog,
}

function getWeatherIcon(condition?: string) {
  if (!condition) return Cloud
  const normalizedCondition = condition.toLowerCase()
  for (const [key, icon] of Object.entries(weatherIcons)) {
    if (normalizedCondition.includes(key)) return icon
  }
  return Cloud
}

export function WeatherBadge({ weather, variant = 'inline', className }: WeatherBadgeProps) {
  const Icon = getWeatherIcon(weather.condition)

  if (variant === 'inline') {
    return (
      <div className={cn('flex items-center gap-1 text-xs text-muted-foreground', className)}>
        <Icon className="w-3.5 h-3.5" />
        {weather.temperature !== undefined && (
          <span>{Math.round(weather.temperature)}°</span>
        )}
      </div>
    )
  }

  return (
    <div className={cn('flex items-center gap-2 text-sm', className)}>
      <Icon className="w-4 h-4" />
      <div className="flex items-center gap-2">
        {weather.temperature !== undefined && (
          <span>{Math.round(weather.temperature)}°C</span>
        )}
        {weather.condition && (
          <span className="text-muted-foreground capitalize">{weather.condition}</span>
        )}
        {weather.windSpeed !== undefined && (
          <span className="flex items-center gap-1 text-muted-foreground">
            <Wind className="w-3 h-3" />
            {Math.round(weather.windSpeed)} km/h
          </span>
        )}
      </div>
    </div>
  )
}
