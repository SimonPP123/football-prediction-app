import { notFound } from 'next/navigation'
import { Header } from '@/components/layout/header'
import Link from 'next/link'
import { ArrowLeft, BookOpen, Clock } from 'lucide-react'
import fs from 'fs'
import path from 'path'
import { DocContent } from './doc-content'

interface DocMeta {
  slug: string
  title: string
  filename: string
}

const DOC_MAPPING: DocMeta[] = [
  { slug: 'prediction-system', title: 'Prediction System', filename: 'PREDICTION_SYSTEM.md' },
  { slug: 'match-analysis', title: 'Match Analysis', filename: 'MATCH_ANALYSIS.md' },
  { slug: 'accuracy-tracking', title: 'Accuracy Tracking', filename: 'ACCURACY_TRACKING.md' },
  { slug: 'data-refresh', title: 'Data Refresh', filename: 'DATA_REFRESH.md' },
  { slug: 'database', title: 'Database Schema', filename: 'DATABASE.md' },
  { slug: 'api-reference', title: 'API Reference', filename: 'API_REFERENCE.md' },
  { slug: 'factors', title: '6-Factor Analysis', filename: 'FACTORS.md' },
]

export function generateStaticParams() {
  return DOC_MAPPING.map(doc => ({ slug: doc.slug }))
}

async function getDocContent(slug: string): Promise<{ meta: DocMeta; content: string } | null> {
  const meta = DOC_MAPPING.find(d => d.slug === slug)
  if (!meta) return null

  const docsDir = path.join(process.cwd(), 'docs')
  const filePath = path.join(docsDir, meta.filename)

  try {
    const content = fs.readFileSync(filePath, 'utf-8')
    return { meta, content }
  } catch {
    return null
  }
}

export default async function DocPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const doc = await getDocContent(slug)

  if (!doc) {
    notFound()
  }

  // Extract last updated from content (first line after # heading that starts with *Last Updated:*)
  const lastUpdatedMatch = doc.content.match(/\*Last Updated: ([^*]+)\*/)
  const lastUpdated = lastUpdatedMatch ? lastUpdatedMatch[1] : 'Unknown'

  return (
    <div className="min-h-screen">
      <Header title={doc.meta.title} subtitle="System Documentation" />

      <div className="p-6">
        {/* Navigation */}
        <div className="flex items-center justify-between mb-6">
          <Link
            href="/docs"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Documentation
          </Link>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              {lastUpdated}
            </span>
            <span className="flex items-center gap-1">
              <BookOpen className="w-4 h-4" />
              {doc.meta.filename}
            </span>
          </div>
        </div>

        {/* Content */}
        <div className="bg-card border border-border rounded-lg p-6 md:p-8">
          <DocContent content={doc.content} />
        </div>

        {/* Navigation Footer */}
        <div className="mt-6 flex items-center justify-between">
          <Link
            href="/docs"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Documentation
          </Link>
          <Link
            href="/data/docs"
            className="text-sm text-primary hover:underline"
          >
            View API Data Sources
          </Link>
        </div>
      </div>
    </div>
  )
}
