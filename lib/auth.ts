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
    async session({ session, token }) {
      if (session.user && token) {
        session.user.id = token.id as string
        session.user.role = (token.role as UserRole) || UserRole.CLIENT
      }
      return session
    },
    async jwt({ token, user, account }) {
      if (user) {
        token.id = user.id
        // Get role from database if not in token
        if (!token.role) {
          const dbUser = await db.user.findUnique({
            where: { id: user.id },
            select: { role: true },
          })
          token.role = dbUser?.role || UserRole.CLIENT
        } else {
          token.role = (user as any).role || UserRole.CLIENT
        }
      }
      return token
    },
    async signIn({ user, account, profile }) {
      // Let the adapter handle account linking
      // We'll set the role in the user creation callback
      return true
    },
  },
  events: {
    async createUser({ user }) {
      // Set role for new users (only if not already set)
      const dbUser = await db.user.findUnique({
        where: { id: user.id },
      })
      
      if (dbUser && !dbUser.role) {
        const userCount = await db.user.count()
        const role = userCount === 1 ? UserRole.ADMIN : UserRole.CLIENT
        
        await db.user.update({
          where: { id: user.id },
          data: { role },
        })
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

