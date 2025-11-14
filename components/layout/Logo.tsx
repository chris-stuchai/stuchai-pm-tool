"use client"

import { useState } from "react"

export function Logo() {
  const [imageError, setImageError] = useState(false)

  return (
    <div className="relative h-10 w-auto flex-shrink-0">
      {!imageError ? (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          src="/logo.png"
          alt="StuchAI Logo"
          className="h-full w-auto object-contain"
          style={{ maxHeight: "40px", width: "auto" }}
          onError={() => setImageError(true)}
        />
      ) : (
        // Fallback logo
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-600">
          <span className="text-xl font-bold text-white">S</span>
        </div>
      )}
    </div>
  )
}

