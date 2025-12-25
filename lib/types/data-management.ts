/**
 * Data Management Types
 * Types and interfaces for the enhanced Data Management page
 */

import { LucideIcon } from 'lucide-react'

// Enhanced Log Entry
export interface EnhancedLogEntry {
  id: string
  timestamp: string              // ISO timestamp for ordering
  time: string                   // HH:MM:SS display format
  type: 'info' | 'success' | 'error' | 'warning' | 'progress'
  category: string               // 'fixtures', 'teams', etc.
  message: string
  details?: {
    endpoint?: string            // Full API URL called
    recordId?: string            // Specific record being processed
    recordName?: string          // Human-readable identifier
    progress?: {
      current: number
      total: number
      percentage: number
    }
    duration?: number            // Milliseconds elapsed
    error?: string               // Error details if applicable
    apiResponse?: {
      status: number
      remaining?: number         // Rate limit remaining
    }
  }
}

// Data source categories
export type DataCategory =
  | 'core'           // Core Foundation
  | 'match'          // Match Data
  | 'team'           // Team Intelligence
  | 'player'         // Player Data
  | 'external'       // External Data
  | 'prediction'     // AI Predictions

// Category metadata
export interface CategoryInfo {
  id: DataCategory
  name: string
  description: string
  icon: LucideIcon
}

// Individual data source configuration
export interface DataSourceConfig {
  id: string
  name: string
  tableName: string
  category: DataCategory
  icon: LucideIcon
  description: string
  endpoint: string | null          // API endpoint path (null if not refreshable via API)
  endpointParams?: Record<string, string | number>
  refreshEndpoint: string | null   // Internal API refresh route
  refreshable: boolean
  estimatedRecords?: number
  estimatedTime?: string           // e.g., "~2 min"
  rateLimit?: string               // e.g., "300ms delay per team"
  dependsOn?: string[]             // Other data sources this depends on
  affectedTables?: string[]        // Additional tables affected by refresh
}

// Stats for a single table
export interface TableStats {
  count: number
  lastUpdated: string | null
}

// Complete stats response from API
export interface DataStats {
  // Core Foundation
  leagues: TableStats
  venues: TableStats
  teams: TableStats
  fixtures: TableStats

  // Match Data
  fixture_statistics: TableStats
  fixture_events: TableStats
  lineups: TableStats
  standings: TableStats

  // Team Intelligence
  team_season_stats: TableStats
  injuries: TableStats
  head_to_head: TableStats

  // Player Data
  players: TableStats
  player_squads: TableStats
  player_season_stats: TableStats
  player_match_stats: TableStats
  top_performers: TableStats
  coaches: TableStats

  // External Data
  odds: TableStats
  weather: TableStats
  referee_stats: TableStats
  transfers: TableStats

  // AI Predictions
  predictions: TableStats
  prediction_history: TableStats
  api_predictions: TableStats
}

// Refresh response from API routes
export interface RefreshResponse {
  success: boolean
  imported: number
  errors: number
  skipped?: number
  total: number
  duration?: number               // Milliseconds
  endpoint?: string               // Full API URL used
  logs: Array<{
    type: 'info' | 'success' | 'error' | 'warning' | 'progress'
    message: string
    details?: {
      endpoint?: string
      recordId?: string
      recordName?: string
      progress?: { current: number; total: number }
      error?: string
    }
  }>
  error?: string                  // Error message if success is false
}

// UI State for refresh operations
export interface RefreshState {
  isRefreshing: boolean
  status: 'idle' | 'success' | 'error'
  progress?: {
    current: number
    total: number
  }
}

// Props for DataSourceCard component
export interface DataSourceCardProps {
  config: DataSourceConfig
  stats: TableStats | null
  refreshState: RefreshState
  onRefresh: () => void
  isExpanded?: boolean
  onToggleExpand?: () => void
}

// Props for CategorySection component
export interface CategorySectionProps {
  category: CategoryInfo
  dataSources: DataSourceConfig[]
  stats: Partial<DataStats>
  refreshStates: Record<string, RefreshState>
  onRefresh: (sourceId: string) => void
  isExpanded: boolean
  onToggleExpand: () => void
}

// Props for ActivityLog component
export interface ActivityLogProps {
  logs: EnhancedLogEntry[]
  onClear: () => void
  filter?: {
    category?: string
    type?: EnhancedLogEntry['type']
    search?: string
  }
  onFilterChange?: (filter: ActivityLogProps['filter']) => void
}

// Helper to create log entry
export function createLogEntry(
  type: EnhancedLogEntry['type'],
  category: string,
  message: string,
  details?: EnhancedLogEntry['details']
): EnhancedLogEntry {
  const now = new Date()
  return {
    id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    timestamp: now.toISOString(),
    time: now.toTimeString().slice(0, 8),
    type,
    category,
    message,
    details,
  }
}

// Helper to format duration
export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`
  return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`
}

// Helper to format relative time
export function formatRelativeTime(dateString: string | null): string {
  if (!dateString) return 'Never'

  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  return date.toLocaleDateString()
}
