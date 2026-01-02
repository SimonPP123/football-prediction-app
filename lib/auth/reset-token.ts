import { randomBytes } from 'crypto'
import bcrypt from 'bcryptjs'

const SALT_ROUNDS = 10
const TOKEN_EXPIRY_HOURS = 1

/**
 * Generate a secure random token for password reset
 * Returns both the plaintext token (to give to user) and hash (to store in DB)
 */
export async function generateResetToken(): Promise<{
  token: string
  tokenHash: string
  expiresAt: Date
}> {
  // Generate 32 bytes of random data, encode as base64url
  const token = randomBytes(32).toString('base64url')

  // Hash the token before storing (so even if DB is compromised, tokens can't be used)
  const tokenHash = await bcrypt.hash(token, SALT_ROUNDS)

  // Set expiration
  const expiresAt = new Date()
  expiresAt.setHours(expiresAt.getHours() + TOKEN_EXPIRY_HOURS)

  return { token, tokenHash, expiresAt }
}

/**
 * Verify a reset token against a hash
 */
export async function verifyResetToken(token: string, tokenHash: string): Promise<boolean> {
  return bcrypt.compare(token, tokenHash)
}
