import { useParams, Link } from "react-router";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import {
  ArrowLeft,
  Calendar,
  Clock,
  DollarSign,
  MapPin,
  User,
  FileText,
  CheckCircle2,
  AlertCircle
} from "lucide-react";
import { mockJobs } from "../data/mockData";

export function JobDetail() {
  const { id } = useParams();
  const job = mockJobs.find(j => j.id === id);

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
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <Link to="/jobs">
          <Button variant="ghost" size="sm" className="mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Jobs
          </Button>
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{job.title}</h1>
            <div className="flex items-center gap-2 mt-3">
              <Badge variant={getStatusColor(job.status)}>{job.status}</Badge>
              <Badge variant={getPriorityColor(job.priority)}>{job.priority}</Badge>
              <Badge variant="outline">{job.type}</Badge>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline">Edit</Button>
            {job.status === 'scheduled' && (
              <Button>Start Job</Button>
            )}
            {job.status === 'in-progress' && (
              <Button>
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Complete Job
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Job Details Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Calendar className="w-5 h-5 text-blue-600" />
              <div>
                <div className="text-sm text-gray-500">Scheduled Date</div>
                <div className="font-medium text-gray-900">
                  {new Date(job.scheduledDate).toLocaleDateString('en-US', {
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit'
                  })}
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
                <div className="text-sm text-gray-500">Estimated Hours</div>
                <div className="font-medium text-gray-900">
                  {job.estimatedHours} hours
                  {job.actualHours && ` (${job.actualHours} actual)`}
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
                <div className="text-sm text-gray-500">Cost</div>
                <div className="font-medium text-gray-900">${job.cost}</div>
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

      {/* Description */}
      <Card>
        <CardHeader>
          <CardTitle>Job Description</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-700">{job.description}</p>
        </CardContent>
      </Card>

      {/* Location */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="w-5 h-5" />
            Location
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-700">{job.address}</p>
          <Button variant="outline" className="mt-3">
            Open in Maps
          </Button>
        </CardContent>
      </Card>

      {/* AI Recommendations */}
      {job.status === 'scheduled' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-purple-600" />
              AI Recommendations
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="p-3 bg-blue-50 rounded-lg">
              <h4 className="font-medium text-blue-900">Materials Needed</h4>
              <p className="text-sm text-blue-700 mt-1">
                Based on similar jobs, you'll likely need: 200A panel, 8x 20A breakers,
                wire connectors, and electrical tape. Estimated material cost: $1,200
              </p>
            </div>
            <div className="p-3 bg-purple-50 rounded-lg">
              <h4 className="font-medium text-purple-900">Weather Advisory</h4>
              <p className="text-sm text-purple-700 mt-1">
                Forecast shows clear weather on scheduled date. Good conditions for outdoor work if needed.
              </p>
            </div>
            <div className="p-3 bg-green-50 rounded-lg">
              <h4 className="font-medium text-green-900">Customer Insight</h4>
              <p className="text-sm text-green-700 mt-1">
                This customer has high satisfaction (5/5 stars) and typically approves additional
                work recommendations. Consider mentioning GFCI outlet upgrades.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Job Timeline */}
      <Card>
        <CardHeader>
          <CardTitle>Job Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex gap-4">
              <div className="w-2 bg-blue-600 rounded-full"></div>
              <div className="flex-1 pb-4">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-gray-400" />
                  <span className="font-medium text-gray-900">Job Created</span>
                </div>
                <p className="text-sm text-gray-500 mt-1">
                  {new Date(job.scheduledDate).toLocaleDateString()} - Initial estimate approved
                </p>
              </div>
            </div>

            {job.status === 'in-progress' && (
              <div className="flex gap-4">
                <div className="w-2 bg-blue-600 rounded-full"></div>
                <div className="flex-1 pb-4">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-gray-400" />
                    <span className="font-medium text-gray-900">Work Started</span>
                  </div>
                  <p className="text-sm text-gray-500 mt-1">
                    Job is currently in progress
                  </p>
                </div>
              </div>
            )}

            {job.status === 'completed' && job.completedDate && (
              <div className="flex gap-4">
                <div className="w-2 bg-green-600 rounded-full"></div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                    <span className="font-medium text-gray-900">Job Completed</span>
                  </div>
                  <p className="text-sm text-gray-500 mt-1">
                    {new Date(job.completedDate).toLocaleDateString()} - Work finished successfully
                  </p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
