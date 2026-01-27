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
import { Plus, Building2, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import api from '../../lib/api';

export default function DepartmentManagement() {
  const [departments, setDepartments] = useState([]);
  const [open, setOpen] = useState(false);
  const [editDept, setEditDept] = useState(null);
  const [formData, setFormData] = useState({ name: '', description: '' });

  useEffect(() => {
    fetchDepartments();
  }, []);

  const fetchDepartments = async () => {
    try {
      const res = await api.get('/departments-with-count');
      setDepartments(res.data);
    } catch {
      toast.error('Failed to fetch departments');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editDept) {
        await api.put(`/departments/${editDept.id}`, formData);
        toast.success('Department updated');
      } else {
        await api.post('/departments', formData);
        toast.success('Department created');
      }
      setFormData({ name: '', description: '' });
      setEditDept(null);
      setOpen(false);
      fetchDepartments();
    } catch {
      toast.error('Operation failed');
    }
  };

  const handleDelete = async (dept) => {
    if (dept.employee_count > 0) {
      alert("Cannot delete department with employees");
      return;
    }
    try {
      await api.delete(`/departments/${dept.id}`);
      toast.success("Department deleted");
      fetchDepartments();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Delete failed");
    }
  };

  const openEdit = (dept) => {
    setEditDept(dept);
    setFormData({ name: dept.name, description: dept.description || '' });
    setOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-semibold">Departments</h2>
          <p className="text-sm text-zinc-600">Manage organizational departments</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="bg-zinc-900">
              <Plus className="h-4 w-4 mr-2" /> Create Department
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editDept ? "Edit Department" : "Create Department"}</DialogTitle>
              <DialogDescription>Department details</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label>Name</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label>Description</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>
              <Button type="submit" className="w-full">
                {editDept ? "Update" : "Create"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {departments.map((dept) => (
          <Card key={dept.id}>
            <CardHeader>
              <CardTitle className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  {dept.name}
                </div>
                <div className="flex gap-2">
                  <Button size="icon" variant="outline" onClick={() => openEdit(dept)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="outline"
                    onClick={() => handleDelete(dept)}
  
                  >
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              </CardTitle>
              <CardDescription>{dept.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-zinc-600">
                Employees: <span className="font-semibold">{dept.employee_count}</span>
              </p>
              
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
