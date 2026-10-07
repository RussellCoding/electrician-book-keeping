import { useParams, Link } from "react-router";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import {
  ArrowLeft,
  Mail,
  Phone,
  MapPin,
  Building2,
  Home,
  Plus,
  Calendar,
  DollarSign
} from "lucide-react";
import { mockCustomers, mockJobs } from "../data/mockData";

export function CustomerDetail() {
  const { id } = useParams();
  const customer = mockCustomers.find(c => c.id === id);
  const customerJobs = mockJobs.filter(j => j.customerId === id);

  if (!customer) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-gray-500">Customer not found</p>
            <Link to="/customers">
              <Button className="mt-4">Back to Customers</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const completedJobs = customerJobs.filter(j => j.status === 'completed');
  const activeJobs = customerJobs.filter(j => j.status !== 'completed' && j.status !== 'cancelled');

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <Link to="/customers">
          <Button variant="ghost" size="sm" className="mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Customers
          </Button>
        </Link>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className={`w-16 h-16 rounded-lg flex items-center justify-center ${
              customer.type === 'commercial' ? 'bg-purple-100' : 'bg-blue-100'
            }`}>
              {customer.type === 'commercial' ? (
                <Building2 className="w-8 h-8 text-purple-600" />
              ) : (
                <Home className="w-8 h-8 text-blue-600" />
              )}
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{customer.name}</h1>
              <div className="flex items-center gap-2 mt-2">
                <Badge variant={customer.status === 'active' ? 'default' : 'secondary'}>
                  {customer.status}
                </Badge>
                <Badge variant="outline">{customer.type}</Badge>
              </div>
            </div>
          </div>
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            New Job
          </Button>
        </div>
      </div>

      {/* Contact Info */}
      <Card>
        <CardHeader>
          <CardTitle>Contact Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-3">
            <Mail className="w-5 h-5 text-gray-400" />
            <span className="text-gray-700">{customer.email}</span>
          </div>
          <div className="flex items-center gap-3">
            <Phone className="w-5 h-5 text-gray-400" />
            <span className="text-gray-700">{customer.phone}</span>
          </div>
          <div className="flex items-center gap-3">
            <MapPin className="w-5 h-5 text-gray-400" />
            <span className="text-gray-700">{customer.address}</span>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Calendar className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">{customer.totalJobs}</div>
                <div className="text-sm text-gray-500">Total Jobs</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">
                  ${customer.totalRevenue.toLocaleString()}
                </div>
                <div className="text-sm text-gray-500">Total Revenue</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <Calendar className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">{activeJobs.length}</div>
                <div className="text-sm text-gray-500">Active Jobs</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Job History */}
      <Card>
        <CardHeader>
          <CardTitle>Job History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {customerJobs.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No jobs yet</p>
            ) : (
              customerJobs.map((job) => (
                <Link key={job.id} to={`/jobs/${job.id}`}>
                  <div className="flex items-center gap-4 p-4 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium text-gray-900">{job.title}</h4>
                        <Badge variant={
                          job.status === 'completed' ? 'default' :
                          job.status === 'in-progress' ? 'secondary' :
                          'outline'
                        }>
                          {job.status}
                        </Badge>
                        <Badge variant="outline">{job.type}</Badge>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">{job.description}</p>
                    </div>
                    <div className="text-right">
                      <div className="font-medium text-gray-900">${job.cost}</div>
                      <div className="text-sm text-gray-500">
                        {job.completedDate ?
                          new Date(job.completedDate).toLocaleDateString() :
                          new Date(job.scheduledDate).toLocaleDateString()
                        }
                      </div>
                    </div>
                  </div>
                </Link>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
