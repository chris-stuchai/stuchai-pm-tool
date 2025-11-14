import { withAuth } from "next-auth/middleware"
import { NextResponse } from "next/server"

export default withAuth(
  function middleware(req) {
    return NextResponse.next()
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  }
)

export const config = {
  matcher: [
    /*
     * Match all request paths except for:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, robots.txt, sitemap.xml
     * - auth (auth pages)
     * - Any file with an extension (contains a dot in the last path segment)
     */
    "/((?!api/|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|auth/)(?!.*\\.[a-z0-9]+$).*)",
  ],
}

