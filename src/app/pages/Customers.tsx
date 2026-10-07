import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Badge } from "../components/ui/badge";
import {
  Search,
  Plus,
  Building2,
  Home,
  Phone,
  Mail,
  MapPin
} from "lucide-react";
import { listCustomers } from "../data/customers";
import { useAsync } from "../data/useAsync";
import { useShop } from "../auth/ShopProvider";
import { QueryState } from "../components/QueryState";
import { CustomerFormDialog } from "../components/CustomerFormDialog";
import { formatMoney } from "../format";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";

export function Customers() {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const { shop } = useShop();
  const navigate = useNavigate();
  const { data: customers, error, reload } = useAsync(() => listCustomers(shop.id), [shop.id]);

  if (!customers) return <QueryState error={error} onRetry={reload} />;

  const filteredCustomers = customers.filter(customer => {
    const matchesSearch = customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         customer.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         customer.phone.includes(searchQuery);
    const matchesType = filterType === "all" || customer.type === filterType;
    return matchesSearch && matchesType;
  });

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Customers</h1>
          <p className="text-gray-500 mt-1">Manage your customer relationships</p>
        </div>
        <CustomerFormDialog
          onSaved={(id) => navigate(`/customers/${id}`)}
          trigger={
            <Button className="h-11">
              <Plus className="w-4 h-4" />
              Add customer
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
                placeholder="Search customers..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-11"
              />
            </div>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-full sm:w-48 h-11">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="residential">Residential</SelectItem>
                <SelectItem value="commercial">Commercial</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Customer List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredCustomers.map((customer) => (
          <Link key={customer.id} to={`/customers/${customer.id}`}>
            <Card className="h-full hover:shadow-lg transition-shadow cursor-pointer">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                      customer.type === 'commercial' ? 'bg-purple-100' : 'bg-blue-100'
                    }`}>
                      {customer.type === 'commercial' ? (
                        <Building2 className={`w-6 h-6 ${
                          customer.type === 'commercial' ? 'text-purple-600' : 'text-blue-600'
                        }`} />
                      ) : (
                        <Home className="w-6 h-6 text-blue-600" />
                      )}
                    </div>
                    <div>
                      <CardTitle className="text-lg">{customer.name}</CardTitle>
                      <Badge variant="secondary" className="mt-1">
                        {customer.type}
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Mail className="w-4 h-4" />
                  {customer.email}
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Phone className="w-4 h-4" />
                  {customer.phone}
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <MapPin className="w-4 h-4" />
                  <span className="line-clamp-1">{customer.address}</span>
                </div>
                <div className="pt-3 border-t border-gray-200 flex justify-between text-sm">
                  <div>
                    <div className="text-gray-500">Total Jobs</div>
                    <div className="font-semibold text-gray-900">{customer.totalJobs}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-gray-500">Revenue</div>
                    <div className="font-semibold text-gray-900">
                      {formatMoney(customer.totalRevenue)}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {filteredCustomers.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-gray-500">{customers.length === 0 ? "No customers yet. Tap Add customer to add one." : "No customers found matching your search."}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
