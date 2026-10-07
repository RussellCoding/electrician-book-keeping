import type { ReactNode } from "react";
import { useParams, Link, useNavigate } from "react-router";
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
  DollarSign,
  Pencil
} from "lucide-react";
import { CreateJobDialog } from "../components/CreateJobDialog";
import { CustomerFormDialog } from "../components/CustomerFormDialog";
import { labelFor } from "../data/types";
import { formatMoney, mapsUrl } from "../format";
import { getCustomer } from "../data/customers";
import { listJobs } from "../data/jobs";
import { useAsync } from "../data/useAsync";
import { useShop } from "../auth/ShopProvider";
import { QueryState } from "../components/QueryState";

export function CustomerDetail() {
  const { id } = useParams();
  const { shop } = useShop();
  const navigate = useNavigate();
  const { data, error, reload } = useAsync(
    () => Promise.all([getCustomer(shop.id, id), listJobs(shop.id, { customerId: id })]),
    [shop.id, id],
  );

  if (!data) return <QueryState error={error} onRetry={reload} />;
  const [customer, customerJobs] = data;

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
    <div className="p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div>
        <Link to="/customers">
          <Button variant="ghost" size="sm" className="mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Customers
          </Button>
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className={`w-16 h-16 shrink-0 rounded-lg flex items-center justify-center ${
              customer.type === 'commercial' ? 'bg-purple-100' : 'bg-blue-100'
            }`}>
              {customer.type === 'commercial' ? (
                <Building2 className="w-8 h-8 text-purple-600" />
              ) : (
                <Home className="w-8 h-8 text-blue-600" />
              )}
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">{customer.name}</h1>
              <div className="flex items-center gap-2 mt-2">
                <Badge variant={customer.status === 'active' ? 'default' : 'secondary'}>
                  {customer.status}
                </Badge>
                <Badge variant="outline">{customer.type}</Badge>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:flex gap-2">
            <CustomerFormDialog
              customer={customer}
              onSaved={reload}
              trigger={
                <Button variant="outline" className="h-11">
                  <Pencil className="w-4 h-4" />
                  Edit
                </Button>
              }
            />
            <CreateJobDialog
              customerId={customer.id}
              onCreated={(jobId) => navigate(`/jobs/${jobId}`)}
              trigger={
                <Button className="h-11">
                  <Plus className="w-4 h-4" />
                  New job
                </Button>
              }
            />
          </div>
        </div>
      </div>

      {/* Contact Info */}
      <Card>
        <CardHeader>
          <CardTitle>Contact Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <ContactRow icon={<Phone className="w-5 h-5 text-gray-400" />} value={customer.phone} href={`tel:${customer.phone}`} empty="No phone on file" />
          <ContactRow icon={<Mail className="w-5 h-5 text-gray-400" />} value={customer.email} href={`mailto:${customer.email}`} empty="No email on file" />
          <ContactRow icon={<MapPin className="w-5 h-5 text-gray-400" />} value={customer.address} href={mapsUrl(customer.address)} external empty="No address on file" />
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
                  {formatMoney(customer.totalRevenue)}
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
                <Link key={job.id} to={`/jobs/${job.id}`} className="block">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 p-4 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer">
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="font-medium text-gray-900">{job.title}</h4>
                        <Badge variant={
                          job.status === 'completed' ? 'default' :
                          job.status === 'in-progress' ? 'secondary' :
                          'outline'
                        }>
                          {labelFor(job.status)}
                        </Badge>
                        <Badge variant="outline">{labelFor(job.type)}</Badge>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">{job.description}</p>
                    </div>
                    <div className="sm:text-right">
                      <div className="font-medium text-gray-900">{job.cost === null ? 'No price' : formatMoney(job.cost)}</div>
                      <div className="text-sm text-gray-500">
                        {job.completedDate ?
                          new Date(job.completedDate).toLocaleDateString() :
                          job.scheduledDate ? new Date(job.scheduledDate).toLocaleDateString() : 'Not scheduled'
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

function ContactRow({ icon, value, href, external, empty }: { icon: ReactNode; value: string; href: string; external?: boolean; empty: string }) {
  if (!value) {
    return (
      <div className="flex items-center gap-3">
        {icon}
        <span className="text-gray-400">{empty}</span>
      </div>
    );
  }
  return (
    <a
      href={href}
      {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
      className="flex items-center gap-3 min-h-11 text-blue-600 hover:underline"
    >
      {icon}
      <span className="break-all">{value}</span>
    </a>
  );
}
