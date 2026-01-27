import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Check, X, Clock, Calendar as CalendarIcon } from 'lucide-react';
import { toast } from 'sonner';
import api from '../../lib/api';

export default function LeaveSection() {
  const [requests, setRequests] = useState([]);
  const [balances, setBalances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [applyDialog, setApplyDialog] = useState(false);
  const [formData, setFormData] = useState({
    leave_type: '',
    start_date: '',
    end_date: '',
    reason: '',
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [requestsRes, balancesRes] = await Promise.all([
        api.get('/leave-requests'),
        api.get('/leave-requests/balance'),
      ]);
      setRequests(requestsRes.data || []);
      setBalances(balancesRes.data || []);
      
      // Show warning if no leave policy is assigned
      if (!balancesRes.data || balancesRes.data.length === 0) {
        // Only show warning if we have requests (meaning employee profile exists)
        // Otherwise, the employee profile might not exist yet
        if (requestsRes.data && requestsRes.data.length > 0) {
          toast.warning('No leave policy assigned. Please contact your administrator.');
        } else {
          toast.warning('Employee profile not found. Please contact your administrator to set up your profile.');
        }
      } else {
        // Log for debugging
        console.log('Leave balances fetched:', balancesRes.data);
      }
    } catch (error) {
      const errorMessage = error.response?.data?.detail || 'Failed to fetch leave data';
      // Don't show error toast if it's just "Employee profile not found" - we handle it above
      if (!errorMessage.includes('Employee profile not found')) {
        toast.error(errorMessage);
      }
      console.error('Error fetching leave data:', error);
      // Set empty arrays on error to prevent UI issues
      setRequests([]);
      setBalances([]);
    } finally {
      setLoading(false);
    }
  };

  const handleApplyLeave = async (e) => {
    e.preventDefault();
    try {
      await api.post('/leave-requests', formData);
      toast.success('Leave request submitted!');
      setFormData({ leave_type: '', start_date: '', end_date: '', reason: '' });
      fetchData();
      setApplyDialog(false);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to apply for leave');
    }
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

  const getPolicyName = (leaveType) => {
    return leaveType; // Now just return the leave type string
  };

  if (loading) {
    return <div className="text-zinc-600">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-semibold text-zinc-900">Leave Management</h2>
          <p className="text-sm text-zinc-600 mt-1">Apply for leave and track your balance</p>
        </div>
        <Dialog open={applyDialog} onOpenChange={setApplyDialog}>
          <DialogTrigger asChild>
            <Button className="bg-zinc-900 hover:bg-zinc-800" data-testid="apply-leave-button">
              <Plus className="h-4 w-4 mr-2" />
              Apply for Leave
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Apply for Leave</DialogTitle>
              <DialogDescription>
                Submit a new leave request for approval
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleApplyLeave} className="space-y-4">
              <div className="space-y-2">
                <Label>Leave Type</Label>
                <Select
                  value={formData.leave_type}
                  onValueChange={(value) =>
                    setFormData({ ...formData, leave_type: value })
                  }
                  required
                >
                  <SelectTrigger data-testid="leave-type-select">
                    <SelectValue placeholder="Select leave type" />
                  </SelectTrigger>
                  <SelectContent>
                    {balances.length === 0 ? (
                      <SelectItem value="no-policy" disabled className="text-zinc-500">
                        No leave types available. Please contact your administrator.
                      </SelectItem>
                    ) : (
                      balances.map((balance) => (
                        <SelectItem key={balance.leave_type} value={balance.leave_type}>
                          {balance.leave_type} ({balance.remaining_days} days available)
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="start_date">Start Date</Label>
                <Input
                  id="start_date"
                  data-testid="start-date-input"
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="end_date">End Date</Label>
                <Input
                  id="end_date"
                  data-testid="end-date-input"
                  type="date"
                  value={formData.end_date}
                  onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="reason">Reason</Label>
                <Textarea
                  id="reason"
                  data-testid="reason-textarea"
                  placeholder="Please provide a reason for your leave"
                  value={formData.reason}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                  required
                  rows={3}
                />
              </div>
              <Button type="submit" className="w-full bg-zinc-900 hover:bg-zinc-800" data-testid="submit-leave-button">
                Submit Request
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="balance" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="balance">Leave Balance</TabsTrigger>
          <TabsTrigger value="requests">My Requests</TabsTrigger>
        </TabsList>

        {/* Leave Balance Tab */}
        <TabsContent value="balance" className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            {balances.length === 0 ? (
              <Card className="col-span-2">
                <CardContent className="py-12 text-center">
                  <p className="text-zinc-600">No leave policies assigned yet.</p>
                </CardContent>
              </Card>
            ) : (
              balances.map((balance) => (
                <Card key={balance.leave_type} className="border-zinc-200" data-testid="leave-balance-card">
                  <CardHeader>
                    <CardTitle className="text-lg text-zinc-900">
                      {balance.leave_type}
                    </CardTitle>
                    <CardDescription>Annual leave allocation</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-zinc-600">Allocated Days</span>
                        <span className="font-medium text-zinc-900">
                          {balance.allocated_days} days
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-zinc-600">Used Days</span>
                        <span className="font-medium text-red-600">
                          {balance.used_days} days
                        </span>
                      </div>
                      <div className="pt-3 border-t border-zinc-200">
                        <div className="flex justify-between">
                          <span className="font-semibold text-zinc-900">Remaining</span>
                          <span className="font-semibold text-lg text-green-600">
                            {balance.remaining_days} days
                          </span>
                        </div>
                      </div>
                      {/* Progress bar */}
                      <div className="w-full bg-zinc-200 rounded-full h-2 mt-2">
                        <div
                          className="bg-zinc-900 h-2 rounded-full transition-all"
                          style={{
                            width: `${(balance.used_days / balance.allocated_days) * 100}%`,
                          }}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        {/* My Requests Tab */}
        <TabsContent value="requests" className="space-y-4">
          <div className="grid gap-4">
            {requests.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <CalendarIcon className="h-12 w-12 mx-auto text-zinc-400 mb-4" />
                  <p className="text-zinc-600">No leave requests yet.</p>
                </CardContent>
              </Card>
            ) : (
              requests.map((request) => (
                <Card key={request.id} className="border-zinc-200" data-testid="leave-request-card">
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-lg text-zinc-900">
                          {getPolicyName(request.leave_type)}
                        </CardTitle>
                        <CardDescription className="mt-1">
                          {request.start_date} to {request.end_date}
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
                  <CardContent>
                    <div>
                      <p className="text-zinc-600 text-sm">Reason</p>
                      <p className="text-zinc-900 text-sm mt-1">{request.reason}</p>
                    </div>
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
