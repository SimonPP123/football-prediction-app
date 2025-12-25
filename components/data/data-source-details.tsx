'use client'

import { useState } from 'react'
import { ChevronDown, ChevronRight, ExternalLink, Copy, Check, Database, Globe, Code, Info } from 'lucide-react'
import { cn } from '@/lib/utils'
import { DataSourceDoc, EndpointDoc, TableDoc } from '@/lib/data-source-docs'

interface DataSourceDetailsProps {
  doc: DataSourceDoc
  isExpanded: boolean
  onToggle: () => void
}

export function DataSourceDetails({ doc, isExpanded, onToggle }: DataSourceDetailsProps) {
  const [copiedEndpoint, setCopiedEndpoint] = useState(false)
  const [activeTab, setActiveTab] = useState<'api' | 'database' | 'example'>('api')

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopiedEndpoint(true)
    setTimeout(() => setCopiedEndpoint(false), 2000)
  }

  // If no external API, default to database tab
  const effectiveTab = !doc.externalApi && activeTab === 'api' ? 'database' : activeTab

  return (
    <div className="border-t border-border">
      {/* Toggle Button */}
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-2 text-xs text-muted-foreground hover:bg-muted/50 transition-colors"
      >
        <span className="flex items-center gap-1.5">
          <Info className="w-3 h-3" />
          Technical Details
        </span>
        {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
      </button>

      {isExpanded && (
        <div className="px-4 pb-4 space-y-4">
          {/* Long Description */}
          <p className="text-xs text-muted-foreground leading-relaxed">
            {doc.longDescription}
          </p>

          {/* Tabs */}
          <div className="flex gap-1 border-b border-border">
            {doc.externalApi && (
              <TabButton
                active={effectiveTab === 'api'}
                onClick={() => setActiveTab('api')}
                icon={Globe}
              >
                External API
              </TabButton>
            )}
            <TabButton
              active={effectiveTab === 'database'}
              onClick={() => setActiveTab('database')}
              icon={Database}
            >
              Database
            </TabButton>
            <TabButton
              active={effectiveTab === 'example'}
              onClick={() => setActiveTab('example')}
              icon={Code}
            >
              Example
            </TabButton>
          </div>

          {/* API Tab */}
          {effectiveTab === 'api' && doc.externalApi && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-xs">
                <span className="text-muted-foreground">API:</span>
                <span className="font-medium">{doc.externalApi.name}</span>
                {doc.externalApi.docsUrl && (
                  <a
                    href={doc.externalApi.docsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline flex items-center gap-0.5"
                  >
                    Docs <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>

              {doc.endpoints.map((endpoint, i) => (
                <EndpointBlock
                  key={i}
                  endpoint={endpoint}
                  baseUrl={doc.externalApi!.baseUrl}
                  onCopy={copyToClipboard}
                  copied={copiedEndpoint}
                />
              ))}
            </div>
          )}

          {/* Database Tab */}
          {effectiveTab === 'database' && (
            <div className="space-y-3">
              {doc.tables.map((table, i) => (
                <TableBlock key={i} table={table} />
              ))}

              {doc.affectedTables && doc.affectedTables.length > 0 && (
                <div className="text-xs flex items-center gap-2">
                  <span className="text-muted-foreground">Also affects:</span>
                  <div className="flex gap-1 flex-wrap">
                    {doc.affectedTables.map(t => (
                      <span key={t} className="font-mono bg-muted px-1.5 py-0.5 rounded text-[10px]">{t}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* Dependencies */}
              {(doc.dependencies.length > 0 || doc.dependents.length > 0) && (
                <div className="pt-2 border-t border-border/50 space-y-1.5">
                  {doc.dependencies.length > 0 && (
                    <div className="text-xs flex items-center gap-2">
                      <span className="text-muted-foreground">Requires:</span>
                      <div className="flex gap-1 flex-wrap">
                        {doc.dependencies.map(d => (
                          <span key={d} className="font-mono bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 px-1.5 py-0.5 rounded text-[10px]">
                            {d}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {doc.dependents.length > 0 && (
                    <div className="text-xs flex items-center gap-2">
                      <span className="text-muted-foreground">Used by:</span>
                      <div className="flex gap-1 flex-wrap">
                        {doc.dependents.map(d => (
                          <span key={d} className="font-mono bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-1.5 py-0.5 rounded text-[10px]">
                            {d}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Example Tab */}
          {effectiveTab === 'example' && (
            <div className="space-y-3">
              {doc.exampleData.apiResponse && (
                <div>
                  <div className="text-xs text-muted-foreground mb-1 font-medium">API Response:</div>
                  <pre className="text-[10px] bg-muted p-2 rounded overflow-x-auto font-mono leading-relaxed">
                    {JSON.stringify(doc.exampleData.apiResponse, null, 2)}
                  </pre>
                </div>
              )}
              {doc.exampleData.dbRecord && (
                <div>
                  <div className="text-xs text-muted-foreground mb-1 font-medium">Database Record:</div>
                  <pre className="text-[10px] bg-muted p-2 rounded overflow-x-auto font-mono leading-relaxed">
                    {JSON.stringify(doc.exampleData.dbRecord, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}

          {/* Notes */}
          {doc.notes && doc.notes.length > 0 && (
            <div className="text-xs space-y-1 pt-2 border-t border-border/50">
              <div className="text-muted-foreground font-medium mb-1">Notes:</div>
              {doc.notes.map((note, i) => (
                <div key={i} className="flex gap-2 text-muted-foreground">
                  <span className="text-primary">*</span>
                  <span>{note}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// Tab Button Component
function TabButton({
  active,
  onClick,
  icon: Icon,
  children
}: {
  active: boolean
  onClick: () => void
  icon: React.ComponentType<{ className?: string }>
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-1.5 px-3 py-1.5 text-xs border-b-2 -mb-px transition-colors",
        active
          ? "border-primary text-primary"
          : "border-transparent text-muted-foreground hover:text-foreground"
      )}
    >
      <Icon className="w-3 h-3" />
      {children}
    </button>
  )
}

// Endpoint Block Component
function EndpointBlock({
  endpoint,
  baseUrl,
  onCopy,
  copied
}: {
  endpoint: EndpointDoc
  baseUrl: string
  onCopy: (s: string) => void
  copied: boolean
}) {
  const fullUrl = `${baseUrl}${endpoint.path}`
  const paramsStr = Object.entries(endpoint.params)
    .map(([k, v]) => `${k}=${v.example}`)
    .join('&')
  const fullEndpoint = paramsStr ? `${fullUrl}?${paramsStr}` : fullUrl

  return (
    <div className="bg-muted/50 rounded p-3 space-y-2">
      <div className="flex items-center justify-between">
        <div className="font-mono text-xs">
          <span className="text-green-600 dark:text-green-400 font-semibold">{endpoint.method}</span>{' '}
          <span className="text-muted-foreground">{endpoint.path}</span>
        </div>
        <button
          onClick={() => onCopy(fullEndpoint)}
          className="text-muted-foreground hover:text-foreground p-1 rounded hover:bg-muted transition-colors"
          title="Copy endpoint"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
        </button>
      </div>

      <div className="text-xs text-muted-foreground">{endpoint.description}</div>

      {Object.keys(endpoint.params).length > 0 && (
        <div className="space-y-1 pt-1">
          <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Parameters</div>
          {Object.entries(endpoint.params).map(([key, param]) => (
            <div key={key} className="text-xs flex items-start gap-2">
              <span className="font-mono text-primary shrink-0">{key}</span>
              <span className="text-muted-foreground shrink-0">({param.type})</span>
              <span className="text-foreground/80">{param.description}</span>
              {param.required && <span className="text-red-500 text-[10px]">*</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// Table Block Component
function TableBlock({ table }: { table: TableDoc }) {
  const [isExpanded, setIsExpanded] = useState(false)
  const visibleColumns = isExpanded ? table.columns : table.columns.slice(0, 5)
  const hasMore = table.columns.length > 5

  return (
    <div className="bg-muted/50 rounded p-3 space-y-2">
      <div className="flex items-center justify-between">
        <div>
          <span className="font-mono text-xs font-semibold">{table.name}</span>
          <span className="text-xs text-muted-foreground ml-2">({table.columns.length} columns)</span>
        </div>
      </div>

      <div className="text-xs text-muted-foreground">{table.description}</div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-left text-muted-foreground border-b border-border/50">
              <th className="pb-1.5 pr-3 font-medium">Column</th>
              <th className="pb-1.5 pr-3 font-medium">Type</th>
              <th className="pb-1.5 font-medium">Description</th>
            </tr>
          </thead>
          <tbody>
            {visibleColumns.map(col => (
              <tr key={col.name} className="border-t border-border/30">
                <td className="py-1.5 pr-3 font-mono text-[10px]">
                  {col.name}
                  {!col.nullable && <span className="text-red-400 ml-0.5">*</span>}
                </td>
                <td className="py-1.5 pr-3 text-muted-foreground text-[10px]">{col.type}</td>
                <td className="py-1.5 text-[10px]">
                  {col.description}
                  {col.source && (
                    <span className="text-muted-foreground ml-1">
                      ({col.source})
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {hasMore && (
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-xs text-primary hover:underline"
        >
          {isExpanded ? 'Show less' : `Show ${table.columns.length - 5} more columns`}
        </button>
      )}

      {table.uniqueConstraints && table.uniqueConstraints.length > 0 && (
        <div className="text-[10px] text-muted-foreground pt-1 border-t border-border/30">
          <span className="font-medium">Unique:</span>{' '}
          <span className="font-mono">{table.uniqueConstraints.join(', ')}</span>
        </div>
      )}
    </div>
  )
}
