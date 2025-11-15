"use client"

type ToastVariant = "default" | "destructive"

interface ToastOptions {
  title?: string
  description?: string
  variant?: ToastVariant
}

/**
 * Lightweight fallback toast helper so pages can call toast(...) even without
 * a full notification system mounted yet.
 */
export function toast({ title, description, variant = "default" }: ToastOptions) {
  const message = [title, description].filter(Boolean).join("\n")

  if (typeof window !== "undefined" && message) {
    if (variant === "destructive") {
      console.error(message)
    } else {
      console.info(message)
    }
    // Use alert as a simple visual fallback when running without a toast UI.
    window.alert(message)
  } else if (message) {
    if (variant === "destructive") {
      console.error(message)
    } else {
      console.log(message)
    }
  }

  return {
    dismiss: () => {},
  }
}

export function useToast() {
  return { toast }
}

