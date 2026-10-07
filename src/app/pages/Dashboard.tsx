import { Link } from "react-router";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import {
  DollarSign,
  Users,
  Briefcase,
  AlertCircle,
  CheckCircle2,
  Clock,
  ChevronRight,
} from "lucide-react";
import { listCustomers } from "../data/customers";
import { listJobs } from "../data/jobs";
import { listEstimates } from "../data/estimates";
import { useAsync } from "../data/useAsync";
import { useShop } from "../auth/ShopProvider";
import { QueryState } from "../components/QueryState";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Badge } from "../components/ui/badge";
import { JOB_TYPES, labelFor, type Estimate, type Job } from "../data/types";
import { formatMoney, formatMoneyCompact, isSameMonth } from "../format";

const DAY_MS = 24 * 60 * 60 * 1000;
const STALE_SENT_DAYS = 7;

interface Attention {
  key: string;
  title: string;
  detail: string;
  href: string;
  urgent: boolean;
}

const daysAgo = (iso: string, now: Date) => Math.floor((now.getTime() - new Date(iso).getTime()) / DAY_MS);
const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

/** Things in the shop's own records that need a person to act. */
function needsAttention(jobs: Job[], estimates: Estimate[], now: Date): Attention[] {
  const items: Attention[] = [];
  for (const job of jobs) {
    if (job.status === 'scheduled' && job.scheduledDate && new Date(job.scheduledDate) < now) {
      items.push({
        key: `job-${job.id}`,
        title: `${job.title} (${job.customerName})`,
        detail: `Was scheduled for ${new Date(job.scheduledDate).toLocaleDateString()} but hasn't been started or completed.`,
        href: `/jobs/${job.id}`,
        urgent: true,
      });
    }
  }
  for (const e of estimates) {
    if (e.status === 'approved' && !e.jobId) {
      items.push({
        key: `est-${e.id}`,
        title: `${e.title} (${e.customerName})`,
        detail: `Approved for ${formatMoney(e.total)} but not converted to a job yet.`,
        href: '/estimates',
        urgent: true,
      });
    } else if (e.status === 'sent' && e.sentAt && daysAgo(e.sentAt, now) >= STALE_SENT_DAYS) {
      items.push({
        key: `est-${e.id}`,
        title: `${e.title} (${e.customerName})`,
        detail: `Sent ${plural(daysAgo(e.sentAt, now), 'day')} ago with no answer recorded.`,
        href: '/estimates',
        urgent: false,
      });
    } else if (e.status === 'draft') {
      items.push({
        key: `est-${e.id}`,
        title: `${e.title} (${e.customerName})`,
        detail: `Draft not sent yet (created ${plural(daysAgo(e.createdAt, now), 'day')} ago).`,
        href: '/estimates',
        urgent: false,
      });
    }
  }
  return items;
}

