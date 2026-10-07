import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import {
  DollarSign,
  Users,
  Briefcase,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  Clock,
  Sparkles
} from "lucide-react";
import { mockCustomers, mockJobs } from "../data/mockData";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";

export function Dashboard() {
  // Calculate stats
  const totalRevenue = mockCustomers.reduce((sum, c) => sum + c.totalRevenue, 0);
  const totalCustomers = mockCustomers.length;
  const activeJobs = mockJobs.filter(j => j.status === 'in-progress' || j.status === 'scheduled').length;
  const completedThisMonth = mockJobs.filter(j =>
    j.status === 'completed' &&
    j.completedDate &&
    new Date(j.completedDate).getMonth() === new Date().getMonth()
  ).length;

  // Revenue by month (mock data)
  const revenueData = [
    { month: 'Oct', revenue: 18500 },
    { month: 'Nov', revenue: 22000 },
    { month: 'Dec', revenue: 19800 },
    { month: 'Jan', revenue: 25000 },
    { month: 'Feb', revenue: 28500 },
    { month: 'Mar', revenue: 32000 },
  ];

  // Jobs by type
  const jobTypeData = [
    { type: 'Installation', count: 12 },
    { type: 'Repair', count: 18 },
    { type: 'Maintenance', count: 8 },
    { type: 'Inspection', count: 6 },
    { type: 'Upgrade', count: 9 },
  ];

  // Get upcoming jobs
  const upcomingJobs = mockJobs
    .filter(j => j.status === 'scheduled')
    .sort((a, b) => new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime())
    .slice(0, 5);

  // AI Insights
  const aiInsights = [
    {
      title: "Peak Season Ahead",
      description: "Based on historical data, expect 40% increase in residential service calls in the next 4 weeks. Consider hiring temporary help.",
      priority: "high"
    },
    {
      title: "Customer Retention Opportunity",
      description: "Johnson Residence hasn't scheduled maintenance in 8 months. AI suggests sending a follow-up offer.",
      priority: "medium"
    },
    {
      title: "Inventory Alert",
      description: "Circuit breaker stock running low. AI predicts you'll need to reorder within 2 weeks based on current job pipeline.",
      priority: "medium"
    }
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 mt-1">Welcome back! Here's what's happening today.</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Total Revenue
            </CardTitle>
            <DollarSign className="w-4 h-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">
              ${totalRevenue.toLocaleString()}
            </div>
            <p className="text-xs text-green-600 mt-1">
              <TrendingUp className="w-3 h-3 inline mr-1" />
              +12.5% from last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Total Customers
            </CardTitle>
            <Users className="w-4 h-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">
              {totalCustomers}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {mockCustomers.filter(c => c.type === 'commercial').length} commercial, {mockCustomers.filter(c => c.type === 'residential').length} residential
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Active Jobs
            </CardTitle>
            <Briefcase className="w-4 h-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">
              {activeJobs}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {mockJobs.filter(j => j.priority === 'urgent' || j.priority === 'high').length} high priority
            </p>
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
            <div className="text-2xl font-bold text-gray-900">
              {completedThisMonth}
            </div>
            <p className="text-xs text-green-600 mt-1">
              95% customer satisfaction
            </p>
          </CardContent>
        </Card>
      </div>

      {/* AI Insights */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-600" />
            AI Insights & Recommendations
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {aiInsights.map((insight, index) => (
            <div key={index} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
              <AlertCircle className={`w-5 h-5 mt-0.5 ${
                insight.priority === 'high' ? 'text-orange-500' : 'text-blue-500'
              }`} />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h4 className="font-medium text-gray-900">{insight.title}</h4>
                  <Badge variant={insight.priority === 'high' ? 'destructive' : 'secondary'} className="text-xs">
                    {insight.priority}
                  </Badge>
                </div>
                <p className="text-sm text-gray-600 mt-1">{insight.description}</p>
              </div>
              <Button size="sm" variant="outline">Take Action</Button>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Revenue Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={revenueData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="revenue" stroke="#3b82f6" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Jobs by Type Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Jobs by Type</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={jobTypeData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="type" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
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
            {upcomingJobs.map((job) => (
              <div key={job.id} className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium text-gray-900">{job.title}</h4>
                    <Badge variant={
                      job.priority === 'urgent' ? 'destructive' :
                      job.priority === 'high' ? 'default' :
                      'secondary'
                    }>
                      {job.priority}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">{job.customerName}</p>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium text-gray-900">
                    {new Date(job.scheduledDate).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      hour: 'numeric',
                      minute: '2-digit'
                    })}
                  </div>
                  <div className="text-xs text-gray-500">
                    {job.estimatedHours}h • ${job.cost}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
