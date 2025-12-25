'use client'

import { useState } from 'react'
import { Header } from '@/components/layout/header'
import {
  DATA_SOURCE_DOCS,
  DataSourceDoc,
  getAllDataSourceDocs,
  getDataSourceDocsByCategory,
} from '@/lib/data-source-docs'
import {
  Search,
  Database,
  Globe,
  ArrowRight,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Copy,
  Check,
  Code,
  Table2,
  Info,
  ArrowLeft,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import Link from 'next/link'

const CATEGORY_INFO: Record<string, { name: string; description: string }> = {
  core: { name: 'Core Foundation', description: 'Essential data tables for the system' },
  match: { name: 'Match Data', description: 'Per-match statistics and events' },
  team: { name: 'Team Intelligence', description: 'Team analytics and history' },
  player: { name: 'Player Data', description: 'Player profiles and statistics' },
  external: { name: 'External Data', description: 'Third-party APIs and computed data' },
  prediction: { name: 'AI Predictions', description: 'Prediction data and accuracy tracking' },
}

export default function DataDocsPage() {
  const [search, setSearch] = useState('')
  const [expandedSources, setExpandedSources] = useState<Record<string, boolean>>({})
  const [copiedEndpoint, setCopiedEndpoint] = useState<string | null>(null)

  const sourcesByCategory = getDataSourceDocsByCategory()

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text)
    setCopiedEndpoint(id)
    setTimeout(() => setCopiedEndpoint(null), 2000)
  }

  const toggleSource = (id: string) => {
    setExpandedSources(prev => ({ ...prev, [id]: !prev[id] }))
  }

  // Filter sources by search
  const filterSources = (sources: DataSourceDoc[]) => {
    if (!search) return sources
    const lower = search.toLowerCase()
    return sources.filter(s =>
      s.name.toLowerCase().includes(lower) ||
      s.description.toLowerCase().includes(lower) ||
      s.longDescription.toLowerCase().includes(lower) ||
      s.tables.some(t => t.name.toLowerCase().includes(lower))
    )
  }

  // Calculate stats
  const allSources = getAllDataSourceDocs()
  const totalTables = allSources.reduce((acc, s) => acc + s.tables.length, 0)
  const totalEndpoints = allSources.reduce((acc, s) => acc + s.endpoints.length, 0)
  const externalApis = allSources.filter(s => s.externalApi).length

  return (
    <div className="min-h-screen">
      <Header title="Data Documentation" subtitle="API endpoints, database schemas, and usage guides" />

      <div className="p-6 space-y-6">
        {/* Back Link */}
        <Link
          href="/data"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Data Management
        </Link>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search data sources, tables, or endpoints..."
            className="w-full pl-10 pr-4 py-2.5 bg-card border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard icon={Database} label="Data Sources" value={allSources.length} />
          <StatCard icon={Globe} label="External APIs" value={externalApis} />
          <StatCard icon={Table2} label="Database Tables" value={totalTables} />
          <StatCard icon={Code} label="API Endpoints" value={totalEndpoints} />
        </div>

        {/* Categories */}
        <div className="space-y-6">
          {Object.entries(sourcesByCategory).map(([categoryId, sources]) => {
            const filteredSources = filterSources(sources)
            if (filteredSources.length === 0) return null

            const categoryInfo = CATEGORY_INFO[categoryId]

            return (
              <div key={categoryId} className="bg-card border border-border rounded-lg overflow-hidden">
                <div className="px-4 py-3 bg-muted/50 border-b border-border">
                  <h2 className="font-semibold">{categoryInfo.name}</h2>
                  <p className="text-xs text-muted-foreground">{categoryInfo.description}</p>
                </div>
                <div className="divide-y divide-border">
                  {filteredSources.map(source => (
                    <SourceDocSection
                      key={source.id}
                      source={source}
                      isExpanded={expandedSources[source.id] || false}
                      onToggle={() => toggleSource(source.id)}
                      onCopy={copyToClipboard}
                      copiedId={copiedEndpoint}
                    />
                  ))}
                </div>
              </div>
            )
          })}
        </div>

        {/* No Results */}
        {search && Object.values(sourcesByCategory).every(sources => filterSources(sources).length === 0) && (
          <div className="text-center py-12 text-muted-foreground">
            No data sources match "{search}"
          </div>
        )}
      </div>
    </div>
  )
}

function StatCard({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: number }) {
  return (
    <div className="bg-card border border-border rounded-lg p-4">
      <div className="flex items-center gap-2 mb-1">
        <Icon className="w-4 h-4 text-primary" />
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
      <div className="text-2xl font-bold">{value}</div>
    </div>
  )
}

