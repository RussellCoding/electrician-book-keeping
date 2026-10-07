import { useState, type FormEvent, type ReactNode } from "react";
import { toast } from "sonner";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { useShop } from "../auth/ShopProvider";
import { listCustomers } from "../data/customers";
import { createJob } from "../data/jobs";
import { useAsync } from "../data/useAsync";
import { JOB_PRIORITIES, JOB_TYPES, labelFor, type JobPriority, type JobType } from "../data/types";
import { fromDateTimeInputValue, parseOptionalNumber } from "../format";

interface Props {
  trigger: ReactNode;
  /** Preselects (and locks) the customer, e.g. from a customer's page. */
  customerId?: string;
  onCreated: (jobId: string) => void;
}

/** "Create job" dialog. Loads the customer list when opened. */
export function CreateJobDialog({ trigger, customerId, onCreated }: Props) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create job</DialogTitle>
          <DialogDescription>Adds the job to your schedule. Nothing is sent to the customer.</DialogDescription>
        </DialogHeader>
        {open && (
          <JobForm
            customerId={customerId}
            onDone={(id) => {
              setOpen(false);
              onCreated(id);
            }}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function JobForm({ customerId: fixedCustomerId, onDone }: { customerId?: string; onDone: (id: string) => void }) {
  const { shop } = useShop();
  const customers = useAsync(() => listCustomers(shop.id), [shop.id]);
  const [customerId, setCustomerId] = useState(fixedCustomerId ?? "");
  const [title, setTitle] = useState("");
  const [type, setType] = useState<JobType | "">("");
  const [priority, setPriority] = useState<JobPriority>("medium");
  const [description, setDescription] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [hours, setHours] = useState("");
  const [price, setPrice] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const estimatedHours = parseOptionalNumber(hours);
    const priceValue = parseOptionalNumber(price);
    if (!customerId) return toast.error("Pick a customer");
    if (!title.trim()) return toast.error("Give the job a title");
    if (!type) return toast.error("Pick a job type");
    if (estimatedHours === "invalid") return toast.error("Hours must be a number, 0 or more");
    if (priceValue === "invalid") return toast.error("Price must be a number, 0 or more");

    setSaving(true);
    try {
      const id = await createJob(shop.id, {
        customerId,
        title,
        type,
        priority,
        description,
        scheduledAt: fromDateTimeInputValue(scheduledAt),
        estimatedHours,
        price: priceValue,
      });
      toast.success("Job created");
      onDone(id);
    } catch (err) {
      toast.error(`Couldn't create the job: ${(err as Error).message}`);
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="job-customer">Customer</Label>
        <Select value={customerId} onValueChange={setCustomerId} disabled={!!fixedCustomerId}>
          <SelectTrigger id="job-customer" className="h-11">
            <SelectValue placeholder={customers.loading ? "Loading customers…" : "Select customer"} />
          </SelectTrigger>
          <SelectContent>
            {(customers.data ?? []).map((c) => (
              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {customers.error && <p className="text-sm text-destructive">Couldn't load customers: {customers.error.message}</p>}
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="job-title">Job title</Label>
        <Input id="job-title" className="h-11" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Panel upgrade" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="job-type">Type</Label>
          <Select value={type} onValueChange={(v) => setType(v as JobType)}>
            <SelectTrigger id="job-type" className="h-11"><SelectValue placeholder="Select type" /></SelectTrigger>
            <SelectContent>
              {JOB_TYPES.map((t) => <SelectItem key={t} value={t}>{labelFor(t)}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="job-priority">Priority</Label>
          <Select value={priority} onValueChange={(v) => setPriority(v as JobPriority)}>
            <SelectTrigger id="job-priority" className="h-11"><SelectValue /></SelectTrigger>
            <SelectContent>
              {JOB_PRIORITIES.map((p) => <SelectItem key={p} value={p}>{labelFor(p)}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="job-description">Description</Label>
        <Textarea id="job-description" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What needs doing" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="job-when">Scheduled for (optional)</Label>
          <Input id="job-when" className="h-11" type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="job-hours">Est. hours</Label>
            <Input id="job-hours" className="h-11" type="number" inputMode="decimal" min="0" step="0.25" value={hours} onChange={(e) => setHours(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="job-price">Price ($)</Label>
            <Input id="job-price" className="h-11" type="number" inputMode="decimal" min="0" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} />
          </div>
        </div>
      </div>
      <Button type="submit" className="w-full h-11" disabled={saving}>
        {saving ? "Saving…" : "Create job"}
      </Button>
    </form>
  );
}
