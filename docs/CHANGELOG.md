# Changelog

All notable changes to the Football Prediction System are documented here.

---

## [January 2026] - Security & Performance Audit

### Security Improvements

#### Authentication & Authorization
- **Centralized isAdmin()**: Replaced 18+ local `isAdmin()` implementations with centralized version in `lib/auth.ts`
- **Cookie Signature Verification**: All routes now use `verifyAuthCookie()` for HMAC-SHA256 verification
- **Timing-Safe Comparison**: Added `timingSafeEqual()` for API key and signature comparison (prevents timing attacks)
- **Legacy Fallback Removal**: Removed unsigned cookie fallbacks in middleware and auth modules

#### Security Headers
Added comprehensive security headers in `middleware.ts`:
- `X-Frame-Options: DENY` - Prevents clickjacking
- `Strict-Transport-Security` - 1-year HSTS with includeSubDomains
- `X-Content-Type-Options: nosniff` - Prevents MIME sniffing
- `Referrer-Policy: strict-origin-when-cross-origin`
- `X-XSS-Protection: 1; mode=block`
- `Content-Security-Policy` - Comprehensive CSP policy
- `Permissions-Policy` - Restricts browser features

### Performance Improvements

#### Database Optimizations
- **Batch Upserts**: Converted N+1 individual upserts to single batch operations in:
  - `fixture-events/route.ts`
  - `fixture-statistics/route.ts`
  - `standings/route.ts`
  - `team-stats/route.ts`

#### Query Optimizations
- **Deduplication Filtering**: Added `.in('fixture_id', fixtureIds)` to prevent full table scans in:
  - `fixture-events/route.ts`
  - `fixture-statistics/route.ts`

#### Parallel Execution
- **Post-Match Refresh**: Converted sequential endpoint calls to parallel execution using `Promise.all()`
  - Phase 1: Fixtures (sequential - dependencies)
  - Phase 2: All other endpoints (parallel)

#### Database Indexes
Created `015_additional_indexes.sql` with:
- Composite indexes for common query patterns
- Partial indexes for fixtures by status (upcoming, live, completed)
- Fixed `fixture_events` unique constraint to match code column names

### Files Changed

#### Security
| File | Change |
|------|--------|
| `lib/auth.ts` | Added `timingSafeEqual()`, centralized `isAdmin()` |
| `lib/auth/verify-admin.ts` | Removed legacy cookie fallback |
| `middleware.ts` | Added security headers, removed legacy fallback |
| 18+ API routes | Replaced local `isAdmin()` with import from `lib/auth.ts` |

#### Performance
| File | Change |
|------|--------|
| `fixture-events/route.ts` | Batch upserts, filtered deduplication query |
| `fixture-statistics/route.ts` | Batch upserts, filtered deduplication query |
| `standings/route.ts` | Batch upserts |
| `team-stats/route.ts` | Batch upserts |
| `post-match/route.ts` | Parallel endpoint execution |

#### Database
| File | Change |
|------|--------|
| `015_additional_indexes.sql` | New composite and partial indexes |

---

## [December 2024] - Initial Security Audit

### Security Features Added
- Cookie signing with HMAC-SHA256
- Rate limiting on login (5 attempts/IP, 15-min block)
- Input validation (UUID, range, date)
- API retry logic with exponential backoff
- Environment validation at startup
- XSS protection with rehype-sanitize
- Error boundary component

### Files Added
- `lib/auth/cookie-sign.ts` - Cookie signing
- `lib/auth/rate-limit.ts` - Rate limiting
- `lib/validation.ts` - Input validation
- `lib/config/validate-env.ts` - Environment validation
- `components/error-boundary.tsx` - React error boundary

---

## [Earlier Changes]

For changes prior to December 2024, see individual migration files in `supabase/migrations/`.
