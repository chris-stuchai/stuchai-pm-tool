"use client"

import Image from "next/image"
import { useState } from "react"

export function Logo() {
  const [imageError, setImageError] = useState(false)

  return (
    <div className="relative h-10 w-10 flex-shrink-0">
      {!imageError ? (
        <Image
          src="/logo.png"
          alt="StuchAI Logo"
          fill
          className="object-contain"
          priority
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

