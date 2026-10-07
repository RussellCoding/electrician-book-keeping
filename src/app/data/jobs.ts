import { isUuid, supabase, unwrap, type Tables } from './supabase';
import type { Job, JobPriority, JobType, ScheduleEvent } from './types';

const JOB_SELECT = '*, customers(name, address)';

type JobRow = Tables<'jobs'> & { customers: { name: string; address: string | null } | null };

function toJob(row: JobRow): Job {
  return {
    id: row.id,
    customerId: row.customer_id,
    customerName: row.customers?.name ?? '',
    title: row.title,
    type: row.type,
    status: row.status,
    priority: row.priority,
    scheduledDate: row.scheduled_at,
    completedDate: row.completed_at ?? undefined,
    estimatedHours: row.estimated_hours === null ? null : Number(row.estimated_hours),
    actualHours: row.actual_hours === null ? undefined : Number(row.actual_hours),
    cost: row.price === null ? null : Number(row.price),
    description: row.description ?? '',
    notes: row.notes ?? '',
    // The job address defaults to the customer's.
    address: row.address ?? row.customers?.address ?? '',
    ownAddress: row.address ?? '',
    estimateId: row.estimate_id,
    createdAt: row.created_at,
  };
}

/** Jobs in the shop by scheduled time (unscheduled last), optionally for one customer. */
export async function listJobs(shopId: string, filter: { customerId?: string } = {}): Promise<Job[]> {
  let query = supabase.from('jobs').select(JOB_SELECT).eq('shop_id', shopId);
  if (filter.customerId !== undefined) {
    if (!isUuid(filter.customerId)) return [];
    query = query.eq('customer_id', filter.customerId);
  }
  const rows = unwrap(await query.order('scheduled_at', { nullsFirst: false }));
  return rows.map(toJob);
}

/** One job, or null if it doesn't exist in this shop. */
export async function getJob(shopId: string, id: string | undefined): Promise<Job | null> {
  if (!isUuid(id)) return null;
  const { data, error } = await supabase
    .from('jobs')
    .select(JOB_SELECT)
    .eq('shop_id', shopId)
    .eq('id', id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? toJob(data) : null;
}

/** Calendar entries for open jobs that have a scheduled time. */
export async function listScheduleEvents(shopId: string): Promise<ScheduleEvent[]> {
  const jobs = await listJobs(shopId);
  // listJobs is already ordered by scheduled time.
  return jobs
    .filter((job) => job.status !== 'completed' && job.status !== 'cancelled')
    .flatMap((job) => {
      if (!job.scheduledDate) return [];
      const start = new Date(job.scheduledDate);
      // Jobs without an hours estimate show as a 1-hour block.
      const hours = job.estimatedHours ?? 1;
      return [{
        id: job.id,
        jobId: job.id,
        title: job.title,
        start,
        end: new Date(start.getTime() + hours * 60 * 60 * 1000),
        type: job.type,
        customerName: job.customerName,
        address: job.address,
      }];
    });
}

export interface JobInput {
  customerId: string;
  title: string;
  type: JobType;
  priority: JobPriority;
  description: string;
  /** ISO timestamp, or null to leave unscheduled. */
  scheduledAt: string | null;
  estimatedHours: number | null;
  /** Agreed price, or null if not priced yet. */
  price: number | null;
}

/** Creates a scheduled job. Returns its id. */
export async function createJob(shopId: string, input: JobInput): Promise<string> {
  if (!input.title.trim()) throw new Error('Job needs a title');
  const { id } = unwrap<{ id: string }>(
    await supabase
      .from('jobs')
      .insert({
        shop_id: shopId,
        customer_id: input.customerId,
        title: input.title.trim(),
        type: input.type,
        priority: input.priority,
        description: input.description.trim() || null,
        scheduled_at: input.scheduledAt,
        estimated_hours: input.estimatedHours,
        price: input.price,
      })
      .select('id')
      .single(),
  );
  return id;
}

export interface JobEdit {
  title: string;
  priority: JobPriority;
  description: string;
  notes: string;
  /** Empty means "use the customer's address". */
  address: string;
  scheduledAt: string | null;
  estimatedHours: number | null;
}

/** Saves edits to a job's details and schedule. Doesn't change its status. */
export async function updateJob(shopId: string, jobId: string, edit: JobEdit): Promise<void> {
  if (!edit.title.trim()) throw new Error('Job needs a title');
  await updateOne(shopId, jobId, {
    title: edit.title.trim(),
    priority: edit.priority,
    description: edit.description.trim() || null,
    notes: edit.notes.trim() || null,
    address: edit.address.trim() || null,
    scheduled_at: edit.scheduledAt,
    estimated_hours: edit.estimatedHours,
  });
}

/** Marks a scheduled job as in progress. */
export async function startJob(shopId: string, jobId: string): Promise<void> {
  await updateOne(shopId, jobId, { status: 'in-progress' }, ['scheduled']);
}

/** Marks a job completed now, with the hours actually worked if known. */
export async function completeJob(
  shopId: string,
  jobId: string,
  { actualHours }: { actualHours: number | null },
): Promise<void> {
  await updateOne(
    shopId,
    jobId,
    { status: 'completed', completed_at: new Date().toISOString(), actual_hours: actualHours },
    ['scheduled', 'in-progress'],
  );
}

/**
 * Updates one job and checks that it changed. RLS hides other shops' rows, so
 * a missing row or a status that moved on shows up as zero rows updated.
 */
async function updateOne(
  shopId: string,
  jobId: string,
  patch: Partial<Tables<'jobs'>>,
  fromStatuses?: Tables<'jobs'>['status'][],
): Promise<void> {
  if (!isUuid(jobId)) throw new Error('Job not found');
  let query = supabase.from('jobs').update(patch).eq('shop_id', shopId).eq('id', jobId);
  if (fromStatuses) query = query.in('status', fromStatuses);
  const rows = unwrap(await query.select('id'));
  if (rows.length === 0) throw new Error('This job changed or no longer exists. Reload and try again.');
}
