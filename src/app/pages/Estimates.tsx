import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import {
  Plus,
  FileText,
  Calendar,
  Send,
  CheckCircle2,
  XCircle,
  Search,
  Sparkles,
} from "lucide-react";
import { convertEstimateToJob, listEstimates, setEstimateStatus } from "../data/estimates";
import { useAsync } from "../data/useAsync";
import { useShop } from "../auth/ShopProvider";
import { QueryState } from "../components/QueryState";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { CreateEstimateDialog } from "../components/CreateEstimateDialog";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "../components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { JOB_TYPES, labelFor, type Estimate, type JobType } from "../data/types";
import { formatMoney, fromDateTimeInputValue, parseLocalDate, parseOptionalNumber } from "../format";

export function Estimates() {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const { shop } = useShop();
  const { data: estimates, error, reload } = useAsync(() => listEstimates(shop.id), [shop.id]);

  if (!estimates) return <QueryState error={error} onRetry={reload} />;

  const filteredEstimates = estimates.filter(estimate => {
    const matchesSearch = estimate.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         estimate.customerName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = filterStatus === "all" || estimate.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Estimates</h1>
          <p className="text-gray-500 mt-1">Create and manage job estimates</p>
        </div>
        <CreateEstimateDialog
          onCreated={reload}
          trigger={
            <Button className="h-11">
              <Plus className="w-4 h-4" />
              New estimate
            </Button>
          }
        />
      </div>

      {/* AI Estimate Generator (not built yet) */}
      <Card className="bg-gradient-to-r from-purple-50 to-blue-50 border-purple-200">
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-purple-600 rounded-lg flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900">AI estimate drafts <Badge variant="outline" className="ml-1">Coming soon</Badge></h3>
              <p className="text-sm text-gray-600 mt-1">
                Describe the job and the assistant will draft an estimate from your past line items and
                labor rate for you to review. No AI model is connected yet, so build estimates by hand for now.
              </p>
              <Button className="mt-3" variant="outline" disabled>
                Not connected yet
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search estimates..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-11"
              />
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-full sm:w-48 h-11">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="sent">Sent</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Declined</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Estimates List */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {filteredEstimates.map((estimate) => (
          <EstimateCard key={estimate.id} estimate={estimate} onChanged={reload} />
        ))}
      </div>

      {filteredEstimates.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-gray-500">
              {estimates.length === 0 ? "No estimates yet. Tap New estimate to write one." : "No estimates found matching your filters."}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

const STATUS_LABEL: Record<Estimate["status"], string> = {
  draft: "Draft",
  sent: "Sent",
  approved: "Approved",
  rejected: "Declined",
};

function StatusBadge({ status }: { status: Estimate["status"] }) {
  const variant = status === "approved" ? "default" : status === "sent" ? "secondary" : status === "rejected" ? "destructive" : "outline";
  const Icon = status === "approved" ? CheckCircle2 : status === "rejected" ? XCircle : status === "sent" ? Send : FileText;
  return (
    <Badge variant={variant} className="flex items-center gap-1">
      <Icon className="w-4 h-4" />
      {STATUS_LABEL[status]}
    </Badge>
  );
}

function formatValidUntil(validUntil: string | null): string {
  return validUntil ? parseLocalDate(validUntil).toLocaleDateString() : "No expiry";
}

function EstimateCard({ estimate, onChanged }: { estimate: Estimate; onChanged: () => void }) {
  const { shop } = useShop();

  const changeStatus = async (status: "sent" | "approved" | "rejected", message: string) => {
    await setEstimateStatus(shop.id, estimate.id, status);
    toast.success(message);
    onChanged();
  };

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-lg">{estimate.title}</CardTitle>
            <Link to={`/customers/${estimate.customerId}`} className="text-sm text-blue-600 hover:underline mt-1 inline-block">
              {estimate.customerName}
            </Link>
          </div>
          <StatusBadge status={estimate.status} />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {estimate.description && <p className="text-sm text-gray-600">{estimate.description}</p>}

        <div className="border-t pt-4">
          <div className="space-y-2">
            {estimate.items.slice(0, 3).map((item) => (
              <div key={item.id} className="flex justify-between gap-3 text-sm">
                <span className="text-gray-600">
                  {item.description} x{item.quantity}
                </span>
                <span className="font-medium text-gray-900">{formatMoney(item.total)}</span>
              </div>
            ))}
            {estimate.items.length > 3 && (
              <p className="text-sm text-gray-500">+{estimate.items.length - 3} more items</p>
            )}
            {estimate.items.length === 0 && <p className="text-sm text-gray-500">No line items</p>}
          </div>
        </div>

        <div className="border-t pt-4">
          <div className="flex justify-between items-center gap-3">
            <div>
              <div className="text-sm text-gray-500">Total</div>
              <div className="text-2xl font-bold text-gray-900">{formatMoney(estimate.total)}</div>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-500">Valid until</div>
              <div className="font-medium text-gray-900">{formatValidUntil(estimate.validUntil)}</div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Calendar className="w-4 h-4" />
          Created {new Date(estimate.createdAt).toLocaleDateString()}
          {estimate.sentAt && ` · Sent ${new Date(estimate.sentAt).toLocaleDateString()}`}
        </div>

        <div className="grid grid-cols-[repeat(auto-fit,minmax(9rem,1fr))] gap-2 pt-2">
          <EstimateDetailsDialog estimate={estimate} />

          {estimate.status === "draft" && (
            <ConfirmDialog
              trigger={
                <Button className="flex-1 h-11">
                  <Send className="w-4 h-4" />
                  Mark as sent
                </Button>
              }
              title="Mark this estimate as sent?"
              description={
                <>
                  <p>
                    <strong>Nothing will be sent to {estimate.customerName || "the customer"}.</strong> ElectroCRM
                    can't deliver estimates yet.
                  </p>
                  <p>
                    Only mark it sent after you've given it to them yourself (email, text, or in person). This
                    records today as the sent date.
                  </p>
                </>
              }
              confirmLabel="Mark as sent"
              errorMessage="Couldn't update the estimate"
              onConfirm={() => changeStatus("sent", "Estimate marked as sent")}
            />
          )}

          {estimate.status === "sent" && (
            <>
              <ConfirmDialog
                trigger={
                  <Button className="flex-1 h-11">
                    <CheckCircle2 className="w-4 h-4" />
                    Customer approved
                  </Button>
                }
                title="Record approval?"
                description={<p>Records that {estimate.customerName || "the customer"} approved this estimate for {formatMoney(estimate.total)}. You can then convert it to a job.</p>}
                confirmLabel="Mark approved"
                errorMessage="Couldn't update the estimate"
                onConfirm={() => changeStatus("approved", "Estimate marked approved")}
              />
              <ConfirmDialog
                trigger={
                  <Button variant="outline" className="flex-1 h-11">
                    <XCircle className="w-4 h-4" />
                    Declined
                  </Button>
                }
                title="Record that the customer declined?"
                description={<p>Marks this estimate as declined. Nothing is sent to the customer.</p>}
                confirmLabel="Mark declined"
                errorMessage="Couldn't update the estimate"
                onConfirm={() => changeStatus("rejected", "Estimate marked declined")}
              />
            </>
          )}

          {estimate.status === "approved" && (
            estimate.jobId ? (
              <Button asChild variant="secondary" className="flex-1 h-11">
                <Link to={`/jobs/${estimate.jobId}`}>View job</Link>
              </Button>
            ) : (
              <ConvertToJobDialog estimate={estimate} />
            )
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function EstimateDetailsDialog({ estimate }: { estimate: Estimate }) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" className="flex-1 h-11">View details</Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{estimate.title}</DialogTitle>
          <DialogDescription>
            {estimate.customerName} · {STATUS_LABEL[estimate.status]} · Valid until {formatValidUntil(estimate.validUntil)}
          </DialogDescription>
        </DialogHeader>
        {estimate.description && <p className="text-sm text-gray-700 whitespace-pre-line">{estimate.description}</p>}
        <div className="divide-y border-y">
          {estimate.items.map((item) => (
            <div key={item.id} className="py-2 flex justify-between gap-3 text-sm">
              <div className="min-w-0">
                <div className="font-medium">{item.description}</div>
                <div className="text-muted-foreground">
                  {labelFor(item.kind)} · {item.quantity} × {formatMoney(item.unitPrice)}
                </div>
              </div>
              <div className="font-medium shrink-0">{formatMoney(item.total)}</div>
            </div>
          ))}
          {estimate.items.length === 0 && <p className="py-2 text-sm text-muted-foreground">No line items</p>}
        </div>
        <div className="space-y-1 text-sm">
          <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>{formatMoney(estimate.subtotal)}</span></div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Tax ({+(estimate.taxRate * 100).toFixed(3)}%)</span>
            <span>{formatMoney(estimate.tax)}</span>
          </div>
          <div className="flex justify-between text-base font-semibold"><span>Total</span><span>{formatMoney(estimate.total)}</span></div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ConvertToJobDialog({ estimate }: { estimate: Estimate }) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<JobType | "">("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [hours, setHours] = useState(() => {
    // Prefill from the estimate's labor hours, if it has any.
    const laborHours = estimate.items.filter((i) => i.kind === "labor").reduce((sum, i) => sum + i.quantity, 0);
    // Round away float noise (0.1 + 0.2 shows as 0.30000000000000004).
    return laborHours > 0 ? String(Math.round(laborHours * 100) / 100) : "";
  });
  const [saving, setSaving] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const estimatedHours = parseOptionalNumber(hours);
    if (!type) return toast.error("Pick a job type");
    if (estimatedHours === "invalid") return toast.error("Hours must be a number, 0 or more");
    setSaving(true);
    try {
      const jobId = await convertEstimateToJob(estimate.id, {
        type,
        scheduledAt: fromDateTimeInputValue(scheduledAt),
        estimatedHours,
      });
      toast.success("Job created from estimate");
      navigate(`/jobs/${jobId}`);
    } catch (err) {
      toast.error(`Couldn't convert the estimate: ${(err as Error).message}`);
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !saving && setOpen(next)}>
      <DialogTrigger asChild>
        <Button className="flex-1 h-11">Convert to job</Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Convert to job</DialogTitle>
          <DialogDescription>
            Creates a job for {estimate.customerName} priced at {formatMoney(estimate.total)}. Nothing is sent to the customer.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor={`convert-type-${estimate.id}`}>Job type</Label>
            <Select value={type} onValueChange={(v) => setType(v as JobType)}>
              <SelectTrigger id={`convert-type-${estimate.id}`} className="h-11"><SelectValue placeholder="Select type" /></SelectTrigger>
              <SelectContent>
                {JOB_TYPES.map((t) => <SelectItem key={t} value={t}>{labelFor(t)}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`convert-when-${estimate.id}`}>Scheduled for (optional)</Label>
            <Input id={`convert-when-${estimate.id}`} className="h-11" type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`convert-hours-${estimate.id}`}>Estimated hours (optional)</Label>
            <Input id={`convert-hours-${estimate.id}`} className="h-11" type="number" inputMode="decimal" min="0" step="0.25" value={hours} onChange={(e) => setHours(e.target.value)} />
          </div>
          <Button type="submit" className="w-full h-11" disabled={saving}>
            {saving ? "Creating job…" : "Create job"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
