/**
 * Error handling utilities for consistent error handling across the application
 */

/**
 * Safely extracts error message from unknown error type
 * Useful in catch blocks where error type is unknown
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message
  }
  if (typeof error === 'string') {
    return error
  }
  if (error && typeof error === 'object' && 'message' in error) {
    return String((error as { message: unknown }).message)
  }
  return 'Unknown error occurred'
}

/**
 * Type guard to check if an error has a specific error code
 */
export function hasErrorCode(error: unknown): error is { code: string } {
  return error !== null && typeof error === 'object' && 'code' in error
}

/**
 * Type guard to check if an error has a status code
 */
export function hasStatus(error: unknown): error is { status: number } {
  return error !== null && typeof error === 'object' && 'status' in error
}

/**
 * Creates a standardized error response object
 */
export function createErrorResponse(error: unknown, context?: string) {
  const message = getErrorMessage(error)
  return {
    success: false,
    error: context ? `${context}: ${message}` : message,
    code: hasErrorCode(error) ? error.code : undefined,
  }
}

/**
 * Logs error with context and returns the message
 * Useful for API routes
 */
export function logAndGetError(error: unknown, context: string): string {
  const message = getErrorMessage(error)
  console.error(`[${context}]`, message)
  return message
}
