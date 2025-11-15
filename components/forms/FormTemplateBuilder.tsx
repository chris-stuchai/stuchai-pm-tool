"use client"

import { useState, useTransition } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useRouter } from "next/navigation"
import { Plus, Trash2 } from "lucide-react"

interface FormTemplateBuilderProps {
  templateCount: number
}

type FieldType = "TEXT" | "TEXTAREA" | "SELECT" | "FILE"

interface DraftField {
  id: string
  label: string
  type: FieldType
  required: boolean
  options: string[]
}

export function FormTemplateBuilder({ templateCount }: FormTemplateBuilderProps) {
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [fields, setFields] = useState<DraftField[]>([])
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const router = useRouter()

  const addField = () => {
    setFields((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        label: "",
        type: "TEXT",
        required: false,
        options: [],
      },
    ])
  }

  const updateField = (id: string, updates: Partial<DraftField>) => {
    setFields((prev) => prev.map((field) => (field.id === id ? { ...field, ...updates } : field)))
  }

  const removeField = (id: string) => {
    setFields((prev) => prev.filter((field) => field.id !== id))
  }

  const handleSubmit = () => {
    if (!name.trim()) {
      setError("Template name is required.")
      return
    }

    if (fields.length === 0) {
      setError("Add at least one field.")
      return
    }

    if (fields.some((field) => !field.label.trim())) {
      setError("Every field needs a label.")
      return
    }

    if (
      fields.some(
        (field) => field.type === "SELECT" && field.options.filter(Boolean).length === 0
      )
    ) {
      setError("Select fields must include at least one option.")
      return
    }

    setError(null)

    startTransition(async () => {
      try {
        const response = await fetch("/api/forms/templates", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: name.trim(),
            description: description.trim(),
            fields: fields.map((field) => ({
              label: field.label.trim(),
              type: field.type,
              required: field.required,
              options: field.type === "SELECT" ? field.options.filter(Boolean) : undefined,
            })),
          }),
        })

        if (!response.ok) {
          const data = await response.json().catch(() => ({}))
          throw new Error(data.error || "Failed to create template")
        }

        setName("")
        setDescription("")
        setFields([])
        router.refresh()
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to create template.")
      }
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Form Templates</CardTitle>
        <CardDescription>{templateCount} templates available</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="template-name">Template Name</Label>
            <Input
              id="template-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Onboarding Questionnaire"
              disabled={pending}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="template-description">Description</Label>
            <Textarea
              id="template-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Explain the purpose of this form..."
              rows={3}
              disabled={pending}
            />
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label>Fields</Label>
            <Button type="button" variant="outline" size="sm" onClick={addField} disabled={pending}>
              <Plus className="mr-2 h-4 w-4" />
              Add Field
            </Button>
          </div>
          {fields.length === 0 && (
            <p className="text-sm text-muted-foreground">No fields yet. Add your first question.</p>
          )}
          <div className="space-y-4">
            {fields.map((field) => (
              <div key={field.id} className="rounded-lg border p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">Field</Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeField(field.id)}
                    disabled={pending}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <Input
                  value={field.label}
                  onChange={(e) => updateField(field.id, { label: e.target.value })}
                  placeholder="Question or prompt"
                  disabled={pending}
                />
                <div className="grid grid-cols-2 gap-3">
                  <Select
                    value={field.type}
                    onValueChange={(value) => updateField(field.id, { type: value as FieldType })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="TEXT">Short Text</SelectItem>
                      <SelectItem value="TEXTAREA">Paragraph</SelectItem>
                      <SelectItem value="SELECT">Dropdown</SelectItem>
                      <SelectItem value="FILE">File Upload</SelectItem>
                    </SelectContent>
                  </Select>
                  <div className="flex items-center gap-2">
                    <input
                      id={`required-${field.id}`}
                      type="checkbox"
                      checked={field.required}
                      onChange={(e) => updateField(field.id, { required: e.target.checked })}
                      disabled={pending}
                    />
                    <Label htmlFor={`required-${field.id}`}>Required</Label>
                  </div>
                </div>
                {field.type === "SELECT" && (
                  <div className="space-y-2">
                    <Label>Dropdown Options (comma separated)</Label>
                    <Input
                      value={field.options.join(", ")}
                      onChange={(e) =>
                        updateField(field.id, {
                          options: e.target.value.split(",").map((opt) => opt.trim()),
                        })
                      }
                      placeholder="Option A, Option B"
                      disabled={pending}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button onClick={handleSubmit} disabled={pending}>
          {pending ? "Saving..." : "Create Template"}
        </Button>
      </CardContent>
    </Card>
  )
}

