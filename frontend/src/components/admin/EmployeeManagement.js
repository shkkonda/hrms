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
import { Plus, Mail } from 'lucide-react';
import { toast } from 'sonner';
import api from '../../lib/api';

export default function EmployeeManagement() {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    department: '',
    joining_date: '',
    reporting_manager_id: '',
  });

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    try {
      const response = await api.get('/employees');
      setEmployees(response.data);
    } catch (error) {
      toast.error('Failed to fetch employees');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        reporting_manager_id: formData.reporting_manager_id || null,
      };
      await api.post('/employees', payload);
      toast.success('Employee added and invitation sent!');
      setFormData({ name: '', email: '', department: '', joining_date: '', reporting_manager_id: '' });
      fetchEmployees();
      setOpen(false);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to add employee');
    }
  };

  if (loading) {
    return <div className="text-zinc-600">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-semibold text-zinc-900">Employees</h2>
          <p className="text-sm text-zinc-600 mt-1">Manage your organization's employees</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="bg-zinc-900 hover:bg-zinc-800" data-testid="add-employee-button">
              <Plus className="h-4 w-4 mr-2" />
              Add Employee
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Add New Employee</DialogTitle>
              <DialogDescription>
                Fill in employee details and send invitation
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  data-testid="employee-name-input"
                  placeholder="John Doe"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  data-testid="employee-email-input"
                  type="email"
                  placeholder="john@company.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="department">Department</Label>
                <Input
                  id="department"
                  data-testid="employee-department-input"
                  placeholder="Engineering"
                  value={formData.department}
                  onChange={(e) =>
                    setFormData({ ...formData, department: e.target.value })
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="joining_date">Joining Date</Label>
                <Input
                  id="joining_date"
                  data-testid="employee-joining-date-input"
                  type="date"
                  value={formData.joining_date}
                  onChange={(e) =>
                    setFormData({ ...formData, joining_date: e.target.value })
                  }
                  required
                />
              </div>
              <Button type="submit" className="w-full bg-zinc-900 hover:bg-zinc-800" data-testid="submit-employee-button">
                Add Employee & Send Invite
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Employees List */}
      <div className="grid gap-4">
        {employees.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-zinc-600">No employees yet. Add your first employee!</p>
            </CardContent>
          </Card>
        ) : (
          employees.map((employee) => (
            <Card key={employee.id} className="border-zinc-200" data-testid="employee-card">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg text-zinc-900">{employee.name}</CardTitle>
                    <CardDescription className="mt-1">
                      {employee.email}
                    </CardDescription>
                  </div>
                  {employee.invited && (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      <Mail className="h-3 w-3 mr-1" />
                      Invited
                    </span>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-zinc-600">Department</p>
                    <p className="font-medium text-zinc-900">{employee.department}</p>
                  </div>
                  <div>
                    <p className="text-zinc-600">Joining Date</p>
                    <p className="font-medium text-zinc-900">{employee.joining_date}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
