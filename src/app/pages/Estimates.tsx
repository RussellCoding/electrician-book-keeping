import { useState } from "react";
import { Link } from "react-router";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Input } from "../components/ui/input";
import {
  Plus,
  FileText,
  Calendar,
  DollarSign,
  Send,
  CheckCircle2,
  XCircle,
  Search
} from "lucide-react";
import { mockEstimates } from "../data/mockData";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "../components/ui/dialog";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";

export function Estimates() {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  const filteredEstimates = mockEstimates.filter(estimate => {
    const matchesSearch = estimate.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         estimate.customerName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = filterStatus === "all" || estimate.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved': return <CheckCircle2 className="w-4 h-4" />;
      case 'rejected': return <XCircle className="w-4 h-4" />;
      case 'sent': return <Send className="w-4 h-4" />;
      default: return <FileText className="w-4 h-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'default';
      case 'sent': return 'secondary';
      case 'rejected': return 'destructive';
      default: return 'outline';
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Estimates</h1>
          <p className="text-gray-500 mt-1">Create and manage job estimates</p>
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Create Estimate
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Estimate</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="customer">Customer</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select customer" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Johnson Residence</SelectItem>
                    <SelectItem value="2">Springfield Mall</SelectItem>
                    <SelectItem value="3">Sarah Williams</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="title">Estimate Title</Label>
                <Input id="title" placeholder="e.g., Electrical Panel Upgrade" />
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea id="description" placeholder="Describe the work to be done..." rows={3} />
              </div>

              <div className="border-t pt-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-medium text-gray-900">Line Items</h3>
                  <Button size="sm" variant="outline">
                    <Plus className="w-3 h-3 mr-1" />
                    Add Item
                  </Button>
                </div>

                <div className="space-y-3">
                  <div className="grid grid-cols-12 gap-2 p-3 bg-gray-50 rounded-lg">
                    <div className="col-span-5">
                      <Label htmlFor="item1">Description</Label>
                      <Input id="item1" placeholder="Item description" />
                    </div>
                    <div className="col-span-2">
                      <Label htmlFor="qty1">Quantity</Label>
                      <Input id="qty1" type="number" placeholder="1" />
                    </div>
                    <div className="col-span-2">
                      <Label htmlFor="price1">Unit Price</Label>
                      <Input id="price1" type="number" placeholder="0.00" />
                    </div>
                    <div className="col-span-2">
                      <Label>Total</Label>
                      <div className="h-10 flex items-center font-medium">$0.00</div>
                    </div>
                    <div className="col-span-1 flex items-end">
                      <Button variant="ghost" size="sm">
                        <XCircle className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="border-t pt-4 space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Subtotal:</span>
                  <span className="font-medium">$0.00</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Tax (8%):</span>
                  <span className="font-medium">$0.00</span>
                </div>
                <div className="flex justify-between text-lg">
                  <span className="font-semibold text-gray-900">Total:</span>
                  <span className="font-bold text-gray-900">$0.00</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="validUntil">Valid Until</Label>
                  <Input id="validUntil" type="date" />
                </div>
              </div>

              <div className="flex gap-2">
                <Button className="flex-1">Save as Draft</Button>
                <Button className="flex-1" variant="default">
                  <Send className="w-4 h-4 mr-2" />
                  Send to Customer
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* AI Estimate Generator */}
      <Card className="bg-gradient-to-r from-purple-50 to-blue-50 border-purple-200">
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-purple-600 rounded-lg flex items-center justify-center flex-shrink-0">
              <FileText className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900">AI Estimate Generator</h3>
              <p className="text-sm text-gray-600 mt-1">
                Describe the job in natural language and let AI generate a detailed estimate with materials,
                labor, and pricing based on your historical data and market rates.
              </p>
              <Button className="mt-3" variant="default">
                Try AI Generator
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search estimates..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="sent">Sent</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Estimates List */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {filteredEstimates.map((estimate) => (
          <Card key={estimate.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-lg">{estimate.title}</CardTitle>
                  <Link to={`/customers/${estimate.customerId}`}>
                    <p className="text-sm text-blue-600 hover:underline mt-1">
                      {estimate.customerName}
                    </p>
                  </Link>
                </div>
                <Badge variant={getStatusColor(estimate.status)} className="flex items-center gap-1">
                  {getStatusIcon(estimate.status)}
                  {estimate.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-gray-600">{estimate.description}</p>

              <div className="border-t pt-4">
                <div className="space-y-2">
                  {estimate.items.slice(0, 3).map((item) => (
                    <div key={item.id} className="flex justify-between text-sm">
                      <span className="text-gray-600">
                        {item.description} x{item.quantity}
                      </span>
                      <span className="font-medium text-gray-900">
                        ${item.total.toLocaleString()}
                      </span>
                    </div>
                  ))}
                  {estimate.items.length > 3 && (
                    <p className="text-sm text-gray-500">
                      +{estimate.items.length - 3} more items
                    </p>
                  )}
                </div>
              </div>

              <div className="border-t pt-4">
                <div className="flex justify-between items-center">
                  <div>
                    <div className="text-sm text-gray-500">Total Amount</div>
                    <div className="text-2xl font-bold text-gray-900">
                      ${estimate.total.toLocaleString()}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-gray-500">Valid Until</div>
                    <div className="font-medium text-gray-900">
                      {new Date(estimate.validUntil).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Calendar className="w-4 h-4" />
                Created {new Date(estimate.createdAt).toLocaleDateString()}
              </div>

              <div className="flex gap-2 pt-2">
                <Button variant="outline" className="flex-1" size="sm">
                  View Details
                </Button>
                {estimate.status === 'draft' && (
                  <Button className="flex-1" size="sm">
                    <Send className="w-3 h-3 mr-1" />
                    Send
                  </Button>
                )}
                {estimate.status === 'approved' && (
                  <Button className="flex-1" size="sm">
                    Convert to Job
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredEstimates.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-gray-500">No estimates found matching your filters.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
