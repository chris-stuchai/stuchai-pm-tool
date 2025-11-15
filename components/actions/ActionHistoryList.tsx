"use client"

import { formatDistanceToNow } from "date-fns"

interface HistoryItem {
  id: string
  previousStatus?: string | null
  newStatus: string
  summary?: string | null
  outcomeTag?: string | null
  notifiedUserIds: string[]
  followUpActionId?: string | null
  createdAt: string | Date
  author: {
    id: string
    name: string | null
    email: string
  }
}

interface ActionHistoryListProps {
  history: HistoryItem[]
}

export function ActionHistoryList({ history }: ActionHistoryListProps) {
  if (!history || history.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-slate-200 p-3 text-xs text-muted-foreground">
        No updates recorded yet.
      </div>
    )
  }

  return (
    <div className="rounded-md border border-slate-200">
      <div className="border-b px-3 py-2 text-xs font-semibold text-slate-600">
        Activity
      </div>
      <div className="divide-y">
        {history.map((entry) => (
          <div key={entry.id} className="px-3 py-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-medium text-slate-900">
                {entry.author.name || entry.author.email}
              </span>
              <span className="text-muted-foreground">
                {formatDistanceToNow(new Date(entry.createdAt), { addSuffix: true })}
              </span>
            </div>
            <p className="mt-1 text-slate-800">
              {entry.previousStatus
                ? `${entry.previousStatus} → ${entry.newStatus}`
                : `Set to ${entry.newStatus}`}
            </p>
            {entry.summary && <p className="mt-1 text-slate-600">{entry.summary}</p>}
            {entry.outcomeTag && (
              <span className="mt-1 inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-slate-700">
                {entry.outcomeTag}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

