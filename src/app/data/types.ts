// Front-end domain types. The access modules in this folder map database rows
// (see @db-types) into these shapes, so pages never see raw rows.

export type CustomerType = 'residential' | 'commercial';
export type JobType = 'installation' | 'repair' | 'maintenance' | 'inspection' | 'upgrade';
export type JobStatus = 'scheduled' | 'in-progress' | 'completed' | 'cancelled';
export type JobPriority = 'low' | 'medium' | 'high' | 'urgent';
export type EstimateStatus = 'draft' | 'sent' | 'approved' | 'rejected';
export type LineItemKind = 'material' | 'labor' | 'permit' | 'other';

export interface Shop {
  id: string;
  name: string;
  /** Fraction, e.g. 0.08 for 8%. */
  taxRate: number;
  /** Hourly labor rate, or null if the shop hasn't set one. */
  laborRate: number | null;
  timezone: string;
}

export interface ShopMembership {
  shop: Shop;
  role: 'owner' | 'tech';
  displayName: string | null;
}

export interface Customer {
  id: string;
  name: string;
  /** Empty string when not on file. */
  email: string;
  phone: string;
  address: string;
  type: CustomerType;
  status: 'active' | 'inactive';
  /** Non-cancelled jobs (customer_summaries view). */
  totalJobs: number;
  /** Agreed price of completed jobs (customer_summaries view). */
  totalRevenue: number;
  createdAt: string;
}

export interface Job {
  id: string;
  customerId: string;
  customerName: string;
  title: string;
  type: JobType;
  status: JobStatus;
  priority: JobPriority;
  /** ISO timestamp, or null if not scheduled yet. */
  scheduledDate: string | null;
  completedDate?: string;
  estimatedHours: number | null;
  actualHours?: number;
  /** Agreed price, or null if not priced yet. */
  cost: number | null;
  description: string;
  /** Internal notes for the crew (not shown to the customer). */
  notes: string;
  address: string;
  /** The estimate this job was converted from, if any. */
  estimateId: string | null;
  createdAt: string;
}

export interface EstimateItem {
  id: string;
  kind: LineItemKind;
  description: string;
  quantity: number;
  unitPrice: number;
  /** quantity x unitPrice, rounded to cents the same way the totals view does. */
  total: number;
}

export interface Estimate {
  id: string;
  customerId: string;
  customerName: string;
  title: string;
  description: string;
  items: EstimateItem[];
  /** subtotal, tax and total come from the estimate_totals view. */
  subtotal: number;
  tax: number;
  total: number;
  taxRate: number;
  status: EstimateStatus;
  createdAt: string;
  /** YYYY-MM-DD, or null if no expiry. Parse with parseLocalDate. */
  validUntil: string | null;
  /** When the estimate was marked sent, or null. */
  sentAt: string | null;
  /** The job this estimate was converted into, or null. */
  jobId: string | null;
}

/** A line item being edited, before it's saved. */
export interface EstimateItemInput {
  kind: LineItemKind;
  description: string;
  quantity: number;
  unitPrice: number;
}

export interface ScheduleEvent {
  id: string;
  jobId: string;
  title: string;
  start: Date;
  end: Date;
  type: JobType;
  customerName: string;
  address: string;
}

export const JOB_TYPES: JobType[] = ['installation', 'repair', 'maintenance', 'inspection', 'upgrade'];
export const JOB_PRIORITIES: JobPriority[] = ['low', 'medium', 'high', 'urgent'];
export const LINE_ITEM_KINDS: LineItemKind[] = ['material', 'labor', 'permit', 'other'];

/** "in-progress" -> "In progress" */
export function labelFor(value: string): string {
  const text = value.replace(/-/g, ' ');
  return text.charAt(0).toUpperCase() + text.slice(1);
}
