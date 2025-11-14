"use client"

import { useState, useEffect, useRef } from "react"
import { Textarea } from "@/components/ui/textarea"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useSession } from "next-auth/react"

interface User {
  id: string
  name: string | null
  email: string
  image: string | null
}

interface UserMentionInputProps {
  value: string
  onChange: (value: string) => void
  onMentionsChange: (userIds: string[]) => void
  placeholder?: string
}

export function UserMentionInput({
  value,
  onChange,
  onMentionsChange,
  placeholder = "Type a message...",
}: UserMentionInputProps) {
  const { data: session } = useSession()
  const [users, setUsers] = useState<User[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [suggestions, setSuggestions] = useState<User[]>([])
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [mentionStart, setMentionStart] = useState<number | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const suggestionsRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetchUsers()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const fetchUsers = async () => {
    try {
      const response = await fetch("/api/users")
      if (response.ok) {
        const data = await response.json()
        // Filter out current user
        const filtered = data.filter(
          (u: User) => u.id !== session?.user?.id
        )
        setUsers(filtered)
      }
    } catch (error) {
      console.error("Error fetching users:", error)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value
    onChange(newValue)

    const cursorPosition = e.target.selectionStart
    const textBeforeCursor = newValue.substring(0, cursorPosition)
    const lastAtIndex = textBeforeCursor.lastIndexOf("@")

    if (lastAtIndex !== -1) {
      const textAfterAt = textBeforeCursor.substring(lastAtIndex + 1)
      // Check if we're still typing the mention (no space after @)
      if (!textAfterAt.includes(" ") && !textAfterAt.includes("\n")) {
        setMentionStart(lastAtIndex)
        const searchTerm = textAfterAt.toLowerCase()
        const filtered = users.filter(
          (user) =>
            user.name?.toLowerCase().includes(searchTerm) ||
            user.email.toLowerCase().includes(searchTerm)
        )
        setSuggestions(filtered.slice(0, 5))
        setShowSuggestions(filtered.length > 0)
        setSelectedIndex(0)
      } else {
        setShowSuggestions(false)
        setMentionStart(null)
      }
    } else {
      setShowSuggestions(false)
      setMentionStart(null)
    }
  }

  const insertMention = (user: User) => {
    if (mentionStart === null) return

    const textBefore = value.substring(0, mentionStart)
    const textAfter = value.substring(textareaRef.current?.selectionStart || value.length)
    const newValue = `${textBefore}@${user.name || user.email} ${textAfter}`
    
    onChange(newValue)
    setShowSuggestions(false)
    setMentionStart(null)

    // Update mentioned user IDs
    const mentions = extractMentions(newValue)
    onMentionsChange(mentions.map((m) => m.userId))

    // Focus back on textarea
    setTimeout(() => {
      const newCursorPos = mentionStart + `@${user.name || user.email} `.length
      textareaRef.current?.setSelectionRange(newCursorPos, newCursorPos)
      textareaRef.current?.focus()
    }, 0)
  }

  const extractMentions = (text: string): Array<{ userId: string; name: string }> => {
    const mentions: Array<{ userId: string; name: string }> = []
    const mentionRegex = /@([^\s@]+)/g
    let match

    while ((match = mentionRegex.exec(text)) !== null) {
      const mentionText = match[1]
      const user = users.find(
        (u) =>
          u.name?.toLowerCase() === mentionText.toLowerCase() ||
          u.email.toLowerCase() === mentionText.toLowerCase()
      )
      if (user) {
        mentions.push({
          userId: user.id,
          name: user.name || user.email,
        })
      }
    }

    return mentions
  }

  useEffect(() => {
    // Extract mentions from current value
    const mentions = extractMentions(value)
    const userIds = mentions.map((m) => m.userId)
    onMentionsChange(userIds)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, users])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (showSuggestions && suggestions.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault()
        setSelectedIndex((prev) =>
          prev < suggestions.length - 1 ? prev + 1 : prev
        )
      } else if (e.key === "ArrowUp") {
        e.preventDefault()
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : prev))
      } else if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault()
        insertMention(suggestions[selectedIndex])
      } else if (e.key === "Escape") {
        setShowSuggestions(false)
      }
    }
  }

  const getInitials = (name: string | null, email: string) => {
    if (name) {
      return name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    }
    return email[0].toUpperCase()
  }

  return (
    <div className="relative">
      <Textarea
        ref={textareaRef}
        value={value}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        rows={3}
        className="pr-10"
      />
      {showSuggestions && suggestions.length > 0 && (
        <div
          ref={suggestionsRef}
          className="absolute bottom-full left-0 mb-2 w-full bg-white border rounded-lg shadow-lg z-50 max-h-48 overflow-y-auto"
        >
          {suggestions.map((user, index) => (
            <button
              key={user.id}
              type="button"
              className={`w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-100 ${
                index === selectedIndex ? "bg-gray-100" : ""
              }`}
              onClick={() => insertMention(user)}
            >
              <Avatar className="h-8 w-8">
                <AvatarImage src={user.image || undefined} />
                <AvatarFallback>
                  {getInitials(user.name, user.email)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 text-left">
                <p className="font-medium text-sm">{user.name || user.email}</p>
                {user.name && (
                  <p className="text-xs text-muted-foreground">{user.email}</p>
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

