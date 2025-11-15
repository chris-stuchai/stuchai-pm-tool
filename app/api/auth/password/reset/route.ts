import { NextRequest, NextResponse } from "next/server"
import { resetPasswordWithToken } from "@/lib/password-reset"

/**
 * Consumes a password reset token and assigns a new password to the user.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const token = typeof body.token === "string" ? body.token.trim() : ""
    const password = typeof body.password === "string" ? body.password.trim() : ""

    if (!token || !password) {
      return NextResponse.json({ error: "Token and password are required." }, { status: 400 })
    }

    if (password.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 })
    }

    await resetPasswordWithToken(token, password)

    return NextResponse.json({ message: "Password updated successfully." })
  } catch (error: any) {
    console.error("Password reset failed:", error)
    return NextResponse.json(
      { error: error?.message || "Unable to reset password. Please request a new link." },
      { status: 400 }
    )
  }
}


