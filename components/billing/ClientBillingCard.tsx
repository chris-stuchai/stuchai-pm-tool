"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { formatCurrency } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { CreateContractDialog } from "./CreateContractDialog"
import { useRouter } from "next/navigation"

interface Invoice {
  id: string
  amount: string
  currency: string
  dueDate: string
  status: "PENDING" | "PAID" | "OVERDUE" | "VOID"
  externalUrl?: string | null
}

interface Contract {
  id: string
  name: string
  amount: string
  currency: string
  startDate: string
  endDate?: string | null
  recurrence?: string | null
  paymentMethod?: string | null
  notes?: string | null
  invoices: Invoice[]
}

interface ClientBillingCardProps {
  clientId: string
  contracts: Contract[]
  canEdit: boolean
}

export function ClientBillingCard({ clientId, contracts, canEdit }: ClientBillingCardProps) {
  const router = useRouter()
  const activeContract = contracts[0]

  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Billing</CardTitle>
          <CardDescription>Contract value, cadence, and payments.</CardDescription>
        </div>
        {canEdit && <CreateContractDialog clientId={clientId} onCreated={() => router.refresh()} />}
      </CardHeader>
      <CardContent className="space-y-4">
        {activeContract ? (
          <>
            <div className="flex flex-wrap items-center gap-4">
              <div>
                <p className="text-xs uppercase text-muted-foreground">Contract</p>
                <p className="text-lg font-semibold">{activeContract.name}</p>
              </div>
              <div>
                <p className="text-xs uppercase text-muted-foreground">Value</p>
                <p className="text-lg font-semibold">
                  {formatCurrency(Number(activeContract.amount), activeContract.currency)}
                </p>
              </div>
              {activeContract.recurrence && (
                <Badge variant="secondary">{activeContract.recurrence}</Badge>
              )}
            </div>
            <div className="grid gap-3 text-sm md:grid-cols-2">
              <div>
                <p className="text-xs uppercase text-muted-foreground">Term</p>
                <p>
                  {new Date(activeContract.startDate).toLocaleDateString()} —{" "}
                  {activeContract.endDate ? new Date(activeContract.endDate).toLocaleDateString() : "Open"}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase text-muted-foreground">Payment method</p>
                <p>{activeContract.paymentMethod || "Not specified"}</p>
              </div>
            </div>
            {activeContract.notes && (
              <div className="rounded-md bg-slate-50 p-3 text-sm text-slate-600">
                {activeContract.notes}
              </div>
            )}
            <div className="rounded-md border">
              <div className="border-b px-3 py-2 text-xs font-semibold uppercase text-muted-foreground">
                Invoices
              </div>
              {activeContract.invoices.length === 0 ? (
                <p className="px-3 py-4 text-sm text-muted-foreground">No invoices recorded.</p>
              ) : (
                <div className="divide-y text-sm">
                  {activeContract.invoices.map((invoice) => (
                    <div key={invoice.id} className="flex items-center justify-between px-3 py-2">
                      <div>
                        <p className="font-medium">
                          {formatCurrency(Number(invoice.amount), invoice.currency)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Due {new Date(invoice.dueDate).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={
                            invoice.status === "PAID"
                              ? "secondary"
                              : invoice.status === "OVERDUE"
                              ? "destructive"
                              : "outline"
                          }
                        >
                          {invoice.status}
                        </Badge>
                        {invoice.externalUrl && (
                          <Button asChild size="sm" variant="link" className="h-7 px-2 text-xs">
                            <a href={invoice.externalUrl} target="_blank" rel="noopener noreferrer">
                              View
                            </a>
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="text-sm text-muted-foreground">
            No billing data yet. {canEdit ? "Add a contract to capture terms and costs." : "Your team has not shared billing info yet."}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

