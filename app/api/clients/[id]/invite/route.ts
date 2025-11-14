import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { UserRole } from "@prisma/client"
import crypto from "crypto"

/**
 * Send invitation email to client
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Only ADMIN and MANAGER can invite clients
    if (session.user.role !== UserRole.ADMIN && session.user.role !== UserRole.MANAGER) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const client = await db.client.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        name: true,
        email: true,
      },
    })

    if (!client) {
      return NextResponse.json(
        { error: "Client not found" },
        { status: 404 }
      )
    }

    // Check if user already exists with this email
    const existingUser = await db.user.findUnique({
      where: { email: client.email },
    })

    if (existingUser) {
      return NextResponse.json(
        { error: "User with this email already exists. They can log in directly." },
        { status: 400 }
      )
    }

    // Generate invitation token (valid for 7 days)
    const token = crypto.randomBytes(32).toString("hex")
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7)

    // Store invitation token (we'll create a table for this)
    await db.$executeRaw`
      INSERT INTO client_invitations (id, client_id, token, expires_at, created_at)
      VALUES (gen_random_uuid(), ${client.id}, ${token}, ${expiresAt}, NOW())
      ON CONFLICT (client_id) 
      DO UPDATE SET token = ${token}, expires_at = ${expiresAt}, created_at = NOW()
    `

    // Build invitation URL
    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000"
    const invitationUrl = `${baseUrl}/auth/accept-invitation?token=${token}`

    // Send invitation email
    const emailBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #2563eb;">You're Invited to StuchAI Portal</h1>
        <p>Hello ${client.name},</p>
        <p>You've been invited to access the StuchAI project management portal.</p>
        <p>Click the button below to create your account and get started:</p>
        <div style="margin: 30px 0; text-align: center;">
          <a href="${invitationUrl}" 
             style="background-color: #2563eb; color: white; padding: 12px 24px; 
                    text-decoration: none; border-radius: 6px; display: inline-block;">
            Accept Invitation & Create Account
          </a>
        </div>
        <p style="color: #666; font-size: 14px;">
          This invitation link will expire in 7 days. If you didn't expect this invitation, you can safely ignore this email.
        </p>
        <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
        <p style="color: #666; font-size: 12px;">
          If the button doesn't work, copy and paste this link into your browser:<br>
          <a href="${invitationUrl}" style="color: #2563eb;">${invitationUrl}</a>
        </p>
      </div>
    `

    // For now, log the invitation URL (you'll need to set up Gmail API to actually send)
    console.log(`Invitation URL for ${client.email}: ${invitationUrl}`)

    // TODO: Implement actual email sending via Gmail API
    // For now, return success with the URL
    return NextResponse.json({
      success: true,
      message: "Invitation created successfully",
      invitationUrl, // Include URL so admin can manually send it if needed
    })
  } catch (error) {
    console.error("Error creating invitation:", error)
    return NextResponse.json(
      { error: "Failed to create invitation" },
      { status: 500 }
    )
  }
}

