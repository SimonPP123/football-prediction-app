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
} from 'lucide-react'

interface WeatherData {
  temperature?: number
  feels_like?: number
  humidity?: number
  wind_speed?: number
  wind_direction?: string
  description?: string
  precipitation_probability?: number
  condition?: string
}

interface WeatherSectionProps {
  weather: WeatherData | null
  compact?: boolean
}

function getWeatherIcon(condition?: string) {
  const c = condition?.toLowerCase() || ''

  if (c.includes('rain') || c.includes('shower')) return CloudRain
  if (c.includes('snow') || c.includes('sleet')) return CloudSnow
  if (c.includes('fog') || c.includes('mist')) return CloudFog
  if (c.includes('cloud') || c.includes('overcast')) return Cloud
  return Sun
}

function getWeatherColor(condition?: string) {
  const c = condition?.toLowerCase() || ''

  if (c.includes('rain') || c.includes('shower')) return 'text-blue-500'
  if (c.includes('snow') || c.includes('sleet')) return 'text-blue-300'
  if (c.includes('fog') || c.includes('mist')) return 'text-gray-400'
  if (c.includes('cloud') || c.includes('overcast')) return 'text-gray-500'
  return 'text-amber-500'
}

export function WeatherSection({ weather, compact = false }: WeatherSectionProps) {
  if (!weather) {
    return compact ? null : (
      <div className="text-center text-muted-foreground py-4">
        Weather data not available
      </div>
    )
  }

  const WeatherIcon = getWeatherIcon(weather.condition || weather.description)
  const iconColor = getWeatherColor(weather.condition || weather.description)

  if (compact) {
    return (
      <div className="flex items-center gap-2 text-sm">
        <WeatherIcon className={cn("w-4 h-4", iconColor)} />
        {weather.temperature !== undefined && (
          <span>{Math.round(weather.temperature)}°C</span>
        )}
        {weather.wind_speed !== undefined && (
          <span className="text-muted-foreground">
            <Wind className="w-3 h-3 inline mr-0.5" />
            {Math.round(weather.wind_speed)} km/h
          </span>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Main weather display */}
      <div className="flex items-center gap-4">
        <div className={cn("p-4 bg-muted/50 rounded-lg", iconColor)}>
          <WeatherIcon className="w-12 h-12" />
        </div>
        <div>
          <p className="text-2xl font-bold">
            {weather.temperature !== undefined ? `${Math.round(weather.temperature)}°C` : '-'}
          </p>
          <p className="text-sm text-muted-foreground capitalize">
            {weather.condition || weather.description || 'Unknown'}
          </p>
          {weather.feels_like !== undefined && (
            <p className="text-xs text-muted-foreground">
              Feels like {Math.round(weather.feels_like)}°C
            </p>
          )}
        </div>
      </div>

      {/* Weather details grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {weather.wind_speed !== undefined && (
          <div className="bg-muted/30 rounded-lg p-3">
            <div className="flex items-center gap-1 text-muted-foreground mb-1">
              <Wind className="w-3.5 h-3.5" />
              <span className="text-xs">Wind</span>
            </div>
            <p className="font-medium">
              {Math.round(weather.wind_speed)} km/h
              {weather.wind_direction && (
                <span className="text-xs text-muted-foreground ml-1">
                  {weather.wind_direction}
                </span>
              )}
            </p>
          </div>
        )}

        {weather.humidity !== undefined && (
          <div className="bg-muted/30 rounded-lg p-3">
            <div className="flex items-center gap-1 text-muted-foreground mb-1">
              <Droplets className="w-3.5 h-3.5" />
              <span className="text-xs">Humidity</span>
            </div>
            <p className="font-medium">{weather.humidity}%</p>
          </div>
        )}

        {weather.precipitation_probability !== undefined && (
          <div className="bg-muted/30 rounded-lg p-3">
            <div className="flex items-center gap-1 text-muted-foreground mb-1">
              <CloudRain className="w-3.5 h-3.5" />
              <span className="text-xs">Rain Chance</span>
            </div>
            <p className="font-medium">{weather.precipitation_probability}%</p>
          </div>
        )}

        {weather.feels_like !== undefined && (
          <div className="bg-muted/30 rounded-lg p-3">
            <div className="flex items-center gap-1 text-muted-foreground mb-1">
              <Thermometer className="w-3.5 h-3.5" />
              <span className="text-xs">Feels Like</span>
            </div>
            <p className="font-medium">{Math.round(weather.feels_like)}°C</p>
          </div>
        )}
      </div>

      {/* Impact assessment */}
      {(weather.wind_speed && weather.wind_speed > 30) ||
       (weather.precipitation_probability && weather.precipitation_probability > 50) ? (
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3">
          <p className="text-sm text-amber-600">
            <strong>Weather Impact:</strong>{' '}
            {weather.wind_speed && weather.wind_speed > 30 && 'Strong winds may affect long passes and set pieces. '}
            {weather.precipitation_probability && weather.precipitation_probability > 50 && 'High chance of rain - slippery pitch conditions expected.'}
          </p>
        </div>
      ) : null}
    </div>
  )
}
