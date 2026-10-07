import { useState, type FormEvent, type ReactNode } from "react";
import { useParams, Link } from "react-router";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "../components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import {
  ArrowLeft,
  Calendar,
  Clock,
  DollarSign,
  MapPin,
  User,
  FileText,
  CheckCircle2,
  Pencil,
  Play,
  ExternalLink,
  StickyNote,
} from "lucide-react";
import { completeJob, getJob, startJob, updateJob } from "../data/jobs";
import { useAsync } from "../data/useAsync";
import { useShop } from "../auth/ShopProvider";
import { QueryState } from "../components/QueryState";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { JOB_PRIORITIES, labelFor, type Job, type JobPriority } from "../data/types";
import {
  formatMoney,
  fromDateTimeInputValue,
  mapsUrl,
  parseOptionalNumber,
  toDateTimeInputValue,
} from "../format";

const getStatusColor = (status: string) => {
  switch (status) {
    case 'completed': return 'default';
    case 'in-progress': return 'secondary';
    case 'scheduled': return 'outline';
    case 'cancelled': return 'destructive';
    default: return 'outline';
  }
};

const getPriorityColor = (priority: string) => {
  switch (priority) {
    case 'urgent': return 'destructive';
    case 'high': return 'default';
    case 'medium': return 'secondary';
    case 'low': return 'outline';
    default: return 'outline';
  }
};

const formatDateTime = (iso: string) =>
  new Date(iso).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });

