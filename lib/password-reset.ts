"use server"

import crypto from "crypto"
import bcrypt from "bcryptjs"
import { addMinutes } from "date-fns"
import { db } from "@/lib/db"
import { sendEmail } from "@/lib/google/gmail"
import { getNotificationSenderUserId } from "@/lib/notifications"

const RESET_WINDOW_MINUTES = 60

/** Normalizes email input to a lower‑cased, trimmed string. */
function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

/** Creates a SHA-256 hash of the provided token for secure storage. */
function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex")
}

/** Resolves the base URL used in password reset links. */
function getBaseUrl() {
  return process.env.NEXTAUTH_URL || process.env.APP_URL || "http://localhost:3000"
}

/**
 * Generates a password-reset token for the provided email and dispatches a reset email.
 * Silently no-ops if the user does not exist; callers should always return a generic success message.
 */
export async function requestPasswordReset(email: string): Promise<void> {
  const normalizedEmail = normalizeEmail(email)
  const user = await db.user.findUnique({
    where: { email: normalizedEmail },
  })

  if (!user || !user.active) {
    return
  }

  await db.passwordResetToken.deleteMany({
    where: {
      userId: user.id,
      used: false,
    },
  })

  const rawToken = crypto.randomBytes(32).toString("hex")
  const hashed = hashToken(rawToken)

  await db.passwordResetToken.create({
    data: {
      userId: user.id,
      token: hashed,
      expiresAt: addMinutes(new Date(), RESET_WINDOW_MINUTES),
    },
  })

  const senderUserId = await getNotificationSenderUserId()
  if (!senderUserId) {
    throw new Error(
      "No Google-connected admin available to send email. Please connect an admin account in Settings."
    )
  }

  const resetUrl = `${getBaseUrl()}/auth/reset/${rawToken}`
  const subject = "Reset your StuchAi password"
  const body = `
    <html>
      <body style="font-family: Arial, sans-serif; color: #111; line-height: 1.6;">
        <p>Hello${user.name ? ` ${user.name}` : ""},</p>
        <p>We received a request to reset your StuchAi password. Click the button below to create a new one. This link expires in ${RESET_WINDOW_MINUTES} minutes.</p>
        <p style="margin: 24px 0;">
          <a href="${resetUrl}" style="background: #2563eb; color: #fff; padding: 12px 18px; border-radius: 6px; text-decoration: none;">
            Reset password
          </a>
        </p>
        <p>If you did not request this, you can safely ignore this email.</p>
        <p style="font-size: 12px; color: #6b7280;">For security reasons this link can only be used once.</p>
      </body>
    </html>
  `

  await sendEmail(senderUserId, user.email, subject, body, true)
}

/**
 * Consumes a password-reset token and sets a new password for the associated user.
 * Throws if the token is invalid, expired, or already used.
 */
export async function resetPasswordWithToken(token: string, newPassword: string): Promise<void> {
  const hashed = hashToken(token)
  const resetEntry = await db.passwordResetToken.findUnique({
    where: { token: hashed },
  })

  if (!resetEntry || resetEntry.used || resetEntry.expiresAt < new Date()) {
    throw new Error("Invalid or expired reset link.")
  }

  const hashedPassword = await bcrypt.hash(newPassword, 12)

  await db.$transaction([
    db.user.update({
      where: { id: resetEntry.userId },
      data: {
        password: hashedPassword,
        active: true,
      },
    }),
    db.session.deleteMany({
      where: { userId: resetEntry.userId },
    }),
    db.passwordResetToken.update({
      where: { id: resetEntry.id },
      data: { used: true },
    }),
  ])
}

