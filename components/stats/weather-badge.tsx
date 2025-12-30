'use client'

import { cn } from '@/lib/utils'
import {
  Sun,
  Cloud,
  CloudRain,
  CloudSnow,
  CloudFog,
  Wind,
  Thermometer,
  Droplets,
  CloudLightning,
} from 'lucide-react'

interface WeatherData {
  temperature?: number
  feelsLike?: number
  humidity?: number
  windSpeed?: number
  precipitation?: number
  condition?: string
  description?: string
}

interface WeatherBadgeProps {
  weather: WeatherData
  variant?: 'badge' | 'card' | 'inline' | 'detailed'
  className?: string
}

function getWeatherIcon(condition?: string) {
  if (!condition) return Sun
  const c = condition.toLowerCase()

  if (c.includes('thunder') || c.includes('storm')) return CloudLightning
  if (c.includes('snow') || c.includes('sleet')) return CloudSnow
  if (c.includes('rain') || c.includes('drizzle') || c.includes('shower')) return CloudRain
  if (c.includes('fog') || c.includes('mist') || c.includes('haze')) return CloudFog
  if (c.includes('cloud') || c.includes('overcast')) return Cloud
  return Sun
}

function getWeatherColor(condition?: string): string {
  if (!condition) return 'text-amber-500'
  const c = condition.toLowerCase()

  if (c.includes('thunder') || c.includes('storm')) return 'text-purple-500'
  if (c.includes('snow')) return 'text-blue-300'
  if (c.includes('rain') || c.includes('drizzle')) return 'text-blue-500'
  if (c.includes('fog') || c.includes('mist')) return 'text-gray-400'
  if (c.includes('cloud')) return 'text-gray-500'
  return 'text-amber-500'
}

export function WeatherBadge({
  weather,
  variant = 'badge',
  className,
}: WeatherBadgeProps) {
  const WeatherIcon = getWeatherIcon(weather.condition)
  const iconColor = getWeatherColor(weather.condition)

  if (variant === 'inline') {
    return (
      <div className={cn('inline-flex items-center gap-1.5 text-xs', className)}>
        <WeatherIcon className={cn('w-4 h-4', iconColor)} />
        {weather.temperature !== undefined && (
          <span className="font-medium">{Math.round(weather.temperature)}°C</span>
        )}
      </div>
    )
  }

  if (variant === 'badge') {
    return (
      <div
        className={cn(
          'inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-muted text-xs',
          className
        )}
        title={weather.description || weather.condition}
      >
        <WeatherIcon className={cn('w-3.5 h-3.5', iconColor)} />
        {weather.temperature !== undefined && (
          <span className="font-medium">{Math.round(weather.temperature)}°C</span>
        )}
        {weather.windSpeed !== undefined && weather.windSpeed > 20 && (
          <>
            <span className="text-muted-foreground">|</span>
            <Wind className="w-3 h-3 text-blue-500" />
            <span>{Math.round(weather.windSpeed)} km/h</span>
          </>
        )}
      </div>
    )
  }

  if (variant === 'detailed') {
    return (
      <div className={cn('space-y-3', className)}>
        <div className="flex items-center gap-2">
          <WeatherIcon className={cn('w-8 h-8', iconColor)} />
          <div>
            <p className="font-medium capitalize">
              {weather.description || weather.condition || 'Clear'}
            </p>
            {weather.temperature !== undefined && (
              <p className="text-2xl font-bold">{Math.round(weather.temperature)}°C</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 text-sm">
          {weather.feelsLike !== undefined && (
            <div className="flex items-center gap-2">
              <Thermometer className="w-4 h-4 text-orange-500" />
              <div>
                <p className="text-[10px] text-muted-foreground">Feels like</p>
                <p className="font-medium">{Math.round(weather.feelsLike)}°C</p>
              </div>
            </div>
          )}
          {weather.humidity !== undefined && (
            <div className="flex items-center gap-2">
              <Droplets className="w-4 h-4 text-blue-500" />
              <div>
                <p className="text-[10px] text-muted-foreground">Humidity</p>
                <p className="font-medium">{Math.round(weather.humidity)}%</p>
              </div>
            </div>
          )}
          {weather.windSpeed !== undefined && (
            <div className="flex items-center gap-2">
              <Wind className="w-4 h-4 text-cyan-500" />
              <div>
                <p className="text-[10px] text-muted-foreground">Wind</p>
                <p className="font-medium">{Math.round(weather.windSpeed)} km/h</p>
              </div>
            </div>
          )}
          {weather.precipitation !== undefined && (
            <div className="flex items-center gap-2">
              <CloudRain className="w-4 h-4 text-blue-600" />
              <div>
                <p className="text-[10px] text-muted-foreground">Precipitation</p>
                <p className="font-medium">{weather.precipitation} mm</p>
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  // card variant
  return (
    <div className={cn('bg-card border rounded-lg p-3', className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <WeatherIcon className={cn('w-6 h-6', iconColor)} />
          <div>
            <p className="text-xs text-muted-foreground capitalize">
              {weather.description || weather.condition || 'Clear'}
            </p>
            {weather.temperature !== undefined && (
              <p className="text-lg font-bold">{Math.round(weather.temperature)}°C</p>
            )}
          </div>
        </div>
        <div className="text-right text-xs">
          {weather.windSpeed !== undefined && (
            <p className="flex items-center gap-1 justify-end">
              <Wind className="w-3 h-3" />
              {Math.round(weather.windSpeed)} km/h
            </p>
          )}
          {weather.humidity !== undefined && (
            <p className="flex items-center gap-1 justify-end text-muted-foreground">
              <Droplets className="w-3 h-3" />
              {Math.round(weather.humidity)}%
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