export function JobDetail() {
  const { id } = useParams();
  const { shop } = useShop();
  const { data: job, error, reload } = useAsync(() => getJob(shop.id, id), [shop.id, id]);
  const [actualHours, setActualHours] = useState("");
  const [starting, setStarting] = useState(false);

  if (job === undefined) return <QueryState error={error} onRetry={reload} />;

  if (!job) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-gray-500">Job not found</p>
            <Link to="/jobs">
              <Button className="mt-4">Back to Jobs</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleStart = async () => {
    setStarting(true);
    try {
      await startJob(shop.id, job.id);
      toast.success("Job started");
      reload();
    } catch (err) {
      toast.error(`Couldn't start the job: ${(err as Error).message}`);
    } finally {
      setStarting(false);
    }
  };

  const handleComplete = async () => {
    const hours = parseOptionalNumber(actualHours);
    if (hours === "invalid") throw new Error("Hours must be a number, 0 or more");
    await completeJob(shop.id, job.id, { actualHours: hours });
    toast.success("Job completed");
    reload();
  };

  const canComplete = job.status === 'scheduled' || job.status === 'in-progress';

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div>
        <Link to="/jobs">
          <Button variant="ghost" size="sm" className="mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Jobs
          </Button>
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">{job.title}</h1>
            <div className="flex flex-wrap items-center gap-2 mt-3">
              <Badge variant={getStatusColor(job.status)}>{labelFor(job.status)}</Badge>
              <Badge variant={getPriorityColor(job.priority)}>{labelFor(job.priority)}</Badge>
              <Badge variant="outline">{labelFor(job.type)}</Badge>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:flex gap-2">
            <EditJobDialog job={job} onSaved={reload} />
            {job.status === 'scheduled' && (
              <Button className="h-11" onClick={handleStart} disabled={starting}>
                <Play className="w-4 h-4" />
                {starting ? "Starting…" : "Start job"}
              </Button>
            )}
            {canComplete && (
              <ConfirmDialog
                trigger={
                  <Button className="h-11 col-span-2 sm:col-span-1" variant={job.status === 'in-progress' ? 'default' : 'outline'}>
                    <CheckCircle2 className="w-4 h-4" />
                    Complete job
                  </Button>
                }
                title="Mark this job complete?"
                description={<p>Records the job as finished now. Nothing is sent to the customer.</p>}
                confirmLabel="Complete job"
                errorMessage="Couldn't complete the job"
                onConfirm={handleComplete}
              >
                <div className="space-y-1.5">
                  <Label htmlFor="actual-hours">Hours actually worked (optional)</Label>
                  <Input
                    id="actual-hours"
                    className="h-11"
                    type="number"
                    inputMode="decimal"
                    min="0"
                    step="0.25"
                    value={actualHours}
                    onChange={(e) => setActualHours(e.target.value)}
                    placeholder={job.estimatedHours === null ? undefined : `Estimated ${job.estimatedHours}`}
                  />
                </div>
              </ConfirmDialog>
            )}
          </div>
        </div>
      </div>

      {/* Job Details Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Calendar className="w-5 h-5 text-blue-600" />
              <div>
                <div className="text-sm text-gray-500">Scheduled</div>
                <div className="font-medium text-gray-900">
                  {job.scheduledDate ? formatDateTime(job.scheduledDate) : 'Not scheduled'}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Clock className="w-5 h-5 text-purple-600" />
              <div>
                <div className="text-sm text-gray-500">Hours</div>
                <div className="font-medium text-gray-900">
                  {job.estimatedHours === null ? 'No estimate' : `${job.estimatedHours} estimated`}
                  {job.actualHours !== undefined && ` · ${job.actualHours} actual`}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <DollarSign className="w-5 h-5 text-green-600" />
              <div>
                <div className="text-sm text-gray-500">Price</div>
                <div className="font-medium text-gray-900">{job.cost === null ? 'No price' : formatMoney(job.cost)}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <User className="w-5 h-5 text-orange-600" />
              <div>
                <div className="text-sm text-gray-500">Customer</div>
                <Link to={`/customers/${job.customerId}`}>
                  <div className="font-medium text-blue-600 hover:underline">
                    {job.customerName}
                  </div>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Location */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="w-5 h-5" />
            Location
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-700">{job.address || 'No address on file'}</p>
          {job.address ? (
            <Button asChild variant="outline" className="mt-3 h-11 w-full sm:w-auto">
              <a href={mapsUrl(job.address)} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="w-4 h-4" />
                Open in Maps
              </a>
            </Button>
          ) : (
            <Button variant="outline" className="mt-3 h-11 w-full sm:w-auto" disabled>
              Open in Maps
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Description */}
      <Card>
        <CardHeader>
          <CardTitle>Job Description</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-700 whitespace-pre-line">{job.description || 'No description'}</p>
        </CardContent>
      </Card>

      {/* Notes */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <StickyNote className="w-5 h-5" />
            Notes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-700 whitespace-pre-line">{job.notes || 'No notes yet. Tap Edit to add some.'}</p>
        </CardContent>
      </Card>

      {/* Job Timeline (from the job's own record) */}
      <Card>
        <CardHeader>
          <CardTitle>Job Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <TimelineEntry icon={<FileText className="w-4 h-4 text-gray-400" />} title="Job created">
              {formatDateTime(job.createdAt)}
              {job.estimateId && ' · from an approved estimate'}
            </TimelineEntry>

            {job.scheduledDate && (
              <TimelineEntry icon={<Calendar className="w-4 h-4 text-gray-400" />} title="Scheduled for">
                {formatDateTime(job.scheduledDate)}
              </TimelineEntry>
            )}

            {job.status === 'in-progress' && (
              <TimelineEntry icon={<Clock className="w-4 h-4 text-gray-400" />} title="Work in progress">
                Started; not completed yet
              </TimelineEntry>
            )}

            {job.status === 'cancelled' && (
              <TimelineEntry icon={<FileText className="w-4 h-4 text-gray-400" />} title="Cancelled" />
            )}

            {job.status === 'completed' && (
              <TimelineEntry icon={<CheckCircle2 className="w-4 h-4 text-green-600" />} title="Job completed" done>
                {job.completedDate ? formatDateTime(job.completedDate) : 'Completion time not recorded'}
              </TimelineEntry>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function TimelineEntry({ icon, title, children, done }: { icon: ReactNode; title: string; children?: ReactNode; done?: boolean }) {
  return (
    <div className="flex gap-4">
      <div className={`w-2 rounded-full ${done ? 'bg-green-600' : 'bg-blue-600'}`}></div>
      <div className="flex-1 pb-2">
        <div className="flex items-center gap-2">
          {icon}
          <span className="font-medium text-gray-900">{title}</span>
        </div>
        {children && <p className="text-sm text-gray-500 mt-1">{children}</p>}
      </div>
    </div>
  );
}

function EditJobDialog({ job, onSaved }: { job: Job; onSaved: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="h-11">
          <Pencil className="w-4 h-4" />
          Edit
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit job</DialogTitle>
        </DialogHeader>
        {open && (
          <EditJobForm
            job={job}
            onDone={() => {
              setOpen(false);
              onSaved();
            }}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function EditJobForm({ job, onDone }: { job: Job; onDone: () => void }) {
  const { shop } = useShop();
  const [title, setTitle] = useState(job.title);
  const [priority, setPriority] = useState<JobPriority>(job.priority);
  const [scheduledAt, setScheduledAt] = useState(toDateTimeInputValue(job.scheduledDate));
  const [hours, setHours] = useState(job.estimatedHours === null ? "" : String(job.estimatedHours));
  const [address, setAddress] = useState(job.ownAddress);
  const [description, setDescription] = useState(job.description);
  const [notes, setNotes] = useState(job.notes);
  const [saving, setSaving] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const estimatedHours = parseOptionalNumber(hours);
    if (!title.trim()) return toast.error("Give the job a title");
    if (estimatedHours === "invalid") return toast.error("Hours must be a number, 0 or more");
    setSaving(true);
    try {
      await updateJob(shop.id, job.id, {
        title,
        priority,
        description,
        notes,
        address,
        scheduledAt: fromDateTimeInputValue(scheduledAt),
        estimatedHours,
      });
      toast.success("Job saved");
      onDone();
    } catch (err) {
      toast.error(`Couldn't save the job: ${(err as Error).message}`);
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="edit-title">Title</Label>
        <Input id="edit-title" className="h-11" value={title} onChange={(e) => setTitle(e.target.value)} />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="edit-when">Scheduled for</Label>
          <Input id="edit-when" className="h-11" type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="edit-hours">Est. hours</Label>
            <Input id="edit-hours" className="h-11" type="number" inputMode="decimal" min="0" step="0.25" value={hours} onChange={(e) => setHours(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="edit-priority">Priority</Label>
            <Select value={priority} onValueChange={(v) => setPriority(v as JobPriority)}>
              <SelectTrigger id="edit-priority" className="h-11"><SelectValue /></SelectTrigger>
              <SelectContent>
                {JOB_PRIORITIES.map((p) => <SelectItem key={p} value={p}>{labelFor(p)}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="edit-address">Job address</Label>
        <Input id="edit-address" className="h-11" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Leave blank to use the customer's address" />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="edit-description">Description</Label>
        <Textarea id="edit-description" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="edit-notes">Notes</Label>
        <Textarea id="edit-notes" rows={4} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Gate code, panel location, what you found…" />
      </div>
      <p className="text-xs text-muted-foreground">Changing the time here doesn't notify the customer.</p>
      <Button type="submit" className="w-full h-11" disabled={saving}>
        {saving ? "Saving…" : "Save changes"}
      </Button>
    </form>
  );
}
