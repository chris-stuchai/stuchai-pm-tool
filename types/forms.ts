export type FormFieldType = "TEXT" | "TEXTAREA" | "SELECT" | "FILE"

export interface SerializedFormField {
  id: string
  label: string
  type: FormFieldType
  required: boolean
  options?: string[] | null
}

export interface SerializedFormAssignment {
  id: string
  status: "PENDING" | "SUBMITTED" | "REVIEWED"
  createdAt: string
  client: {
    id: string
    name: string
    company: string | null
  }
  project?: {
    id: string
    name: string
  } | null
  template: {
    id: string
    name: string
    fields: SerializedFormField[]
  }
  submissions: Array<{
    id: string
    submittedAt: string
    responses: Record<string, any>
    submitter?: {
      id: string
      name: string | null
      email: string
    } | null
  }>
}

