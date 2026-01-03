'use client'

import Link from 'next/link'
import { useLeague } from '@/contexts/league-context'
import { ComponentProps } from 'react'

type LeagueLinkProps = ComponentProps<typeof Link>

/**
 * A Link component that automatically preserves the league_id query parameter.
 * Use this instead of Next.js Link for all internal navigation to maintain
 * league context across page transitions.
 */
export function LeagueLink({ href, ...props }: LeagueLinkProps) {
  const { currentLeague } = useLeague()

  // Build the URL with league_id if we have a current league
  const hrefWithLeague = (() => {
    if (!currentLeague) return href

    // Handle string href
    if (typeof href === 'string') {
      try {
        // Use a dummy base to parse relative URLs
        const url = new URL(href, 'http://dummy')
        url.searchParams.set('league_id', currentLeague.id)
        // Return just the pathname + search (remove the dummy base)
        return url.pathname + url.search
      } catch {
        return href
      }
    }

    // Handle UrlObject href
    if (typeof href === 'object') {
      const query = typeof href.query === 'object'
        ? { ...href.query, league_id: currentLeague.id }
        : { league_id: currentLeague.id }
      return { ...href, query }
    }

    return href
  })()

  return <Link href={hrefWithLeague} {...props} />
}
