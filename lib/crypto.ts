import crypto from "crypto"

const ALGORITHM = "aes-256-gcm"
const IV_LENGTH = 12

function getSecretKey() {
  const secret = process.env.SECURE_FIELD_SECRET
  if (!secret) {
    throw new Error("SECURE_FIELD_SECRET is not configured. Set it to a 32-byte base64 string.")
  }
  const buffer = Buffer.from(secret, secret.length === 32 ? "utf-8" : "base64")
  if (buffer.length !== 32) {
    throw new Error("SECURE_FIELD_SECRET must decode to 32 bytes.")
  }
  return buffer
}

/** Encrypts plaintext and returns a string containing iv + authTag + ciphertext (base64). */
export function encryptSecret(plaintext: string): string {
  const key = getSecretKey()
  const iv = crypto.randomBytes(IV_LENGTH)
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv)
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()])
  const authTag = cipher.getAuthTag()

  return Buffer.concat([iv, authTag, encrypted]).toString("base64")
}

/** Decrypts the value produced by encryptSecret. */
export function decryptSecret(payload: string): string {
  const key = getSecretKey()
  const data = Buffer.from(payload, "base64")
  const iv = data.subarray(0, IV_LENGTH)
  const authTag = data.subarray(IV_LENGTH, IV_LENGTH + 16)
  const encryptedText = data.subarray(IV_LENGTH + 16)

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv)
  decipher.setAuthTag(authTag)
  const decrypted = Buffer.concat([decipher.update(encryptedText), decipher.final()])
  return decrypted.toString("utf8")
}

