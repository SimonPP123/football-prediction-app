/**
 * Next.js Instrumentation
 * This file is automatically loaded by Next.js at startup
 * Used for environment validation and startup checks
 */

export async function register() {
  // Only run on server startup
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { assertValidEnv } = await import('./lib/config/validate-env')

    try {
      assertValidEnv()
    } catch (error) {
      // In development, log error but don't crash
      // In production, this will prevent the app from starting with bad config
      if (process.env.NODE_ENV === 'production') {
        throw error
      }
      console.error('[Instrumentation] Environment validation failed:', error)
    }
  }
}
