import crypto from 'crypto'
import speakeasy from 'speakeasy'
import qrcode from 'qrcode'

function getDerivedKey(): Buffer {
  const secret = process.env.JWT_ACCESS_SECRET
  if (!secret) throw new Error('Missing JWT_ACCESS_SECRET')
  return crypto.createHash('sha256').update(secret).digest()
}

export function encryptSecret(plaintext: string): string {
  const key = getDerivedKey()
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv)
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  // Format: iv(12):tag(16):ciphertext — all hex
  return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted.toString('hex')}`
}

export function decryptSecret(stored: string): string {
  const key = getDerivedKey()
  const [ivHex, tagHex, dataHex] = stored.split(':')
  if (!ivHex || !tagHex || !dataHex) throw new Error('Invalid encrypted secret format')
  const iv = Buffer.from(ivHex, 'hex')
  const tag = Buffer.from(tagHex, 'hex')
  const data = Buffer.from(dataHex, 'hex')
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv)
  decipher.setAuthTag(tag)
  return decipher.update(data) + decipher.final('utf8')
}

export function generateTotpSecret(email: string): {
  secret: string
  otpauthUrl: string
} {
  const generated = speakeasy.generateSecret({
    name: `ImmoSafe (${email})`,
    issuer: 'ImmoSafe',
    length: 20,
  })
  return {
    secret: generated.base32,
    otpauthUrl: generated.otpauth_url!,
  }
}

export async function generateQrCodeDataUrl(otpauthUrl: string): Promise<string> {
  return qrcode.toDataURL(otpauthUrl)
}

export function verifyTotpToken(secret: string, token: string): boolean {
  return speakeasy.totp.verify({
    secret,
    encoding: 'base32',
    token,
    window: 1,
  })
}
