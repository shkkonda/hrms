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
  const [holidays, setHolidays] = useState([]);
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
      const [requestsRes, balancesRes, holidaysRes] = await Promise.all([
        api.get('/leave-requests'),
        api.get('/leave-requests/balance'),
        api.get('/holidays'),
      ]);
      setRequests(requestsRes.data || []);
      setBalances(balancesRes.data || []);
      setHolidays(holidaysRes.data || []);
      
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

  // Check if a date string is a holiday or weekend
  const isDateDisabled = (dateString) => {
    if (!dateString) return false;
    const date = new Date(dateString);
    const dayOfWeek = date.getDay();
    
    // Check if it's a weekend (Saturday = 6, Sunday = 0)
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      return true;
    }
    
    // Check if it's a holiday
    return holidays.some(holiday => holiday.date === dateString);
  };

  // Get holiday name for a date string
  const getHolidayName = (dateString) => {
    if (!dateString) return null;
    const holiday = holidays.find(h => h.date === dateString);
    return holiday ? holiday.name : null;
  };

  // Validate date range for holidays and weekends
  const validateDateRange = (startDate, endDate) => {
    if (!startDate || !endDate) return null;
    
    const start = new Date(startDate);
    const end = new Date(endDate);
    const invalidDates = [];
    
    const currentDate = new Date(start);
    while (currentDate <= end) {
      const dateStr = currentDate.toISOString().split('T')[0];
      const dayOfWeek = currentDate.getDay();
      
      if (dayOfWeek === 0 || dayOfWeek === 6) {
        const dayName = dayOfWeek === 0 ? 'Sunday' : 'Saturday';
        invalidDates.push(`${dateStr} (${dayName})`);
      } else {
        const holiday = holidays.find(h => h.date === dateStr);
        if (holiday) {
          invalidDates.push(`${dateStr} (${holiday.name})`);
        }
      }
      
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return invalidDates.length > 0 ? invalidDates : null;
  };

  const handleApplyLeave = async (e) => {
    e.preventDefault();
    
    // Frontend validation for holidays and weekends
    const invalidDates = validateDateRange(formData.start_date, formData.end_date);
    if (invalidDates) {
      toast.error(`Cannot apply for leave on holidays or weekends. Invalid dates: ${invalidDates.join(', ')}`);
      return;
    }
    
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
          <DialogContent className="overflow-visible">
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
                  onChange={(e) => {
                    const dateValue = e.target.value;
                    if (dateValue && isDateDisabled(dateValue)) {
                      const holidayName = getHolidayName(dateValue);
                      const date = new Date(dateValue);
                      const dayName = date.getDay() === 0 ? 'Sunday' : date.getDay() === 6 ? 'Saturday' : null;
                      const reason = holidayName || dayName;
                      toast.warning(`Cannot select ${reason ? reason : 'this date'} for leave application. Please choose a working day.`);
                      setFormData({ ...formData, start_date: '' });
                      return;
                    }
                    setFormData({ ...formData, start_date: dateValue });
                  }}
                  min={new Date().toISOString().split('T')[0]}
                  required
                />
                {formData.start_date && isDateDisabled(formData.start_date) && (
                  <p className="text-xs text-red-600">
                    {getHolidayName(formData.start_date) 
                      ? `This date is a holiday: ${getHolidayName(formData.start_date)}`
                      : 'This date is a weekend. Please select a working day.'}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="end_date">End Date</Label>
                <Input
                  id="end_date"
                  data-testid="end-date-input"
                  type="date"
                  value={formData.end_date}
                  onChange={(e) => {
                    const dateValue = e.target.value;
                    if (dateValue) {
                      if (isDateDisabled(dateValue)) {
                        const holidayName = getHolidayName(dateValue);
                        const date = new Date(dateValue);
                        const dayName = date.getDay() === 0 ? 'Sunday' : date.getDay() === 6 ? 'Saturday' : null;
                        const reason = holidayName || dayName;
                        toast.warning(`Cannot select ${reason ? reason : 'this date'} for leave application. Please choose a working day.`);
                        setFormData({ ...formData, end_date: '' });
                        return;
                      }
                      // Ensure end date is not before start date
                      if (formData.start_date && dateValue < formData.start_date) {
                        toast.warning('End date cannot be before start date');
                        setFormData({ ...formData, end_date: '' });
                        return;
                      }
                    }
                    setFormData({ ...formData, end_date: dateValue });
                  }}
                  min={formData.start_date || new Date().toISOString().split('T')[0]}
                  required
                />
                {formData.end_date && isDateDisabled(formData.end_date) && (
                  <p className="text-xs text-red-600">
                    {getHolidayName(formData.end_date) 
                      ? `This date is a holiday: ${getHolidayName(formData.end_date)}`
                      : 'This date is a weekend. Please select a working day.'}
                  </p>
                )}
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