function SourceDocSection({
  source,
  isExpanded,
  onToggle,
  onCopy,
  copiedId,
}: {
  source: DataSourceDoc
  isExpanded: boolean
  onToggle: () => void
  onCopy: (text: string, id: string) => void
  copiedId: string | null
}) {
  return (
    <div>
      {/* Header */}
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-4 hover:bg-muted/30 transition-colors text-left"
      >
        <div className="flex items-center gap-3">
          {source.externalApi ? (
            <Globe className="w-5 h-5 text-primary shrink-0" />
          ) : (
            <Database className="w-5 h-5 text-primary shrink-0" />
          )}
          <div>
            <div className="font-medium">{source.name}</div>
            <div className="text-sm text-muted-foreground">{source.description}</div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground hidden sm:block">
            {source.tables.length} table{source.tables.length !== 1 ? 's' : ''}
            {source.endpoints.length > 0 && ` | ${source.endpoints.length} endpoint${source.endpoints.length !== 1 ? 's' : ''}`}
          </span>
          {isExpanded ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
        </div>
      </button>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="px-4 pb-6 space-y-5">
          {/* Long Description */}
          <div className="flex gap-2 bg-muted/30 rounded-lg p-3">
            <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" />
            <p className="text-sm text-muted-foreground leading-relaxed">{source.longDescription}</p>
          </div>

          {/* Dependencies Graph */}
          <DependencyGraph source={source} />

          {/* Refresh Schedule */}
          <div className="text-sm">
            <span className="text-muted-foreground">Refresh Schedule: </span>
            <span className="font-medium">{source.refreshSchedule}</span>
          </div>

          {/* External API Section */}
          {source.externalApi && source.endpoints.length > 0 && (
            <Section title="External API" icon={Globe}>
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm">
                  <span className="font-medium">{source.externalApi.name}</span>
                  <span className="text-muted-foreground font-mono text-xs">{source.externalApi.baseUrl}</span>
                  {source.externalApi.docsUrl && (
                    <a
                      href={source.externalApi.docsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline text-xs flex items-center gap-0.5"
                    >
                      Docs <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>

                {source.endpoints.map((endpoint, i) => (
                  <div key={i} className="bg-muted/50 rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="font-mono text-sm">
                        <span className="text-green-600 dark:text-green-400 font-semibold">{endpoint.method}</span>{' '}
                        <span>{endpoint.path}</span>
                      </div>
                      <button
                        onClick={() => {
                          const fullUrl = `${source.externalApi!.baseUrl}${endpoint.path}`
                          onCopy(fullUrl, `${source.id}-${i}`)
                        }}
                        className="p-1.5 hover:bg-muted rounded transition-colors"
                        title="Copy endpoint"
                      >
                        {copiedId === `${source.id}-${i}` ? (
                          <Check className="w-4 h-4 text-green-500" />
                        ) : (
                          <Copy className="w-4 h-4 text-muted-foreground" />
                        )}
                      </button>
                    </div>

                    <p className="text-sm text-muted-foreground">{endpoint.description}</p>

                    {Object.keys(endpoint.params).length > 0 && (
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="text-left text-muted-foreground border-b border-border">
                              <th className="pb-2 pr-4 font-medium">Parameter</th>
                              <th className="pb-2 pr-4 font-medium">Type</th>
                              <th className="pb-2 pr-4 font-medium">Required</th>
                              <th className="pb-2 pr-4 font-medium">Description</th>
                              <th className="pb-2 font-medium">Example</th>
                            </tr>
                          </thead>
                          <tbody>
                            {Object.entries(endpoint.params).map(([key, param]) => (
                              <tr key={key} className="border-t border-border/50">
                                <td className="py-2 pr-4 font-mono text-primary">{key}</td>
                                <td className="py-2 pr-4">{param.type}</td>
                                <td className="py-2 pr-4">{param.required ? 'Yes' : 'No'}</td>
                                <td className="py-2 pr-4">{param.description}</td>
                                <td className="py-2 font-mono">{String(param.example)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {endpoint.responseExample && (
                      <div>
                        <div className="text-xs text-muted-foreground mb-1 font-medium">Response Example:</div>
                        <pre className="text-[10px] bg-background p-2 rounded overflow-x-auto font-mono leading-relaxed border border-border">
                          {JSON.stringify(endpoint.responseExample, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* Database Tables Section */}
          <Section title="Database Schema" icon={Database}>
            <div className="space-y-4">
              {source.tables.map((table, i) => (
                <div key={i} className="bg-muted/50 rounded-lg p-4 space-y-3">
                  <div>
                    <span className="font-mono text-sm font-semibold">{table.name}</span>
                    <span className="text-xs text-muted-foreground ml-2">({table.columns.length} columns)</span>
                  </div>
                  <p className="text-sm text-muted-foreground">{table.description}</p>

                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="text-left text-muted-foreground border-b border-border">
                          <th className="pb-2 pr-4 font-medium">Column</th>
                          <th className="pb-2 pr-4 font-medium">Type</th>
                          <th className="pb-2 pr-4 font-medium">Nullable</th>
                          <th className="pb-2 pr-4 font-medium">Description</th>
                          <th className="pb-2 font-medium">API Source</th>
                        </tr>
                      </thead>
                      <tbody>
                        {table.columns.map(col => (
                          <tr key={col.name} className="border-t border-border/50">
                            <td className="py-2 pr-4 font-mono">
                              {col.name}
                              {!col.nullable && <span className="text-red-400 ml-0.5">*</span>}
                            </td>
                            <td className="py-2 pr-4 text-muted-foreground">{col.type}</td>
                            <td className="py-2 pr-4">{col.nullable ? 'Yes' : 'No'}</td>
                            <td className="py-2 pr-4">{col.description}</td>
                            <td className="py-2 font-mono text-muted-foreground text-[10px]">{col.source || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {table.uniqueConstraints && table.uniqueConstraints.length > 0 && (
                    <div className="text-xs text-muted-foreground pt-2 border-t border-border/50">
                      <span className="font-medium">Unique Constraint:</span>{' '}
                      <span className="font-mono">{table.uniqueConstraints.join(', ')}</span>
                    </div>
                  )}
                </div>
              ))}

              {source.affectedTables && source.affectedTables.length > 0 && (
                <div className="text-sm flex items-center gap-2">
                  <span className="text-muted-foreground">Also affects:</span>
                  <div className="flex gap-1.5 flex-wrap">
                    {source.affectedTables.map(t => (
                      <span key={t} className="font-mono bg-muted px-2 py-0.5 rounded text-xs">{t}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </Section>

          {/* Example Data Section */}
          {(source.exampleData.apiResponse || source.exampleData.dbRecord) && (
            <Section title="Example Data" icon={Code}>
              <div className="space-y-4">
                {source.exampleData.apiResponse && (
                  <div>
                    <div className="text-xs text-muted-foreground mb-1 font-medium">API Response:</div>
                    <pre className="text-[10px] bg-muted/50 p-3 rounded overflow-x-auto font-mono leading-relaxed">
                      {JSON.stringify(source.exampleData.apiResponse, null, 2)}
                    </pre>
                  </div>
                )}
                {source.exampleData.dbRecord && (
                  <div>
                    <div className="text-xs text-muted-foreground mb-1 font-medium">Database Record:</div>
                    <pre className="text-[10px] bg-muted/50 p-3 rounded overflow-x-auto font-mono leading-relaxed">
                      {JSON.stringify(source.exampleData.dbRecord, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </Section>
          )}

          {/* Notes */}
          {source.notes && source.notes.length > 0 && (
            <Section title="Notes" icon={Info}>
              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                {source.notes.map((note, i) => (
                  <li key={i}>{note}</li>
                ))}
              </ul>
            </Section>
          )}
        </div>
      )}
    </div>
  )
}

function Section({
  title,
  icon: Icon,
  children,
}: {
  title: string
  icon: React.ComponentType<{ className?: string }>
  children: React.ReactNode
}) {
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold flex items-center gap-2 border-b border-border pb-2">
        <Icon className="w-4 h-4 text-primary" />
        {title}
      </h3>
      {children}
    </div>
  )
}

function DependencyGraph({ source }: { source: DataSourceDoc }) {
  if (source.dependencies.length === 0 && source.dependents.length === 0) return null

  return (
    <div className="flex flex-wrap items-center gap-2 text-xs bg-muted/30 rounded-lg p-3">
      {source.dependencies.length > 0 && (
        <>
          <span className="text-muted-foreground">Depends on:</span>
          {source.dependencies.map(dep => (
            <span
              key={dep}
              className="font-mono bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 px-2 py-0.5 rounded"
            >
              {dep}
            </span>
          ))}
          <ArrowRight className="w-4 h-4 text-muted-foreground" />
        </>
      )}

      <span className="font-mono bg-primary/10 text-primary px-2 py-0.5 rounded font-semibold">
        {source.name}
      </span>

      {source.dependents.length > 0 && (
        <>
          <ArrowRight className="w-4 h-4 text-muted-foreground" />
          <span className="text-muted-foreground">Used by:</span>
          {source.dependents.map(dep => (
            <span
              key={dep}
              className="font-mono bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-2 py-0.5 rounded"
            >
              {dep}
            </span>
          ))}
        </>
      )}
    </div>
  )
}
