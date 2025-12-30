/**
 * Environment Variable Validation
 * Validates all required environment variables at startup
 * Import this in next.config.mjs or app layout to fail fast on missing config
 */

interface EnvVar {
  name: string
  required: boolean
  productionOnly?: boolean
  validate?: (value: string) => boolean
  description?: string
}

const ENV_VARS: EnvVar[] = [
  // Supabase
  {
    name: 'NEXT_PUBLIC_SUPABASE_URL',
    required: true,
    description: 'Supabase project URL',
    validate: (v) => v.startsWith('https://') && v.includes('.supabase.co'),
  },
  {
    name: 'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    required: true,
    description: 'Supabase anonymous key for client-side access',
  },
  {
    name: 'SUPABASE_SERVICE_ROLE_KEY',
    required: true,
    description: 'Supabase service role key for server-side operations',
  },

  // API-Football
  {
    name: 'API_FOOTBALL_KEY',
    required: true,
    description: 'API-Football API key',
  },

  // Auth
  {
    name: 'COOKIE_SECRET',
    required: true,
    productionOnly: true,
    description: 'Secret key for signing auth cookies',
    validate: (v) => v.length >= 32,
  },

  // n8n (optional - only needed for prediction workflows)
  {
    name: 'N8N_WEBHOOK_URL',
    required: false,
    description: 'n8n webhook URL for predictions',
  },
  {
    name: 'N8N_API_KEY',
    required: false,
    description: 'n8n API key for workflow management',
  },

  // The Odds API (optional)
  {
    name: 'ODDS_API_KEY',
    required: false,
    description: 'The Odds API key for betting odds',
  },
]

interface ValidationResult {
  valid: boolean
  errors: string[]
  warnings: string[]
}

/**
 * Validates environment variables and returns results
 */
export function validateEnv(): ValidationResult {
  const isProduction = process.env.NODE_ENV === 'production'
  const errors: string[] = []
  const warnings: string[] = []

  for (const envVar of ENV_VARS) {
    const value = process.env[envVar.name]

    // Check if required
    const isRequired = envVar.required && (!envVar.productionOnly || isProduction)

    if (!value) {
      if (isRequired) {
        errors.push(`Missing required environment variable: ${envVar.name}${envVar.description ? ` (${envVar.description})` : ''}`)
      } else if (envVar.required && envVar.productionOnly && !isProduction) {
        warnings.push(`${envVar.name} is required in production but not set (currently in ${process.env.NODE_ENV || 'development'})`)
      }
      continue
    }

    // Run custom validation if provided
    if (envVar.validate && !envVar.validate(value)) {
      errors.push(`Invalid value for ${envVar.name}: validation failed${envVar.description ? ` (${envVar.description})` : ''}`)
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  }
}

/**
 * Validates environment and throws if invalid
 * Call this at app startup to fail fast
 */
export function assertValidEnv(): void {
  const result = validateEnv()

  // Log warnings
  result.warnings.forEach((warning) => {
    console.warn(`[Env Validation] Warning: ${warning}`)
  })

  // Throw on errors
  if (!result.valid) {
    const errorMessage = [
      'Environment validation failed:',
      ...result.errors.map((e) => `  - ${e}`),
    ].join('\n')

    console.error('[Env Validation] ' + errorMessage)
    throw new Error(errorMessage)
  }

  console.log('[Env Validation] All required environment variables are configured')
}

/**
 * Check if a specific env var is configured
 */
export function isEnvConfigured(name: string): boolean {
  return !!process.env[name]
}
