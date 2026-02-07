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
import { Plus, Check, X, Clock, Trash2, Edit } from 'lucide-react';
import { toast } from 'sonner';
import api from '../../lib/api';

export default function LeaveManagement() {
  const [policies, setPolicies] = useState([]);
  const [requests, setRequests] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [policyDialog, setPolicyDialog] = useState(false);
  const [editDialog, setEditDialog] = useState(false);
  const [assignDialog, setAssignDialog] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  
  const [policyForm, setPolicyForm] = useState({
    name: '',
    description: '',
    leave_types: [{ type: '', days: '' }],
  });
  
  const [assignForm, setAssignForm] = useState({
    employee_id: '',
    leave_policy_id: '',
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
      // Sort requests: pending first, then by date
      const sortedRequests = requestsRes.data.sort((a, b) => {
        if (a.status === 'pending' && b.status !== 'pending') return -1;
        if (a.status !== 'pending' && b.status === 'pending') return 1;
        return new Date(b.created_at) - new Date(a.created_at);
      });
      setRequests(sortedRequests);
      setEmployees(employeesRes.data);
    } catch (error) {
      const errorMessage = error.response?.data?.detail || 'Failed to fetch data';
      toast.error(errorMessage);
      // Set empty arrays on error to prevent UI issues
      setPolicies([]);
      setRequests([]);
      setEmployees([]);
    } finally {
      setLoading(false);
    }
  };

  const addLeaveType = () => {
    setPolicyForm({
      ...policyForm,
      leave_types: [...policyForm.leave_types, { type: '', days: '' }],
    });
  };

  const removeLeaveType = (index) => {
    const newLeaveTypes = policyForm.leave_types.filter((_, i) => i !== index);
    setPolicyForm({ ...policyForm, leave_types: newLeaveTypes });
  };

  const updateLeaveType = (index, field, value) => {
    const newLeaveTypes = [...policyForm.leave_types];
    newLeaveTypes[index][field] = value;
    setPolicyForm({ ...policyForm, leave_types: newLeaveTypes });
  };

  const handleCreatePolicy = async (e) => {
    e.preventDefault();
    if (submitting) return; // Prevent multiple submissions
    
    // Check for duplicate name (case-insensitive)
    const trimmedName = policyForm.name.trim();
    const duplicateExists = policies.some(
      policy => policy.name.toLowerCase().trim() === trimmedName.toLowerCase()
    );
    
    if (duplicateExists) {
      toast.error('A leave policy with this name already exists. Please use a different name.');
      return;
    }
    
    setSubmitting(true);
    try {
      const payload = {
        name: trimmedName,
        description: policyForm.description,
        leave_types: policyForm.leave_types.map(lt => ({
          type: lt.type,
          days: parseInt(lt.days)
        }))
      };
      await api.post('/leave-policies', payload);
      toast.success('Leave policy created!');
      setPolicyForm({ name: '', description: '', leave_types: [{ type: '', days: '' }] });
      fetchData();
      setPolicyDialog(false);
    } catch (error) {
      const errorMessage = error.response?.data?.detail || 'Failed to create policy';
      toast.error(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditPolicy = (policy) => {
    setEditingPolicy(policy);
    setPolicyForm({
      name: policy.name,
      description: policy.description || '',
      leave_types: policy.leave_types.map(lt => ({
        type: lt.type,
        days: lt.days.toString()
      }))
    });
    setEditDialog(true);
  };

  const handleUpdatePolicy = async (e) => {
    e.preventDefault();
    if (submitting) return; // Prevent multiple submissions
    
    // Check for duplicate name (case-insensitive), excluding current policy
    const trimmedName = policyForm.name.trim();
    const duplicateExists = policies.some(
      policy => policy.id !== editingPolicy.id && 
                policy.name.toLowerCase().trim() === trimmedName.toLowerCase()
    );
    
    if (duplicateExists) {
      toast.error('A leave policy with this name already exists. Please use a different name.');
      return;
    }
    
    setSubmitting(true);
    try {
      const payload = {
        name: trimmedName,
        description: policyForm.description,
        leave_types: policyForm.leave_types.map(lt => ({
          type: lt.type,
          days: parseInt(lt.days)
        }))
      };
      await api.put(`/leave-policies/${editingPolicy.id}`, payload);
      toast.success('Leave policy updated!');
      setPolicyForm({ name: '', description: '', leave_types: [{ type: '', days: '' }] });
      setEditingPolicy(null);
      fetchData();
      setEditDialog(false);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to update policy');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAssignPolicy = async (e) => {
    e.preventDefault();
    if (submitting) return; // Prevent multiple submissions
    setSubmitting(true);
    try {
      await api.post('/employee-policy-assignments', assignForm);
      toast.success('Policy assigned successfully!');
      setAssignForm({ employee_id: '', leave_policy_id: '' });
      setAssignDialog(false);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to assign policy');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateRequest = async (requestId, status) => {
    try {
      await api.patch(`/leave-requests/${requestId}`, { status });
      toast.success(`Leave request ${status}!`);
      fetchData(); // Refresh data to show updated status
    } catch (error) {
      const errorMessage = error.response?.data?.detail || 'Failed to update request';
      toast.error(errorMessage);
    }
  };

  const handleDeletePolicy = async (policyId) => {
    if (!window.confirm('Are you sure you want to delete this policy?')) return;
    try {
      await api.delete(`/leave-policies/${policyId}`);
      toast.success('Policy deleted!');
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to delete policy');
    }
  };

  const getEmployeeName = (employeeId) => {
    const emp = employees.find((e) => e.id === employeeId);
    return emp ? emp.name : 'Unknown';
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
          Create leave policies and assign to employees
        </p>
      </div>

      <Tabs defaultValue="policies" className="w-full">
        <TabsList className="grid w-full max-w-2xl grid-cols-3">
          <TabsTrigger value="policies">Leave Policies</TabsTrigger>
          <TabsTrigger value="assign">Assign Policy</TabsTrigger>
          <TabsTrigger value="requests">
            Leave Requests
            {requests.filter(r => r.status === 'pending').length > 0 && (
              <span className="ml-2 px-2 py-0.5 text-xs font-semibold bg-yellow-100 text-yellow-800 rounded-full">
                {requests.filter(r => r.status === 'pending').length}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Leave Policies Tab */}
        <TabsContent value="policies" className="space-y-4">
          <div className="flex justify-end">
            <Dialog open={policyDialog} onOpenChange={setPolicyDialog}>
              <DialogTrigger asChild>
                <Button className="bg-zinc-900 hover:bg-zinc-800" data-testid="create-policy-button">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Leave Policy
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Create Leave Policy</DialogTitle>
                  <DialogDescription>
                    Define a policy with multiple leave types
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleCreatePolicy} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="policy_name">Policy Name</Label>
                    <Input
                      id="policy_name"
                      data-testid="policy-name-input"
                      placeholder="e.g., Standard Employee Policy"
                      value={policyForm.name}
                      onChange={(e) =>
                        setPolicyForm({ ...policyForm, name: e.target.value })
                      }
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">Description (Optional)</Label>
                    <Textarea
                      id="description"
                      data-testid="policy-description-input"
                      placeholder="Brief description"
                      value={policyForm.description}
                      onChange={(e) =>
                        setPolicyForm({ ...policyForm, description: e.target.value })
                      }
                      rows={2}
                    />
                  </div>

                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <Label>Leave Types</Label>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={addLeaveType}
                        data-testid="add-leave-type-button"
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        Add Leave Type
                      </Button>
                    </div>

                    {policyForm.leave_types.map((leaveType, index) => (
                      <div key={index} className="flex gap-2 items-start p-3 border border-zinc-200 rounded-md">
                        <div className="flex-1 space-y-2">
                          <Input
                            placeholder="Leave Type (e.g., Casual Leave)"
                            value={leaveType.type}
                            onChange={(e) => updateLeaveType(index, 'type', e.target.value)}
                            required
                            data-testid={`leave-type-${index}`}
                          />
                        </div>
                        <div className="w-24 space-y-2">
                          <Input
                            type="number"
                            placeholder="Days"
                            value={leaveType.days}
                            onChange={(e) => updateLeaveType(index, 'days', e.target.value)}
                            required
                            data-testid={`leave-days-${index}`}
                          />
                        </div>
                        {policyForm.leave_types.length > 1 && (
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => removeLeaveType(index)}
                            data-testid={`remove-leave-type-${index}`}
                          >
                            <Trash2 className="h-4 w-4 text-red-600" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full bg-zinc-900 hover:bg-zinc-800" 
                    data-testid="submit-policy-button"
                    disabled={submitting}
                  >
                    {submitting ? 'Creating...' : 'Create Policy'}
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
                      <div className="flex-1">
                        <CardTitle className="text-lg text-zinc-900">
                          {policy.name}
                        </CardTitle>
                        {policy.description && (
                          <CardDescription className="mt-1">{policy.description}</CardDescription>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditPolicy(policy)}
                          className="border-zinc-300"
                          data-testid="edit-policy-button"
                        >
                          <Edit className="h-3 w-3 mr-1" />
                          Edit
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeletePolicy(policy.id)}
                          className="border-zinc-300 text-red-600 hover:text-red-700"
                          data-testid="delete-policy-button"
                        >
                          <Trash2 className="h-3 w-3 mr-1" />
                          Delete
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-zinc-700">Leave Types:</p>
                      <div className="grid grid-cols-2 gap-2">
                        {policy.leave_types?.map((lt, idx) => (
                          <div key={idx} className="flex justify-between text-sm p-2 bg-zinc-50 rounded">
                            <span className="text-zinc-700">{lt.type}</span>
                            <span className="font-medium text-zinc-900">{lt.days} days</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        {/* Edit Policy Dialog */}
        <Dialog open={editDialog} onOpenChange={setEditDialog}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Leave Policy</DialogTitle>
              <DialogDescription>
                Update the leave policy details
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleUpdatePolicy} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edit_policy_name">Policy Name</Label>
                <Input
                  id="edit_policy_name"
                  data-testid="edit-policy-name-input"
                  placeholder="e.g., Standard Employee Policy"
                  value={policyForm.name}
                  onChange={(e) =>
                    setPolicyForm({ ...policyForm, name: e.target.value })
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit_description">Description (Optional)</Label>
                <Textarea
                  id="edit_description"
                  data-testid="edit-policy-description-input"
                  placeholder="Brief description"
                  value={policyForm.description}
                  onChange={(e) =>
                    setPolicyForm({ ...policyForm, description: e.target.value })
                  }
                  rows={2}
                />
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <Label>Leave Types</Label>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={addLeaveType}
                    data-testid="edit-add-leave-type-button"
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Add Leave Type
                  </Button>
                </div>

                {policyForm.leave_types.map((leaveType, index) => (
                  <div key={index} className="flex gap-2 items-start p-3 border border-zinc-200 rounded-md">
                    <div className="flex-1 space-y-2">
                      <Input
                        placeholder="Leave Type (e.g., Casual Leave)"
                        value={leaveType.type}
                        onChange={(e) => updateLeaveType(index, 'type', e.target.value)}
                        required
                        data-testid={`edit-leave-type-${index}`}
                      />
                    </div>
                    <div className="w-24 space-y-2">
                      <Input
                        type="number"
                        placeholder="Days"
                        value={leaveType.days}
                        onChange={(e) => updateLeaveType(index, 'days', e.target.value)}
                        required
                        data-testid={`edit-leave-days-${index}`}
                      />
                    </div>
                    {policyForm.leave_types.length > 1 && (
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => removeLeaveType(index)}
                        data-testid={`edit-remove-leave-type-${index}`}
                      >
                        <Trash2 className="h-4 w-4 text-red-600" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>

              <Button 
                type="submit" 
                className="w-full bg-zinc-900 hover:bg-zinc-800" 
                data-testid="update-policy-button"
                disabled={submitting}
              >
                {submitting ? 'Updating...' : 'Update Policy'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>

        {/* Assign Policy Tab */}
        <TabsContent value="assign" className="space-y-4">
          <Card className="border-zinc-200">
            <CardHeader>
              <CardTitle className="text-zinc-900">Assign Policy to Employee</CardTitle>
              <CardDescription>Select an employee and assign a leave policy</CardDescription>
            </CardHeader>
            <CardContent>
              <Dialog open={assignDialog} onOpenChange={setAssignDialog}>
                <DialogTrigger asChild>
                  <Button className="w-full bg-zinc-900 hover:bg-zinc-800" data-testid="assign-policy-button">
                    Assign Policy
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Assign Leave Policy</DialogTitle>
                    <DialogDescription>
                      Employee will get all leave types from the selected policy
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleAssignPolicy} className="space-y-4">
                    <div className="space-y-2">
                      <Label>Employee</Label>
                      <Select
                        value={assignForm.employee_id}
                        onValueChange={(value) =>
                          setAssignForm({ ...assignForm, employee_id: value })
                        }
                        required
                      >
                        <SelectTrigger data-testid="assign-employee-select">
                          <SelectValue placeholder="Select employee" />
                        </SelectTrigger>
                        <SelectContent>
                          {employees.map((emp) => (
                            <SelectItem key={emp.id} value={emp.id}>
                              {emp.name} ({emp.employee_id})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Leave Policy</Label>
                      <Select
                        value={assignForm.leave_policy_id}
                        onValueChange={(value) =>
                          setAssignForm({ ...assignForm, leave_policy_id: value })
                        }
                        required
                      >
                        <SelectTrigger data-testid="assign-policy-select">
                          <SelectValue placeholder="Select policy" />
                        </SelectTrigger>
                        <SelectContent>
                          {policies.map((policy) => (
                            <SelectItem key={policy.id} value={policy.id}>
                              {policy.name} ({policy.leave_types?.length || 0} types)
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <Button 
                      type="submit" 
                      className="w-full bg-zinc-900 hover:bg-zinc-800" 
                      data-testid="submit-assign-button"
                      disabled={submitting}
                    >
                      {submitting ? 'Assigning...' : 'Assign Policy'}
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Leave Requests Tab */}
        <TabsContent value="requests" className="space-y-4">
          {requests.length > 0 && (
            <div className="grid grid-cols-3 gap-4 mb-4">
              <Card className="border-zinc-200">
                <CardContent className="pt-6">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-yellow-600">
                      {requests.filter(r => r.status === 'pending').length}
                    </p>
                    <p className="text-sm text-zinc-600 mt-1">Pending</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="border-zinc-200">
                <CardContent className="pt-6">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-green-600">
                      {requests.filter(r => r.status === 'approved').length}
                    </p>
                    <p className="text-sm text-zinc-600 mt-1">Approved</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="border-zinc-200">
                <CardContent className="pt-6">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-red-600">
                      {requests.filter(r => r.status === 'rejected').length}
                    </p>
                    <p className="text-sm text-zinc-600 mt-1">Rejected</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
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
                          {request.leave_type}
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
