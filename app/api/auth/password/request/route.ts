import { NextRequest, NextResponse } from "next/server"
import { requestPasswordReset } from "@/lib/password-reset"

/**
 * Handles password reset requests by dispatching an email with a secure link.
 * Always responds with a generic success message to avoid leaking account existence.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const email = typeof body.email === "string" ? body.email.trim() : ""

    if (!email) {
      return NextResponse.json({ error: "Email is required." }, { status: 400 })
    }

    await requestPasswordReset(email)

    return NextResponse.json({ message: "If an account exists, a reset link has been sent." })
  } catch (error: any) {
    console.error("Password reset request failed:", error)
    return NextResponse.json(
      {
        error:
          error?.message?.includes("Google")
            ? error.message
            : "Unable to send reset link right now. Please contact your administrator.",
      },
      { status: 500 }
    )
  }
}


