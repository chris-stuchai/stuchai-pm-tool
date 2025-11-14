"use client"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Send, MessageSquare } from "lucide-react"
import { formatDate } from "@/lib/utils"
import { UserMentionInput } from "@/components/common/UserMentionInput"

interface User {
  id: string
  name: string | null
  email: string
  image: string | null
}

interface Mention {
  id: string
  mentionedUser: {
    id: string
    name: string | null
    email: string
  }
}

interface Message {
  id: string
  content: string
  sender: User
  recipient: User | null
  mentions: Mention[]
  createdAt: Date
}

interface ClientMessagesProps {
  clientId: string
  currentUserId: string
}

export function ClientMessages({ clientId, currentUserId }: ClientMessagesProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [content, setContent] = useState("")
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [mentionedUserIds, setMentionedUserIds] = useState<string[]>([])
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const fetchMessages = async () => {
    try {
      const response = await fetch(`/api/messages?clientId=${clientId}`)
      if (response.ok) {
        const data = await response.json()
        setMessages(data.reverse()) // Reverse to show oldest first
      }
    } catch (error) {
      console.error("Error fetching messages:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchMessages()
    // Poll for new messages every 5 seconds
    const interval = setInterval(fetchMessages, 5000)
    return () => clearInterval(interval)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!content.trim()) return

    setSending(true)
    try {
      const response = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content,
          clientId,
          mentions: mentionedUserIds,
        }),
      })

      if (response.ok) {
        setContent("")
        setMentionedUserIds([])
        fetchMessages()
      } else {
        alert("Failed to send message")
      }
    } catch (error) {
      console.error("Error sending message:", error)
      alert("Failed to send message")
    } finally {
      setSending(false)
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

  if (loading) {
    return <div>Loading messages...</div>
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          Messages
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="h-96 overflow-y-auto space-y-4 pr-2">
          {messages.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <MessageSquare className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No messages yet. Start the conversation!</p>
            </div>
          ) : (
            messages.map((message) => {
              const isOwn = message.sender.id === currentUserId
              const hasMentions = message.mentions.length > 0

              return (
                <div
                  key={message.id}
                  className={`flex gap-3 ${isOwn ? "flex-row-reverse" : ""}`}
                >
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={message.sender.image || undefined} />
                    <AvatarFallback>
                      {getInitials(message.sender.name, message.sender.email)}
                    </AvatarFallback>
                  </Avatar>
                  <div className={`flex-1 ${isOwn ? "items-end" : ""}`}>
                    <div
                      className={`inline-block rounded-lg px-4 py-2 ${
                        isOwn
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted"
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm">
                          {message.sender.name || message.sender.email}
                        </span>
                        <span className="text-xs opacity-70">
                          {formatDate(message.createdAt)}
                        </span>
                      </div>
                      <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                      {hasMentions && (
                        <div className="mt-2 pt-2 border-t border-opacity-20">
                          <p className="text-xs opacity-70">
                            Mentioned:{" "}
                            {message.mentions
                              .map((m) => m.mentionedUser.name || m.mentionedUser.email)
                              .join(", ")}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        <form onSubmit={handleSend} className="space-y-2">
          <UserMentionInput
            value={content}
            onChange={setContent}
            onMentionsChange={setMentionedUserIds}
            placeholder="Type a message... Use @ to mention someone"
          />
          <Button type="submit" disabled={sending || !content.trim()}>
            <Send className="mr-2 h-4 w-4" />
            {sending ? "Sending..." : "Send"}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

