"use client"

import { useEffect } from "react"

const HEARTBEAT_INTERVAL = 60_000

/** Sends a heartbeat to the server so teammates can see who is online. */
export function usePresenceHeartbeat(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return

    let cancelled = false

    async function sendHeartbeat() {
      try {
        await fetch("/api/presence", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        })
      } catch (error) {
        if (process.env.NODE_ENV !== "production") {
          console.warn("Presence heartbeat failed", error)
        }
      }
    }

    sendHeartbeat()
    const interval = setInterval(() => {
      if (!cancelled) {
        sendHeartbeat()
      }
    }, HEARTBEAT_INTERVAL)

    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [enabled])
}

