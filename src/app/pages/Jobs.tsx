import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Badge } from "../components/ui/badge";
import {
  Search,
  Plus,
  Calendar,
  MapPin,
  Clock
} from "lucide-react";
import { listJobs } from "../data/jobs";
import { useAsync } from "../data/useAsync";
import { useShop } from "../auth/ShopProvider";
import { QueryState } from "../components/QueryState";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { CreateJobDialog } from "../components/CreateJobDialog";
import { labelFor } from "../data/types";
import { formatMoney } from "../format";

export function Jobs() {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterType, setFilterType] = useState<string>("all");
  const { shop } = useShop();
  const navigate = useNavigate();
  const { data: jobs, error, reload } = useAsync(() => listJobs(shop.id), [shop.id]);

  if (!jobs) return <QueryState error={error} onRetry={reload} />;

  const filteredJobs = jobs.filter(job => {
    const matchesSearch = job.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         job.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         job.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = filterStatus === "all" || job.status === filterStatus;
    const matchesType = filterType === "all" || job.type === filterType;
    return matchesSearch && matchesStatus && matchesType;
  });

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

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Jobs</h1>
          <p className="text-gray-500 mt-1">Track and manage all your electrical jobs</p>
        </div>
        <CreateJobDialog
          onCreated={(id) => navigate(`/jobs/${id}`)}
          trigger={
            <Button className="h-11">
              <Plus className="w-4 h-4" />
              Create job
            </Button>
          }
        />
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search jobs..."
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
                <SelectItem value="scheduled">Scheduled</SelectItem>
                <SelectItem value="in-progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-full sm:w-48 h-11">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="installation">Installation</SelectItem>
                <SelectItem value="repair">Repair</SelectItem>
                <SelectItem value="maintenance">Maintenance</SelectItem>
                <SelectItem value="inspection">Inspection</SelectItem>
                <SelectItem value="upgrade">Upgrade</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Job List */}
      <div className="space-y-4">
        {filteredJobs.map((job) => (
          <Link key={job.id} to={`/jobs/${job.id}`} className="block">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardContent className="p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-lg font-semibold text-gray-900">{job.title}</h3>
                      <Badge variant={getStatusColor(job.status)}>{labelFor(job.status)}</Badge>
                      <Badge variant={getPriorityColor(job.priority)}>{labelFor(job.priority)}</Badge>
                      <Badge variant="outline">{labelFor(job.type)}</Badge>
                    </div>
                    <p className="text-gray-600 mt-2">{job.description}</p>
                    <div className="flex flex-wrap items-center gap-x-6 gap-y-2 mt-3 text-sm text-gray-500">
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4" />
                        {job.customerName}
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        {job.scheduledDate ? new Date(job.scheduledDate).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric'
                        }) : 'Not scheduled'}
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        {job.estimatedHours === null ? 'No estimate' : `${job.estimatedHours}h`}
                      </div>
                    </div>
                  </div>
                  <div className="sm:text-right">
                    <div className="text-xl sm:text-2xl font-bold text-gray-900">{job.cost === null ? 'No price' : formatMoney(job.cost)}</div>
                    <div className="text-sm text-gray-500 sm:mt-1">Price</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {filteredJobs.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-gray-500">{jobs.length === 0 ? "No jobs yet. Tap Create job to add one." : "No jobs found matching your filters."}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
