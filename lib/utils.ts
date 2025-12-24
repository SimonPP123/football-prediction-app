import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export function formatTime(date: string | Date): string {
  return new Date(date).toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function formatDateTime(date: string | Date): string {
  return `${formatDate(date)} ${formatTime(date)}`
}

export function getFormColor(result: string): string {
  switch (result.toUpperCase()) {
    case 'W':
      return 'form-win'
    case 'D':
      return 'form-draw'
    case 'L':
      return 'form-loss'
    default:
      return 'bg-gray-300'
  }
}

export function getPredictionColor(prediction: string): string {
  switch (prediction) {
    case '1':
      return 'prediction-home'
    case 'X':
      return 'prediction-draw'
    case '2':
      return 'prediction-away'
    default:
      return 'bg-gray-100'
  }
}

export function getConfidenceColor(confidence: number): string {
  if (confidence >= 70) return 'text-green-600'
  if (confidence >= 50) return 'text-yellow-600'
  return 'text-red-600'
}
