"use client"

import { useState } from "react"

export function Logo() {
  const [imageError, setImageError] = useState(false)

  return (
    <div className="flex items-center gap-3">
      <div className="flex h-10 w-32 flex-shrink-0 items-center">
        {!imageError ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src="https://i.imgur.com/An3fwaG.png"
            alt="StuchAI"
            className="h-10 w-full object-contain"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#5278FF] shadow-sm">
            <span className="text-xl font-bold text-white">S</span>
          </div>
        )}
      </div>
      <div className="leading-tight">
        <div className="text-lg font-bold text-gray-900">StuchAI</div>
        <div className="text-xs text-gray-500">Simplifying tech for all.</div>
      </div>
    </div>
  )
}

