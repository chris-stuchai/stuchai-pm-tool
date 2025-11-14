"use client"

export function Logo() {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl bg-[#5278FF] shadow-sm">
        <span className="text-xl font-bold text-white">S</span>
      </div>
      <div className="leading-tight">
        <div className="text-lg font-bold text-gray-900">StuchAI</div>
        <div className="text-xs text-gray-500">Simplifying tech for all.</div>
      </div>
    </div>
  )
}

