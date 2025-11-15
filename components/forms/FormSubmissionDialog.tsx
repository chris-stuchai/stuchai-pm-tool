"use client"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useReducer, useState, useTransition } from "react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "@/components/ui/use-toast"

interface FormField {
  id: string
  label: string
  type: "TEXT" | "TEXTAREA" | "SELECT" | "FILE"
  required: boolean
  options?: string[]
}

interface Assignment {
  id: string
  template: {
    name: string
    fields: FormField[]
  }
}

interface FormSubmissionDialogProps {
  assignment: Assignment
  trigger: React.ReactNode
  readOnly?: boolean
  existingResponses?: Record<string, any> | null
  onSubmitted?: () => void
}

type ResponseState = Record<string, any>

/** Updates the local response map when form fields change. */
function responseReducer(state: ResponseState, action: { fieldId: string; value: any }) {
  return {
    ...state,
    [action.fieldId]: action.value,
  }
}

/**
 * Renders the dialog for completing or reviewing a form assignment.
 */
export function FormSubmissionDialog({
  assignment,
  trigger,
  readOnly = false,
  existingResponses,
  onSubmitted,
}: FormSubmissionDialogProps) {
  const [open, setOpen] = useState(false)
  const [responses, dispatch] = useReducer(
    responseReducer,
    existingResponses || {}
  )
  const [pending, startTransition] = useTransition()

  const [uploadingField, setUploadingField] = useState<string | null>(null)

  const ensureArrayValue = (fieldId: string) => {
    const current = responses[fieldId]
    if (Array.isArray(current)) {
      return current
    }
    if (current && typeof current === "string") {
      return [{ name: "Attachment", url: current }]
    }
    return []
  }

  const handleFileUpload = async (fieldId: string, files: FileList | null) => {
    if (!files || files.length === 0) return
    setUploadingField(fieldId)
    try {
      const uploads = []
      for (const file of Array.from(files)) {
        const formData = new FormData()
        formData.append("file", file)
        formData.append("folder", `forms/${assignment.id}/${fieldId}`)
        const response = await fetch("/api/uploads", {
          method: "POST",
          body: formData,
        })
        if (!response.ok) {
          throw new Error("Failed to upload file")
        }
        const data = await response.json()
        uploads.push({
          name: data.name,
          url: data.url,
          mimeType: data.mimeType,
          size: data.size,
        })
      }
      const currentValues = ensureArrayValue(fieldId)
      dispatch({ fieldId, value: [...currentValues, ...uploads] })
    } catch (error) {
      console.error(error)
      toast({
        variant: "destructive",
        title: "File upload failed",
      })
    } finally {
      setUploadingField(null)
    }
  }

  const handleRemoveFile = (fieldId: string, index: number) => {
    const currentValues = ensureArrayValue(fieldId)
    const updated = currentValues.filter((_, i) => i !== index)
    dispatch({ fieldId, value: updated })
  }

  const handleSubmit = () => {
    if (readOnly) {
      setOpen(false)
      return
    }

    const missingRequired = assignment.template.fields.some((field) => {
      const value = responses[field.id]
      if (field.type === "FILE") {
        return field.required && (!Array.isArray(value) || value.length === 0)
      }
      return field.required && !value
    })

    if (missingRequired) {
      toast({
        variant: "destructive",
        title: "Please complete all required fields.",
      })
      return
    }

    startTransition(async () => {
      try {
        const response = await fetch("/api/forms/submissions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            assignmentId: assignment.id,
            responses,
          }),
        })

        if (!response.ok) {
          const data = await response.json().catch(() => ({}))
          throw new Error(data.error || "Failed to submit form")
        }

        setOpen(false)
        onSubmitted?.()
      } catch (error) {
        console.error(error)
        toast({
          variant: "destructive",
          title: "Failed to submit form",
          description: error instanceof Error ? error.message : undefined,
        })
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>{assignment.template.name}</DialogTitle>
          <DialogDescription>
            {readOnly ? "Review submission" : "Complete and submit the requested information."}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          {assignment.template.fields.map((field) => (
            <div key={field.id} className="space-y-2">
              <Label>
                {field.label} {field.required && "*"}
              </Label>
              {field.type === "TEXT" && (
                <Input
                  value={responses[field.id] || ""}
                  onChange={(e) => dispatch({ fieldId: field.id, value: e.target.value })}
                  disabled={readOnly}
                />
              )}
              {field.type === "TEXTAREA" && (
                <Textarea
                  value={responses[field.id] || ""}
                  onChange={(e) => dispatch({ fieldId: field.id, value: e.target.value })}
                  rows={4}
                  disabled={readOnly}
                />
              )}
              {field.type === "SELECT" && (
                <Select
                  value={responses[field.id] || ""}
                  onValueChange={(value) => dispatch({ fieldId: field.id, value })}
                  disabled={readOnly}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select option" />
                  </SelectTrigger>
                  <SelectContent>
                    {(field.options || []).map((option) => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              {field.type === "FILE" && (
                <>
                  <div className="space-y-2">
                    {Array.isArray(responses[field.id]) && responses[field.id].length > 0 && (
                      <div className="space-y-2 rounded-lg border p-3">
                        {responses[field.id].map((file: any, index: number) => (
                          <div key={`${file.url}-${index}`} className="flex items-center justify-between text-sm">
                            <a
                              href={file.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary hover:underline"
                            >
                              {file.name || "Attachment"}
                            </a>
                            {!readOnly && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRemoveFile(field.id, index)}
                              >
                                Remove
                              </Button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                    {!readOnly && (
                      <Input
                        type="file"
                        multiple
                        onChange={(e) => handleFileUpload(field.id, e.target.files)}
                        disabled={uploadingField === field.id}
                      />
                    )}
                    {readOnly && !responses[field.id] && (
                      <p className="text-xs text-muted-foreground">No files uploaded.</p>
                    )}
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Close
          </Button>
          {!readOnly && (
            <Button onClick={handleSubmit} disabled={pending}>
              {pending ? "Submitting..." : "Submit"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

