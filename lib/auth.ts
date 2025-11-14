import { NextAuthOptions } from "next-auth"
import { PrismaAdapter } from "@auth/prisma-adapter"
import GoogleProvider from "next-auth/providers/google"
import CredentialsProvider from "next-auth/providers/credentials"
import { db } from "./db"
import { UserRole } from "@prisma/client"
import bcrypt from "bcryptjs"

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(db) as any,
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: "openid email profile https://www.googleapis.com/auth/gmail.send https://www.googleapis.com/auth/drive.readonly https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/calendar.events",
          access_type: "offline",
          prompt: "consent",
        },
      },
    }),
    CredentialsProvider({
      name: "Email",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        const user = await db.user.findUnique({
          where: { email: credentials.email },
        })

        if (!user || !user.password) {
          return null
        }

        if (!user.active) {
          throw new Error("AccountDisabled")
        }

        const isPasswordValid = await bcrypt.compare(
          credentials.password,
          user.password
        )

        if (!isPasswordValid) {
          return null
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
          role: user.role,
        }
      },
    }),
  ],
  callbacks: {
    async session({ session, token, user }) {
      if (session.user) {
        // For OAuth (database sessions via adapter)
        if (user) {
          session.user.id = user.id
          const dbUser = await db.user.findUnique({
            where: { id: user.id },
            select: { role: true },
          })
          session.user.role = dbUser?.role || UserRole.CLIENT
        } 
        // For credentials (JWT)
        else if (token) {
          session.user.id = token.id as string
          session.user.role = (token.role as UserRole) || UserRole.CLIENT
        }
      }
      return session
    },
    async jwt({ token, user, account }) {
      if (user) {
        token.id = user.id
        if ((user as any).role) {
          token.role = (user as any).role
        } else {
          // Fetch role from database
          const dbUser = await db.user.findUnique({
            where: { id: user.id },
            select: { role: true },
          })
          token.role = dbUser?.role || UserRole.CLIENT
        }
      }
      return token
    },
    async signIn({ user, account, profile }) {
      if (account?.provider === "google") {
        // Check if user exists with this email
        const existingUser = await db.user.findUnique({
          where: { email: user.email! },
          include: { accounts: true },
        })

        if (existingUser) {
          if (!existingUser.active) {
            return "/auth/signin?error=AccountDisabled"
          }
          // Check if Google account is already linked
          const hasGoogleAccount = existingUser.accounts.some(
            (acc) => acc.provider === "google"
          )
          
          if (!hasGoogleAccount) {
            // Link the Google account
            await db.account.create({
              data: {
                userId: existingUser.id,
                type: account.type,
                provider: account.provider,
                providerAccountId: account.providerAccountId,
                access_token: account.access_token,
                refresh_token: account.refresh_token,
                expires_at: account.expires_at,
                token_type: account.token_type,
                scope: account.scope,
                id_token: account.id_token,
                session_state: account.session_state,
              },
            })
          }
        }
      }
      // Let the adapter handle new user creation
      return true
    },
  },
  events: {
    async createUser({ user }) {
      // Set role for new users created via OAuth
      try {
        const userCount = await db.user.count()
        const role = userCount === 1 ? UserRole.ADMIN : UserRole.CLIENT
        
        await db.user.update({
          where: { id: user.id },
          data: { role },
        })
      } catch (error) {
        console.error("Error setting user role:", error)
      }
    },
  },
  pages: {
    signIn: "/auth/signin",
  },
  session: {
    strategy: "jwt", // Use JWT to support both OAuth and credentials
  },
}