export function Dashboard() {
  const { shop } = useShop();
  const { data, error, reload } = useAsync(
    () => Promise.all([listCustomers(shop.id), listJobs(shop.id), listEstimates(shop.id)]),
    [shop.id],
  );
  if (!data) return <QueryState error={error} onRetry={reload} />;
  const [customers, jobs, estimates] = data;
  const now = new Date();

  // Revenue is the agreed price of completed jobs (no invoices yet).
  const paidJobs = jobs.filter(
    (j): j is Job & { completedDate: string; cost: number } =>
      j.status === 'completed' && !!j.completedDate && j.cost !== null,
  );
  const totalRevenue = paidJobs.reduce((sum, j) => sum + j.cost, 0);
  const revenueBetween = (fromDaysAgo: number, toDaysAgo: number) =>
    paidJobs
      .filter((j) => {
        const age = now.getTime() - new Date(j.completedDate).getTime();
        return age >= toDaysAgo * DAY_MS && age < fromDaysAgo * DAY_MS;
      })
      .reduce((sum, j) => sum + j.cost, 0);
  const last30 = revenueBetween(30, 0);
  const prior30 = revenueBetween(60, 30);
  const revenueChange = prior30 > 0 ? ((last30 - prior30) / prior30) * 100 : null;

  const activeJobs = jobs.filter(j => j.status === 'in-progress' || j.status === 'scheduled');
  const activeHighPriority = activeJobs.filter(j => j.priority === 'urgent' || j.priority === 'high').length;

  const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const completed = jobs.filter((j): j is Job & { completedDate: string } => j.status === 'completed' && !!j.completedDate);
  const completedThisMonth = completed.filter(j => isSameMonth(new Date(j.completedDate), now)).length;
  const completedLastMonth = completed.filter(j => isSameMonth(new Date(j.completedDate), lastMonth)).length;

  // Last 6 calendar months, oldest first.
  const revenueData = Array.from({ length: 6 }, (_, i) => {
    const month = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1);
    return {
      month: month.toLocaleDateString('en-US', { month: 'short' }),
      revenue: paidJobs
        .filter((j) => isSameMonth(new Date(j.completedDate), month))
        .reduce((sum, j) => sum + j.cost, 0),
    };
  });
  const hasRevenueData = revenueData.some((d) => d.revenue > 0);

  const jobTypeData = JOB_TYPES.map((type) => ({
    type: labelFor(type),
    count: jobs.filter((j) => j.type === type && j.status !== 'cancelled').length,
  }));
  const hasJobs = jobTypeData.some((d) => d.count > 0);

  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  // listJobs returns jobs ordered by scheduled time, unscheduled last.
  const upcomingJobs = jobs
    .filter(j => j.status === 'scheduled' && j.scheduledDate && new Date(j.scheduledDate) >= startOfToday)
    .slice(0, 5);

  const attention = needsAttention(jobs, estimates, now);

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 mt-1">Here's what's happening at {shop.name}.</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Revenue (completed jobs)
            </CardTitle>
            <DollarSign className="w-4 h-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{formatMoney(totalRevenue)}</div>
            <p className="text-xs text-gray-500 mt-1">
              {formatMoney(last30)} in the last 30 days
              {revenueChange === null
                ? ' (none in the 30 days before)'
                : ` (${revenueChange >= 0 ? '+' : ''}${revenueChange.toFixed(1)}% vs the 30 days before)`}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Customers
            </CardTitle>
            <Users className="w-4 h-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{customers.length}</div>
            <p className="text-xs text-gray-500 mt-1">
              {customers.filter(c => c.type === 'commercial').length} commercial, {customers.filter(c => c.type === 'residential').length} residential
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Open Jobs
            </CardTitle>
            <Briefcase className="w-4 h-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{activeJobs.length}</div>
            <p className="text-xs text-gray-500 mt-1">{activeHighPriority} high or urgent priority</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Completed This Month
            </CardTitle>
            <CheckCircle2 className="w-4 h-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{completedThisMonth}</div>
            <p className="text-xs text-gray-500 mt-1">{completedLastMonth} completed last month</p>
          </CardContent>
        </Card>
      </div>

      {/* Needs attention: computed from estimates and jobs, not AI */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-orange-500" />
            Needs Attention
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {attention.length === 0 ? (
            <p className="text-sm text-gray-500 py-4 text-center">Nothing waiting on you right now.</p>
          ) : (
            attention.map((item) => (
              <Link
                key={item.key}
                to={item.href}
                className="flex items-center gap-3 p-3 min-h-11 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <AlertCircle className={`w-5 h-5 shrink-0 ${item.urgent ? 'text-orange-500' : 'text-blue-500'}`} />
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-gray-900">{item.title}</h4>
                  <p className="text-sm text-gray-600 mt-0.5">{item.detail}</p>
                </div>
                <ChevronRight className="w-5 h-5 shrink-0 text-gray-400" />
              </Link>
            ))
          )}
        </CardContent>
      </Card>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Revenue by Month</CardTitle>
            <p className="text-sm text-gray-500">Agreed price of jobs completed each month</p>
          </CardHeader>
          <CardContent>
            {hasRevenueData ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={revenueData} margin={{ left: -8, right: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="month" tickLine={false} />
                  <YAxis tickFormatter={formatMoneyCompact} width={56} tickLine={false} axisLine={false} />
                  <Tooltip formatter={(value: number) => [formatMoney(value), 'Revenue']} />
                  <Bar dataKey="revenue" fill="var(--chart-1)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-gray-500 py-16 text-center">No completed, priced jobs in the last 6 months.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Jobs by Type</CardTitle>
            <p className="text-sm text-gray-500">All jobs except cancelled</p>
          </CardHeader>
          <CardContent>
            {hasJobs ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={jobTypeData} layout="vertical" margin={{ left: 8, right: 16 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" allowDecimals={false} tickLine={false} />
                  <YAxis type="category" dataKey="type" width={88} tickLine={false} axisLine={false} />
                  <Tooltip formatter={(value: number) => [value, 'Jobs']} />
                  <Bar dataKey="count" fill="var(--chart-1)" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-gray-500 py-16 text-center">No jobs yet.</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Upcoming Jobs */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Upcoming Jobs
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {upcomingJobs.length === 0 && (
              <p className="text-sm text-gray-500 py-4 text-center">No scheduled jobs coming up.</p>
            )}
            {upcomingJobs.map((job) => (
              <Link
                key={job.id}
                to={`/jobs/${job.id}`}
                className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h4 className="font-medium text-gray-900">{job.title}</h4>
                    <Badge variant={
                      job.priority === 'urgent' ? 'destructive' :
                      job.priority === 'high' ? 'default' :
                      'secondary'
                    }>
                      {labelFor(job.priority)}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">{job.customerName}</p>
                </div>
                <div className="sm:text-right">
                  <div className="text-sm font-medium text-gray-900">
                    {job.scheduledDate && new Date(job.scheduledDate).toLocaleDateString('en-US', {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                      hour: 'numeric',
                      minute: '2-digit'
                    })}
                  </div>
                  <div className="text-xs text-gray-500">
                    {job.estimatedHours === null ? 'No hours estimate' : `${job.estimatedHours}h`} • {job.cost === null ? 'No price' : formatMoney(job.cost)}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
