# Changelog

All notable changes to the Football Prediction System are documented here.

---

## [January 2026] - Security Enhancement (Production-Ready)

### Critical Security Fixes

#### Cron Route Protection
- **Secured `/api/match-analysis/auto-trigger`**: Now requires `X-Cron-Secret` header
- Removed from public routes in middleware
- Added CRON_SECRET environment variable validation
- Uses timing-safe comparison to prevent timing attacks

#### CSP Hardening
- Removed `unsafe-eval` from Content Security Policy in production
- CSP now conditional: dev allows eval, production does not

### Password Reset Flow (NEW)

#### Database Changes
- Added `password_reset_tokens` table with bcrypt-hashed tokens
- Added `session_version` column to users table for session invalidation
- Migration: `016_password_reset_and_sessions.sql`

#### New Endpoints
| Endpoint | Purpose |
|----------|---------|
| `POST /api/auth/reset-password/request` | Admin generates reset token for user |
| `POST /api/auth/reset-password/confirm` | User resets password with token |
| `POST /api/admin/users/[id]/reset-password` | Admin resets specific user's password |

#### Security Features
- Tokens expire after 1 hour
- Tokens are one-time use only
- Plaintext token never stored (bcrypt hash only)
- All sessions invalidated on password reset

### Session Hardening

| Before | After |
|--------|-------|
| 7-day session duration | 24-hour session duration |
| No session invalidation | session_version-based invalidation |
| No absolute timeout | 7-day absolute timeout |
| No issuedAt tracking | issuedAt timestamp in cookie |

### Rate Limiting Expansion

| Endpoint | Limit | Window |
|----------|-------|--------|
| `/api/predictions/generate` | 10 requests | per hour per IP |
| `/api/match-analysis/generate` | 5 requests | per hour per IP |
| Login (existing) | 5 attempts | per 15 min per IP |

### New Files
| File | Purpose |
|------|---------|
| `lib/rate-limit.ts` | Reusable rate limiter with pre-configured limiters |
| `lib/auth/reset-token.ts` | Secure token generation and verification |
| `app/api/auth/reset-password/*` | Password reset endpoints |
| `app/api/admin/users/[id]/reset-password/route.ts` | Admin password reset |
| `supabase/migrations/016_password_reset_and_sessions.sql` | Database migration |

### Modified Files
| File | Changes |
|------|---------|
| `middleware.ts` | Removed cron from public, conditional CSP, cron secret validation |
| `app/api/match-analysis/auto-trigger/route.ts` | Added cron secret validation |
| `app/api/auth/login/route.ts` | 24-hour sessions, session_version in cookie |
| `lib/auth/cookie-sign.ts` | Added sessionVersion, issuedAt, absolute timeout |
| `app/api/predictions/generate/route.ts` | Added rate limiting |
| `app/api/match-analysis/generate/route.ts` | Added rate limiting |
| `.env.example` | Added COOKIE_SECRET, CRON_SECRET |
| `lib/config/validate-env.ts` | Added CRON_SECRET validation |

---

## [January 2, 2026] - Bug Fixes & Documentation Update

### Bug Fixes

#### Injury Display Fix
- **Issue**: Injuries weren't displaying correctly in team squad section
- **Root Cause**: Name matching failed due to inconsistent API-Football formats (e.g., "B. Fernandes" vs "Bruno Fernandes")
- **Fix**: Updated `squad-table.tsx` to match injuries by `player_id` and `player_api_id` instead of names
- **File Changed**: `components/teams/squad-table.tsx`

#### Fixtures Limit Fix
- **Issue**: Only 20 upcoming fixtures showed on predictions page instead of all 190
- **Root Cause**: `parseLimit()` used default of 20 when `undefined` passed as default value
- **Fix**: Changed `parseLimit()` to properly handle `undefined` default values
- **Files Changed**: `lib/validation.ts`, `app/api/automation/logs/route.ts`

### Documentation Updates
- Removed hardcoded API key from `docs/n8n_workflow_sync.md` (security)
- Added `reported_date` and `player_api_id` fields to injuries table in `docs/DATABASE.md`
- Consolidated FOOTBALL_API documentation (removed redundant v1 file, renamed v2 to `FOOTBALL_API_REFERENCE.md`)
- Added note about player_id matching for injuries in DATABASE.md

---

## [January 2026] - Comprehensive Audit (Phase 2)

### Security Fixes
- **Fixed timing-safe comparison bug**: Corrected logic error in `middleware.ts:20` where comparison was comparing `a` with itself instead of doing meaningful constant-time work

### Performance Improvements - Backend

#### Batch Upserts (N+1 Query Elimination)
| Route | Before | After | Improvement |
|-------|--------|-------|-------------|
| `fixtures/route.ts` | 760 DB calls (380 fixtures × 2) | 2 DB calls | ~99.7% reduction |
| `teams/route.ts` | 80+ DB calls (20 teams × 4) | 4 DB calls | ~95% reduction |
| `injuries/route.ts` | 50+ DB calls | 1 DB call | ~98% reduction |

### Performance Improvements - Frontend

#### React Memoization
| Component | Changes |
|-----------|---------|
| `PredictionCard` | Added `useMemo` for prediction sorting, odds calculations; wrapped in `React.memo` |
| `PredictionTable` | Moved helper functions outside component; memoized processed fixtures; wrapped in `React.memo` |
| `LiveMatchesSection` | Added data comparison before state updates; used ref for callback; wrapped in `React.memo` |

### Code Quality
- **New utility**: Created `lib/error-utils.ts` with `getErrorMessage()`, `createErrorResponse()` for consistent error handling

### Files Changed

| File | Change |
|------|--------|
| `middleware.ts` | Fixed timing-safe comparison bug |
| `app/api/data/refresh/fixtures/route.ts` | Batch upsert (both streaming and batch handlers) |
| `app/api/data/refresh/teams/route.ts` | Batch upsert for venues and teams |
| `app/api/data/refresh/injuries/route.ts` | Batch upsert |
| `components/predictions/prediction-card.tsx` | Added memoization, wrapped in React.memo |
| `components/predictions/prediction-table.tsx` | Added memoization, wrapped in React.memo |
| `components/dashboard/live-matches-section.tsx` | Fixed polling, added data comparison |
| `lib/error-utils.ts` | NEW - Error handling utilities |

---

## [January 2026] - Security & Performance Audit (Phase 1)

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
