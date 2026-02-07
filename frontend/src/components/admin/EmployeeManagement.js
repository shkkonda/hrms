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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Mail, Edit,Trash} from 'lucide-react';
import { toast } from 'sonner';
import api from '../../lib/api';

export default function EmployeeManagement() {
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [policyAssignments, setPolicyAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    department_id: '',
    joining_date: '',
    reporting_manager_id: '',
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [employeesRes, departmentsRes, assignmentsRes] = await Promise.all([
        api.get('/employees'),
        api.get('/departments'),
        api.get('/employee-policy-assignments').catch(() => ({ data: [] })), // Handle error gracefully
      ]);
      setEmployees(employeesRes.data);
      setDepartments(departmentsRes.data);
      setPolicyAssignments(assignmentsRes.data || []);
    } catch (error) {
      toast.error('Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const getEmployeePolicy = (employeeId) => {
    const assignment = policyAssignments.find(a => a.employee_id === employeeId);
    return assignment?.policy?.name || null;
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
      setFormData({ name: '', email: '', department_id: '', joining_date: '', reporting_manager_id: '' });
      fetchData();
      setOpen(false);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to add employee');
    }
  };

  const handleEdit = (employee) => {
    setEditingEmployee(employee);
    setFormData({
      name: employee.name,
      email: employee.email,
      department_id: employee.department_id || '',
      joining_date: employee.joining_date,
      reporting_manager_id: employee.reporting_manager_id || '',
    });
    setEditOpen(true);
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        reporting_manager_id: formData.reporting_manager_id || null,
      };
      await api.put(`/employees/${editingEmployee.id}`, payload);
      toast.success('Employee updated successfully!');
      setFormData({ name: '', email: '', department_id: '', joining_date: '', reporting_manager_id: '' });
      setEditingEmployee(null);
      fetchData();
      setEditOpen(false);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to update employee');
    }
  };

  const handleDelete = async (id) => {
  if (!confirm("Are you sure you want to delete this employee?")) return;

  try {
    await api.delete(`/employees/${id}`);
    toast.success("Employee deleted successfully");
    fetchData(); // refresh list
  } catch (error) {
    toast.error("Failed to delete employee");
  }
};


  const getDepartmentName = (deptId) => {
    const dept = departments.find((d) => d.id === deptId);
    return dept ? dept.name : 'N/A';
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
                <Select
                  value={formData.department_id}
                  onValueChange={(value) =>
                    setFormData({ ...formData, department_id: value })
                  }
                  required
                >
                  <SelectTrigger data-testid="employee-department-select">
                    <SelectValue placeholder="Select department" />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.map((dept) => (
                      <SelectItem key={dept.id} value={dept.id}>
                        {dept.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
              <div className="space-y-2">
                <Label htmlFor="reporting_manager">Reporting Manager (Optional)</Label>
                <Select
                  value={formData.reporting_manager_id}
                  onValueChange={(value) =>
                    setFormData({ ...formData, reporting_manager_id: value==="none"?"":value })
                  }
                >
                  <SelectTrigger data-testid="reporting-manager-select">
                    <SelectValue placeholder="No Reporting Manager" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No Reporting Manager</SelectItem>
                    {employees.map((emp) => (
                      <SelectItem key={emp.id} value={emp.id}>
                        {emp.name} - {emp.employee_id}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" className="w-full bg-zinc-900 hover:bg-zinc-800" data-testid="submit-employee-button">
                Add Employee & Send Invite
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Edit Employee Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Employee</DialogTitle>
            <DialogDescription>
              Update employee information
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdate} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit_name">Full Name</Label>
              <Input
                id="edit_name"
                data-testid="edit-employee-name-input"
                placeholder="John Doe"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit_email">Email</Label>
              <Input
                id="edit_email"
                data-testid="edit-employee-email-input"
                type="email"
                placeholder="john@company.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit_department">Department</Label>
              <Select
                value={formData.department_id}
                onValueChange={(value) =>
                  setFormData({ ...formData, department_id: value })
                }
                required
              >
                <SelectTrigger data-testid="edit-employee-department-select">
                  <SelectValue placeholder="Select department" />
                </SelectTrigger>
                <SelectContent>
                  {departments.map((dept) => (
                    <SelectItem key={dept.id} value={dept.id}>
                      {dept.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit_joining_date">Joining Date</Label>
              <Input
                id="edit_joining_date"
                data-testid="edit-employee-joining-date-input"
                type="date"
                value={formData.joining_date}
                onChange={(e) =>
                  setFormData({ ...formData, joining_date: e.target.value })
                }
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit_reporting_manager">Reporting Manager (Optional)</Label>
              <Select
                value={formData.reporting_manager_id}
                onValueChange={(value) =>
                  setFormData({ ...formData, reporting_manager_id: value==="none"?"":value})
                }
              >
                <SelectTrigger data-testid="edit-reporting-manager-select">
                  <SelectValue placeholder="No Reporting Manager" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Reporting Manager</SelectItem>
                  {employees.filter(emp => emp.id !== editingEmployee?.id).map((emp) => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {emp.name} - {emp.employee_id}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" className="w-full bg-zinc-900 hover:bg-zinc-800" data-testid="update-employee-button">
              Update Employee
            </Button>
          </form>
        </DialogContent>
      </Dialog>

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
                  <div className="flex gap-2">
                    {employee.invited && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        <Mail className="h-3 w-3 mr-1" />
                        Invited
                      </span>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(employee)}
                      className="border-zinc-300"
                      data-testid="edit-employee-button"
                    >
                      <Edit className="h-3 w-3 mr-1" />
                      Edit
                    </Button>
                     <Button
                    variant="destructive"
                    size="sm"
                      onClick={() => handleDelete(employee.id)}
                      >
                       <Trash className="h-3 w-3 mr-1" />
                    Delete
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-zinc-600">Employee ID</p>
                    <p className="font-medium text-zinc-900">{employee.employee_id}</p>
                  </div>
                  <div>
                    <p className="text-zinc-600">Department</p>
                    <p className="font-medium text-zinc-900">
                      {employee.department_id ? getDepartmentName(employee.department_id) : employee.department || 'N/A'}
                    </p>
                  </div>
                  <div>
                    <p className="text-zinc-600">Joining Date</p>
                    <p className="font-medium text-zinc-900">{employee.joining_date}</p>
                  </div>
                  {employee.reporting_manager_id && (
                    <div>
                      <p className="text-zinc-600">Reports To</p>
                      <p className="font-medium text-zinc-900">
                        {employees.find((e) => e.id === employee.reporting_manager_id)?.name || 'N/A'}
                      </p>
                    </div>
                  )}
                  <div>
                    <p className="text-zinc-600">Leave Policy</p>
                    <p className="font-medium text-zinc-900">
                      {getEmployeePolicy(employee.id) || 'Not Assigned'}
                    </p>
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
