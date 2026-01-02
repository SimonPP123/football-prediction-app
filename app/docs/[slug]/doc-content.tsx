'use client'

import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeSanitize from 'rehype-sanitize'

export function DocContent({ content }: { content: string }) {
  return (
    <article className="prose prose-slate dark:prose-invert max-w-none
      prose-headings:font-semibold
      prose-h1:text-2xl prose-h1:border-b prose-h1:border-border prose-h1:pb-3 prose-h1:mb-6
      prose-h2:text-xl prose-h2:mt-8 prose-h2:mb-4 prose-h2:border-b prose-h2:border-border/50 prose-h2:pb-2
      prose-h3:text-lg prose-h3:mt-6 prose-h3:mb-3
      prose-p:text-muted-foreground prose-p:leading-relaxed
      prose-li:text-muted-foreground
      prose-strong:text-foreground prose-strong:font-semibold
      prose-code:text-primary prose-code:bg-muted prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-sm prose-code:font-mono prose-code:before:content-none prose-code:after:content-none
      prose-pre:bg-muted prose-pre:border prose-pre:border-border prose-pre:rounded-lg prose-pre:overflow-x-auto
      prose-a:text-primary prose-a:no-underline hover:prose-a:underline
      prose-table:border prose-table:border-border prose-table:rounded-lg prose-table:overflow-hidden
      prose-th:bg-muted/50 prose-th:px-4 prose-th:py-2 prose-th:text-left prose-th:font-semibold prose-th:text-sm prose-th:border-b prose-th:border-border
      prose-td:px-4 prose-td:py-2 prose-td:text-sm prose-td:border-b prose-td:border-border/50
      prose-tr:border-b prose-tr:border-border/50 last:prose-tr:border-0
      prose-hr:border-border prose-hr:my-8
      prose-blockquote:border-l-primary prose-blockquote:bg-muted/30 prose-blockquote:py-1 prose-blockquote:px-4 prose-blockquote:rounded-r-lg
      prose-ul:my-4 prose-ol:my-4
    ">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeSanitize]}
      >
        {content}
      </ReactMarkdown>
    </article>
  )
}
