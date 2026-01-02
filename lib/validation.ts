/**
 * Input validation utilities
 * Centralized validation functions for API routes
 */

// UUID validation regex
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * Validates if a string is a valid UUID
 */
export function isValidUUID(id: string): boolean {
  return UUID_REGEX.test(id)
}

/**
 * Asserts that a string is a valid UUID, throws if invalid
 */
export function assertValidUUID(id: string, fieldName: string): void {
  if (!isValidUUID(id)) {
    throw new ValidationError(`Invalid ${fieldName} format: must be a valid UUID`)
  }
}

/**
 * Validates a number is within a range
 */
export function validateRange(
  value: number,
  min: number,
  max: number,
  fieldName: string
): void {
  if (value < min || value > max) {
    throw new ValidationError(`${fieldName} must be between ${min} and ${max}`)
  }
}

/**
 * Validates a string length
 */
export function validateStringLength(
  value: string,
  minLength: number,
  maxLength: number,
  fieldName: string
): void {
  if (value.length < minLength || value.length > maxLength) {
    throw new ValidationError(
      `${fieldName} must be between ${minLength} and ${maxLength} characters`
    )
  }
}

/**
 * Validates that a value is a positive integer
 */
export function validatePositiveInteger(value: number, fieldName: string): void {
  if (!Number.isInteger(value) || value <= 0) {
    throw new ValidationError(`${fieldName} must be a positive integer`)
  }
}

/**
 * Custom validation error class
 */
export class ValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ValidationError'
  }
}

/**
 * Parses and validates a limit parameter
 * Returns validated limit or default value
 */
export function parseLimit(
  value: string | null,
  defaultValue?: number,
  min: number = 1,
  max: number = 100
): number | undefined {
  // If no value provided, return the default (which could be undefined)
  if (!value) return defaultValue

  const parsed = parseInt(value, 10)
  if (isNaN(parsed)) {
    throw new ValidationError('limit must be a valid number')
  }

  if (parsed < min || parsed > max) {
    throw new ValidationError(`limit must be between ${min} and ${max}`)
  }

  return parsed
}

/**
 * Parses and validates an offset parameter
 */
export function parseOffset(
  value: string | null,
  defaultValue: number = 0
): number {
  if (!value) return defaultValue

  const parsed = parseInt(value, 10)
  if (isNaN(parsed) || parsed < 0) {
    throw new ValidationError('offset must be a non-negative integer')
  }

  return parsed
}
