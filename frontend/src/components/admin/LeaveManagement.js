import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Check, X, Clock } from 'lucide-react';
import { toast } from 'sonner';
import api from '../../lib/api';

export default function LeaveManagement() {
  const [policies, setPolicies] = useState([]);
  const [requests, setRequests] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [policyDialog, setPolicyDialog] = useState(false);
  const [policyForm, setPolicyForm] = useState({
    name: '',
    days_per_year: '',
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [policiesRes, requestsRes, employeesRes] = await Promise.all([
        api.get('/leave-policies'),
        api.get('/leave-requests'),
        api.get('/employees'),
      ]);
      setPolicies(policiesRes.data);
      setRequests(requestsRes.data);
      setEmployees(employeesRes.data);
    } catch (error) {
      toast.error('Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePolicy = async (e) => {
    e.preventDefault();
    try {
      await api.post('/leave-policies', {
        ...policyForm,
        days_per_year: parseInt(policyForm.days_per_year),
      });
      toast.success('Leave policy created!');
      setPolicyForm({ name: '', days_per_year: '' });
      fetchData();
      setPolicyDialog(false);
    } catch (error) {
      toast.error('Failed to create policy');
    }
  };

  const handleUpdateRequest = async (requestId, status) => {
    try {
      await api.patch(`/leave-requests/${requestId}`, { status });
      toast.success(`Leave request ${status}!`);
      fetchData();
    } catch (error) {
      toast.error('Failed to update request');
    }
  };

  const handleDeletePolicy = async (policyId) => {
    if (!window.confirm('Are you sure you want to delete this policy?')) return;
    try {
      await api.delete(`/leave-policies/${policyId}`);
      toast.success('Policy deleted!');
      fetchData();
    } catch (error) {
      toast.error('Failed to delete policy');
    }
  };

  const getEmployeeName = (employeeId) => {
    const emp = employees.find((e) => e.id === employeeId);
    return emp ? emp.name : 'Unknown';
  };

  const getPolicyName = (policyId) => {
    const policy = policies.find((p) => p.id === policyId);
    return policy ? policy.name : 'Unknown';
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'approved':
        return <Check className="h-4 w-4" />;
      case 'rejected':
        return <X className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-yellow-100 text-yellow-800';
    }
  };

  if (loading) {
    return <div className="text-zinc-600">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-zinc-900">Leave Management</h2>
        <p className="text-sm text-zinc-600 mt-1">
          Manage leave policies and approve requests
        </p>
      </div>

      <Tabs defaultValue="policies" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="policies">Leave Policies</TabsTrigger>
          <TabsTrigger value="requests">Leave Requests</TabsTrigger>
        </TabsList>

        {/* Leave Policies Tab */}
        <TabsContent value="policies" className="space-y-4">
          <div className="flex justify-end">
            <Dialog open={policyDialog} onOpenChange={setPolicyDialog}>
              <DialogTrigger asChild>
                <Button className="bg-zinc-900 hover:bg-zinc-800" data-testid="create-policy-button">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Policy
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create Leave Policy</DialogTitle>
                  <DialogDescription>
                    Define a new leave policy for employees
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleCreatePolicy} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="policy_name">Policy Name</Label>
                    <Input
                      id="policy_name"
                      data-testid="policy-name-input"
                      placeholder="e.g., Casual Leave"
                      value={policyForm.name}
                      onChange={(e) =>
                        setPolicyForm({ ...policyForm, name: e.target.value })
                      }
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="days_per_year">Days Per Year</Label>
                    <Input
                      id="days_per_year"
                      data-testid="days-per-year-input"
                      type="number"
                      placeholder="12"
                      value={policyForm.days_per_year}
                      onChange={(e) =>
                        setPolicyForm({ ...policyForm, days_per_year: e.target.value })
                      }
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full bg-zinc-900 hover:bg-zinc-800" data-testid="submit-policy-button">
                    Create Policy
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid gap-4">
            {policies.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <p className="text-zinc-600">No leave policies yet. Create one!</p>
                </CardContent>
              </Card>
            ) : (
              policies.map((policy) => (
                <Card key={policy.id} className="border-zinc-200" data-testid="policy-card">
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-lg text-zinc-900">
                          {policy.name}
                        </CardTitle>
                        <CardDescription className="mt-1">
                          {policy.days_per_year} days per year
                        </CardDescription>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeletePolicy(policy.id)}
                        className="border-zinc-300 text-red-600 hover:text-red-700"
                        data-testid="delete-policy-button"
                      >
                        Delete
                      </Button>
                    </div>
                  </CardHeader>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        {/* Leave Requests Tab */}
        <TabsContent value="requests" className="space-y-4">
          <div className="grid gap-4">
            {requests.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <p className="text-zinc-600">No leave requests yet.</p>
                </CardContent>
              </Card>
            ) : (
              requests.map((request) => (
                <Card key={request.id} className="border-zinc-200" data-testid="leave-request-card">
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <CardTitle className="text-lg text-zinc-900">
                          {getEmployeeName(request.employee_id)}
                        </CardTitle>
                        <CardDescription className="mt-1">
                          {getPolicyName(request.leave_policy_id)}
                        </CardDescription>
                      </div>
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
                          request.status
                        )}`}
                      >
                        {getStatusIcon(request.status)}
                        <span className="ml-1 capitalize">{request.status}</span>
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-zinc-600">Start Date</p>
                        <p className="font-medium text-zinc-900">{request.start_date}</p>
                      </div>
                      <div>
                        <p className="text-zinc-600">End Date</p>
                        <p className="font-medium text-zinc-900">{request.end_date}</p>
                      </div>
                    </div>
                    <div>
                      <p className="text-zinc-600 text-sm">Reason</p>
                      <p className="text-zinc-900 text-sm mt-1">{request.reason}</p>
                    </div>
                    {request.status === 'pending' && (
                      <div className="flex gap-2">
                        <Button
                          onClick={() => handleUpdateRequest(request.id, 'approved')}
                          className="flex-1 bg-green-600 hover:bg-green-700"
                          data-testid="approve-request-button"
                        >
                          <Check className="h-4 w-4 mr-2" />
                          Approve
                        </Button>
                        <Button
                          onClick={() => handleUpdateRequest(request.id, 'rejected')}
                          variant="outline"
                          className="flex-1 border-red-600 text-red-600 hover:bg-red-50"
                          data-testid="reject-request-button"
                        >
                          <X className="h-4 w-4 mr-2" />
                          Reject
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
