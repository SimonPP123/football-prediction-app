'use client'

import { useState } from 'react'
import { Header } from '@/components/layout/header'
import Link from 'next/link'
import {
  BookOpen,
  Database,
  Code,
  RefreshCw,
  Brain,
  BarChart3,
  Target,
  Search,
  FileText,
  ArrowRight,
  Layers,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface DocInfo {
  slug: string
  title: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  category: 'system' | 'developer'
  lastUpdated: string
}

const DOCS: DocInfo[] = [
  {
    slug: 'prediction-system',
    title: 'Prediction System',
    description: 'End-to-end prediction flow: data aggregation, AI models, 6-factor analysis, and memory context learning.',
    icon: Brain,
    category: 'system',
    lastUpdated: 'January 2, 2026',
  },
  {
    slug: 'match-analysis',
    title: 'Match Analysis',
    description: 'Post-match AI analysis comparing predictions to actual results, identifying learning points.',
    icon: Target,
    category: 'system',
    lastUpdated: 'January 2, 2026',
  },
  {
    slug: 'accuracy-tracking',
    title: 'Accuracy Tracking',
    description: 'Prediction accuracy metrics, confidence calibration, and per-model/per-team statistics.',
    icon: BarChart3,
    category: 'system',
    lastUpdated: 'January 2, 2026',
  },
  {
    slug: 'data-refresh',
    title: 'Data Refresh',
    description: 'Phase-based and smart refresh systems for keeping football data synchronized.',
    icon: RefreshCw,
    category: 'system',
    lastUpdated: 'January 2, 2026',
  },
  {
    slug: 'database',
    title: 'Database Schema',
    description: 'Complete database schema reference: 20+ tables, relationships, indexes, and RLS policies.',
    icon: Database,
    category: 'developer',
    lastUpdated: 'January 2, 2026',
  },
  {
    slug: 'api-reference',
    title: 'API Reference',
    description: '58+ API endpoints organized by category: data refresh, predictions, automation, and admin.',
    icon: Code,
    category: 'developer',
    lastUpdated: 'January 2, 2026',
  },
  {
    slug: 'factors',
    title: '6-Factor Analysis',
    description: 'The weighted factor model used for predictions: Base Strength, Form, Key Players, Tactical, Table Position, H2H.',
    icon: Layers,
    category: 'developer',
    lastUpdated: 'January 2, 2026',
  },
]

const CATEGORIES = {
  system: {
    name: 'System Documentation',
    description: 'How the prediction and analysis systems work',
  },
  developer: {
    name: 'Developer Reference',
    description: 'Technical specifications and schemas',
  },
}

export default function DocsPage() {
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'system' | 'developer'>('all')

  const filteredDocs = DOCS.filter(doc => {
    const matchesSearch = !search ||
      doc.title.toLowerCase().includes(search.toLowerCase()) ||
      doc.description.toLowerCase().includes(search.toLowerCase())
    const matchesCategory = selectedCategory === 'all' || doc.category === selectedCategory
    return matchesSearch && matchesCategory
  })

  const systemDocs = filteredDocs.filter(d => d.category === 'system')
  const developerDocs = filteredDocs.filter(d => d.category === 'developer')

  return (
    <div className="min-h-screen">
      <Header title="Documentation" subtitle="System guides, API references, and technical specifications" />

      <div className="p-6 space-y-6">
        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-card border border-border rounded-lg p-4">
            <div className="flex items-center gap-2 mb-1">
              <BookOpen className="w-4 h-4 text-primary" />
              <span className="text-xs text-muted-foreground">Total Docs</span>
            </div>
            <div className="text-2xl font-bold">{DOCS.length}</div>
          </div>
          <div className="bg-card border border-border rounded-lg p-4">
            <div className="flex items-center gap-2 mb-1">
              <Brain className="w-4 h-4 text-primary" />
              <span className="text-xs text-muted-foreground">System Guides</span>
            </div>
            <div className="text-2xl font-bold">{DOCS.filter(d => d.category === 'system').length}</div>
          </div>
          <div className="bg-card border border-border rounded-lg p-4">
            <div className="flex items-center gap-2 mb-1">
              <Code className="w-4 h-4 text-primary" />
              <span className="text-xs text-muted-foreground">Developer Refs</span>
            </div>
            <div className="text-2xl font-bold">{DOCS.filter(d => d.category === 'developer').length}</div>
          </div>
          <Link
            href="/data/docs"
            className="bg-card border border-border rounded-lg p-4 hover:bg-muted/50 transition-colors group"
          >
            <div className="flex items-center gap-2 mb-1">
              <FileText className="w-4 h-4 text-primary" />
              <span className="text-xs text-muted-foreground">API Docs</span>
            </div>
            <div className="text-sm font-medium flex items-center gap-1 group-hover:text-primary transition-colors">
              View Data Sources <ArrowRight className="w-3 h-3" />
            </div>
          </Link>
        </div>

        {/* Search and Filter */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search documentation..."
              className="w-full pl-10 pr-4 py-2.5 bg-card border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setSelectedCategory('all')}
              className={cn(
                'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                selectedCategory === 'all'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-card border border-border hover:bg-muted'
              )}
            >
              All
            </button>
            <button
              onClick={() => setSelectedCategory('system')}
              className={cn(
                'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                selectedCategory === 'system'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-card border border-border hover:bg-muted'
              )}
            >
              System
            </button>
            <button
              onClick={() => setSelectedCategory('developer')}
              className={cn(
                'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                selectedCategory === 'developer'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-card border border-border hover:bg-muted'
              )}
            >
              Developer
            </button>
          </div>
        </div>

        {/* System Documentation */}
        {systemDocs.length > 0 && (
          <div className="space-y-4">
            <div>
              <h2 className="font-semibold text-lg">{CATEGORIES.system.name}</h2>
              <p className="text-sm text-muted-foreground">{CATEGORIES.system.description}</p>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              {systemDocs.map(doc => (
                <DocCard key={doc.slug} doc={doc} />
              ))}
            </div>
          </div>
        )}

        {/* Developer Reference */}
        {developerDocs.length > 0 && (
          <div className="space-y-4">
            <div>
              <h2 className="font-semibold text-lg">{CATEGORIES.developer.name}</h2>
              <p className="text-sm text-muted-foreground">{CATEGORIES.developer.description}</p>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              {developerDocs.map(doc => (
                <DocCard key={doc.slug} doc={doc} />
              ))}
            </div>
          </div>
        )}

        {/* No Results */}
        {filteredDocs.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            No documentation matches "{search}"
          </div>
        )}
      </div>
    </div>
  )
}

function DocCard({ doc }: { doc: DocInfo }) {
  const Icon = doc.icon

  return (
    <Link
      href={`/docs/${doc.slug}`}
      className="bg-card border border-border rounded-lg p-5 hover:border-primary/50 hover:shadow-md transition-all group"
    >
      <div className="flex items-start gap-4">
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors">
          <Icon className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-1">
            <h3 className="font-semibold group-hover:text-primary transition-colors">{doc.title}</h3>
            <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all shrink-0" />
          </div>
          <p className="text-sm text-muted-foreground line-clamp-2">{doc.description}</p>
          <p className="text-xs text-muted-foreground mt-2">Updated: {doc.lastUpdated}</p>
        </div>
      </div>
    </Link>
  )
}
