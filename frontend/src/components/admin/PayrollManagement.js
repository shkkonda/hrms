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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DollarSign, FileText, Plus, Download, Trash2, TrendingUp, TrendingDown } from 'lucide-react';
import { toast } from 'sonner';
import api from '../../lib/api';

export default function PayrollManagement() {
  const [employees, setEmployees] = useState([]);
  const [structures, setStructures] = useState([]);
  const [payslips, setPayslips] = useState([]);
  const [printFormats, setPrintFormats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [structureDialog, setStructureDialog] = useState(false);
  const [assignDialog, setAssignDialog] = useState(false);
  const [payslipDialog, setPayslipDialog] = useState(false);
  const [editDialog, setEditDialog] = useState(false);
  const [editStructure, setEditStructure] = useState(null);
  const [submitting, setSubmitting] = useState(false);
 

  const openEditDialog = (structure) => {
  setEditStructure(structure);
  // Separate earnings and deductions from salary_types
  const earnings = (structure.salary_types || []).filter(
    item => (item.category || 'earnings') === 'earnings'
  ).map(item => ({ type: item.type, amount: item.amount.toString() }));
  const deductions = (structure.salary_types || []).filter(
    item => (item.category || 'earnings') === 'deductions'
  ).map(item => ({ type: item.type, amount: item.amount.toString() }));
  
  setStructureForm({
    name: structure.name,
    earnings: earnings.length > 0 ? earnings : [{ type: '', amount: '' }],
    deductions: deductions.length > 0 ? deductions : [{ type: '', amount: '' }],
    print_format_id: structure.print_format_id || 'none'
  });
  setEditDialog(true);
};

 const [structureForm, setStructureForm] = useState({
  name: '',
  earnings: [{ type: '', amount: '' }],
  deductions: [{ type: '', amount: '' }],
  print_format_id: ''
});

// Calculate net salary: earnings - deductions
const calculateNetSalary = () => {
  const totalEarnings = structureForm.earnings.reduce((sum, item) => {
    return sum + (parseFloat(item.amount) || 0);
  }, 0);
  const totalDeductions = structureForm.deductions.reduce((sum, item) => {
    return sum + (parseFloat(item.amount) || 0);
  }, 0);
  return totalEarnings - totalDeductions;
};

const addEarning = () => {
  setStructureForm(prev => ({
    ...prev,
    earnings: [...(prev.earnings || []), { type: '', amount: '' }]
  }));
};

const addDeduction = () => {
  setStructureForm(prev => ({
    ...prev,
    deductions: [...(prev.deductions || []), { type: '', amount: '' }]
  }));
};

const removeEarning = (index) => {
  const newEarnings = structureForm.earnings.filter((_, i) => i !== index);
  setStructureForm({ ...structureForm, earnings: newEarnings });
};

const removeDeduction = (index) => {
  const newDeductions = structureForm.deductions.filter((_, i) => i !== index);
  setStructureForm({ ...structureForm, deductions: newDeductions });
};

const updateEarning = (index, field, value) => {
  const updated = [...structureForm.earnings];
  updated[index][field] = value;
  setStructureForm({ ...structureForm, earnings: updated });
};

const updateDeduction = (index, field, value) => {
  const updated = [...structureForm.deductions];
  updated[index][field] = value;
  setStructureForm({ ...structureForm, deductions: updated });
};

  
  const [assignForm, setAssignForm] = useState({
    employee_id: '',
    payroll_structure_id: '',
  });
  
  const [payslipForm, setPayslipForm] = useState({
    employee_id: '',
    month: '',
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [employeesRes, structuresRes, payslipsRes, formatsRes] = await Promise.all([
        api.get('/employees'),
        api.get('/payroll-structures'),
        api.get('/payslips'),
        api.get('/print-formats'),
      ]);
      setEmployees(employeesRes.data);
      setStructures(structuresRes.data);
      setPayslips(payslipsRes.data || []);
      setPrintFormats(formatsRes.data || []);
    } catch (error) {
      toast.error('Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };
  const handleUpdateStructure = async (e) => {
  e.preventDefault();
  if (submitting) return; // Prevent multiple submissions
  
  // Check for duplicate name (case-insensitive), excluding current structure
  const trimmedName = structureForm.name.trim();
  const duplicateExists = structures.some(
    structure => structure.id !== editStructure.id && 
                 structure.name.toLowerCase().trim() === trimmedName.toLowerCase()
  );
  
  if (duplicateExists) {
    toast.error('A payroll structure with this name already exists. Please use a different name.');
    return;
  }
  
  setSubmitting(true);
  try {
    // Filter out empty entries and combine earnings and deductions with category
    const earnings = structureForm.earnings
      .filter(item => item.type.trim() && item.amount)
      .map(item => ({
        type: item.type.trim(),
        amount: Number(item.amount),
        category: 'earnings'
      }));
    
    const deductions = structureForm.deductions
      .filter(item => item.type.trim() && item.amount)
      .map(item => ({
        type: item.type.trim(),
        amount: Number(item.amount),
        category: 'deductions'
      }));
    
    if (earnings.length === 0 && deductions.length === 0) {
      toast.error('Please add at least one earning or deduction');
      setSubmitting(false);
      return;
    }
    
    const salaryTypes = [...earnings, ...deductions];
    
    await api.put(`/payroll-structures/${editStructure.id}`, {
      name: trimmedName,
      salary_types: salaryTypes,
      print_format_id: structureForm.print_format_id && structureForm.print_format_id !== 'none' ? structureForm.print_format_id : null
    });

    toast.success("Payroll structure updated!");
    setEditDialog(false);
    fetchData();
  } catch (error) {
    const errorMessage = error.response?.data?.detail || 'Failed to update structure';
    toast.error(errorMessage);
  } finally {
    setSubmitting(false);
  }
};

const handleDeleteStructure = async (id) => {
 
  try {
    await api.delete(`/payroll-structures/${id}`);
    toast.success("Payroll structure deleted!");
    fetchData();
  } catch (error) {
alert("You cannot payroll containing employees")
    toast.error("Failed to delete structure");
  }
};

 const handleCreateStructure = async (e) => {
  e.preventDefault();
  if (submitting) return; // Prevent multiple submissions
  
  // Check for duplicate name (case-insensitive)
  const trimmedName = structureForm.name.trim();
  const duplicateExists = structures.some(
    structure => structure.name.toLowerCase().trim() === trimmedName.toLowerCase()
  );
  
  if (duplicateExists) {
    toast.error('A payroll structure with this name already exists. Please use a different name.');
    return;
  }
  
  setSubmitting(true);
  try {
    // Filter out empty entries and combine earnings and deductions with category
    const earnings = structureForm.earnings
      .filter(item => item.type.trim() && item.amount)
      .map(item => ({
        type: item.type.trim(),
        amount: Number(item.amount),
        category: 'earnings'
      }));
    
    const deductions = structureForm.deductions
      .filter(item => item.type.trim() && item.amount)
      .map(item => ({
        type: item.type.trim(),
        amount: Number(item.amount),
        category: 'deductions'
      }));
    
    if (earnings.length === 0 && deductions.length === 0) {
      toast.error('Please add at least one earning or deduction');
      setSubmitting(false);
      return;
    }
    
    const salaryTypes = [...earnings, ...deductions];
    
    await api.post('/payroll-structures', {
      name: trimmedName,
      salary_types: salaryTypes,
      print_format_id: structureForm.print_format_id && structureForm.print_format_id !== 'none' ? structureForm.print_format_id : null
    });

    toast.success('Payroll structure created!');
    setStructureForm({ 
      name: '', 
      earnings: [{ type: '', amount: '' }], 
      deductions: [{ type: '', amount: '' }], 
      print_format_id: 'none' 
    });
    fetchData();
    setStructureDialog(false);
  } catch (error) {
    const errorMessage = error.response?.data?.detail || 'Failed to create payroll structure';
    toast.error(errorMessage);
  } finally {
    setSubmitting(false);
  }
};

  const handleAssignPayroll = async (e) => {
  e.preventDefault();
  if (submitting) return; // Prevent multiple submissions
  setSubmitting(true);
  try {
    await api.post('/payroll', assignForm);

    toast.success('Payroll assigned successfully!');

    // Reset form
    setAssignForm({ employee_id: '', payroll_structure_id: '' });
    setAssignDialog(false);

    // 🔥 Re-fetch structures so employee_count updates
    fetchData();   // this reloads payroll-structures with updated employee_count
  } catch (error) {
    toast.error(error.response?.data?.detail || 'Failed to assign payroll');
  } finally {
    setSubmitting(false);
  }
};

  const handleGeneratePayslip = async (e) => {
    e.preventDefault();
    if (submitting) return; // Prevent multiple submissions
    setSubmitting(true);
    try {
      // Validate month format (should be YYYY-MM)
      const monthValue = payslipForm.month;
      if (!monthValue || !/^\d{4}-\d{2}$/.test(monthValue)) {
        toast.error('Please select a valid month (YYYY-MM format)');
        setSubmitting(false);
        return;
      }
      
      await api.post('/payslips/generate', payslipForm);
      toast.success('Payslip generated successfully!');
      setPayslipForm({ employee_id: '', month: '' });
      setPayslipDialog(false);
      fetchData(); // Refresh to show the new payslip
    } catch (error) {
      const errorMessage = error.response?.data?.detail || 'Failed to generate payslip';
      toast.error(errorMessage);
      console.error('Payslip generation error:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const getEmployeeName = (employeeId) => {
    const emp = employees.find((e) => e.id === employeeId);
    return emp ? emp.name : 'Unknown';
  };

  const handleDeletePayslip = async (payslipId) => {
    if (!confirm("Are you sure you want to delete this payslip?")) return;
    
    try {
      await api.delete(`/payslips/${payslipId}`);
      toast.success('Payslip deleted successfully');
      fetchData(); // Refresh the payslips list
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to delete payslip');
    }
  };

  if (loading) {
    return <div className="text-zinc-600">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-zinc-900">Payroll Management</h2>
        <p className="text-sm text-zinc-600 mt-1">Create payroll structures and assign to employees</p>
      </div>

      <Tabs defaultValue="structures" className="w-full">
        <TabsList className="grid w-full max-w-3xl grid-cols-4">
          <TabsTrigger value="structures">Payroll Structures</TabsTrigger>
          <TabsTrigger value="assign">Assign Payroll</TabsTrigger>
          <TabsTrigger value="payslips">Generate Payslips</TabsTrigger>
          <TabsTrigger value="generated">Generated Pay Slips</TabsTrigger>
        </TabsList>

        <TabsContent value="structures" className="space-y-4">
          <div className="flex justify-end">
            <Dialog open={structureDialog} onOpenChange={(open) => {
  setStructureDialog(open);
  if (open) {
    setStructureForm({
      name: '',
      earnings: [{ type: '', amount: '' }],
      deductions: [{ type: '', amount: '' }],
      print_format_id: 'none'
    });
  }
}}
>
              <DialogTrigger asChild>
                <Button className="bg-zinc-900 hover:bg-zinc-800" data-testid="create-structure-button">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Payroll Structure
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create Payroll Structure</DialogTitle>
                  <DialogDescription>
                    Define a salary structure that can be assigned to multiple employees
                  </DialogDescription>
                </DialogHeader>
               <form onSubmit={handleCreateStructure} className="space-y-4">

  <div className="space-y-2">
    <Label>Payroll Name</Label>
    <Input
      placeholder="e.g. Developer Payroll"
      value={structureForm.name}
      onChange={(e) => setStructureForm({ ...structureForm, name: e.target.value })}
      required
    />
  </div>

  <div className="space-y-2">
    <Label>Print Format (Optional)</Label>
    <Select
      value={structureForm.print_format_id}
      onValueChange={(value) =>
        setStructureForm({ ...structureForm, print_format_id: value })
      }
    >
      <SelectTrigger>
        <SelectValue placeholder="Select print format (optional)" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="none">None (Use default format)</SelectItem>
        {printFormats.map((format) => (
          <SelectItem key={format.id} value={format.id}>
            {format.name} {format.is_default && '(Default)'}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
    <p className="text-xs text-zinc-500">
      Payslips for employees with this structure will use the selected format
    </p>
  </div>

  {/* Earnings Section */}
  <div className="space-y-3">
    <div className="flex justify-between items-center">
      <Label className="flex items-center gap-2">
        <TrendingUp className="h-4 w-4 text-green-600" />
        Salary Type (Earnings)
      </Label>
      <Button type="button" variant="outline" size="sm" onClick={addEarning}>
        <Plus className="h-3 w-3 mr-1" />
        Add Salary Type (Earnings)
      </Button>
    </div>

    {(structureForm.earnings || []).map((item, index) => (
      <div key={`earning-${index}`} className="flex gap-2 items-center">
        <Input
          placeholder="Earning Type (e.g. Basic, HRA, Allowance)"
          value={item.type}
          onChange={(e) => updateEarning(index, "type", e.target.value)}
          required
          className="flex-1"
        />
        <Input
          type="number"
          placeholder="Amount"
          value={item.amount}
          onChange={(e) => updateEarning(index, "amount", e.target.value)}
          required
          className="w-32"
        />
        {structureForm.earnings.length > 1 && (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => removeEarning(index)}
          >
            <Trash2 className="h-4 w-4 text-red-600" />
          </Button>
        )}
      </div>
    ))}
  </div>

  {/* Deductions Section */}
  <div className="space-y-3">
    <div className="flex justify-between items-center">
      <Label className="flex items-center gap-2">
        <TrendingDown className="h-4 w-4 text-red-600" />
        Salary Type (Deductions)
      </Label>
      <Button type="button" variant="outline" size="sm" onClick={addDeduction}>
        <Plus className="h-3 w-3 mr-1" />
        Add Salary Type (Deductions)
      </Button>
    </div>

    {(structureForm.deductions || []).map((item, index) => (
      <div key={`deduction-${index}`} className="flex gap-2 items-center">
        <Input
          placeholder="Deduction Type (e.g. Tax, PF, Insurance)"
          value={item.type}
          onChange={(e) => updateDeduction(index, "type", e.target.value)}
          required
          className="flex-1"
        />
        <Input
          type="number"
          placeholder="Amount"
          value={item.amount}
          onChange={(e) => updateDeduction(index, "amount", e.target.value)}
          required
          className="w-32"
        />
        {structureForm.deductions.length > 1 && (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => removeDeduction(index)}
          >
            <Trash2 className="h-4 w-4 text-red-600" />
          </Button>
        )}
      </div>
    ))}
  </div>

  {/* Net Salary Preview */}
  <div className="pt-3 border-t border-zinc-200">
    <div className="flex justify-between items-center">
      <span className="font-semibold text-zinc-900">Net Salary (Preview)</span>
      <span className="font-semibold text-lg text-zinc-900">
        ₹{calculateNetSalary().toFixed(2)}
      </span>
    </div>
    <p className="text-xs text-zinc-500 mt-1">
      Total Earnings - Total Deductions
    </p>
  </div>

  <Button type="submit" className="w-full" disabled={submitting}>
    {submitting ? 'Creating...' : 'Create Payroll'}
  </Button>
</form>
              </DialogContent>
            </Dialog>
          </div>
<Dialog open={editDialog} onOpenChange={setEditDialog}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Edit Payroll Structure</DialogTitle>
    </DialogHeader>

    <form onSubmit={handleUpdateStructure} className="space-y-4">
        <div className="space-y-2">
    <Label>Payroll Name</Label>
    <Input
      placeholder="e.g. Developer Payroll"
      value={structureForm.name}
      onChange={(e) => setStructureForm({ ...structureForm, name: e.target.value })}
      required
    />
  </div>

  <div className="space-y-2">
    <Label>Print Format (Optional)</Label>
    <Select
      value={structureForm.print_format_id}
      onValueChange={(value) =>
        setStructureForm({ ...structureForm, print_format_id: value })
      }
    >
      <SelectTrigger>
        <SelectValue placeholder="Select print format (optional)" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="none">None (Use default format)</SelectItem>
        {printFormats.map((format) => (
          <SelectItem key={format.id} value={format.id}>
            {format.name} {format.is_default && '(Default)'}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
    <p className="text-xs text-zinc-500">
      Payslips for employees with this structure will use the selected format
    </p>
  </div>

  {/* Earnings Section */}
  <div className="space-y-3">
    <div className="flex justify-between items-center">
      <Label className="flex items-center gap-2">
        <TrendingUp className="h-4 w-4 text-green-600" />
        Salary Type (Earnings)
      </Label>
      <Button type="button" variant="outline" size="sm" onClick={addEarning}>
        <Plus className="h-3 w-3 mr-1" />
        Add Salary Type (Earnings)
      </Button>
    </div>

    {(structureForm.earnings || []).map((item, index) => (
      <div key={`earning-${index}`} className="flex gap-2 items-center">
        <Input
          placeholder="Earning Type (e.g. Basic, HRA, Allowance)"
          value={item.type}
          onChange={(e) => updateEarning(index, "type", e.target.value)}
          required
          className="flex-1"
        />
        <Input
          type="number"
          placeholder="Amount"
          value={item.amount}
          onChange={(e) => updateEarning(index, "amount", e.target.value)}
          required
          className="w-32"
        />
        {structureForm.earnings.length > 1 && (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => removeEarning(index)}
          >
            <Trash2 className="h-4 w-4 text-red-600" />
          </Button>
        )}
      </div>
    ))}
  </div>

  {/* Deductions Section */}
  <div className="space-y-3">
    <div className="flex justify-between items-center">
      <Label className="flex items-center gap-2">
        <TrendingDown className="h-4 w-4 text-red-600" />
        Salary Type (Deductions)
      </Label>
      <Button type="button" variant="outline" size="sm" onClick={addDeduction}>
        <Plus className="h-3 w-3 mr-1" />
        Add Salary Type (Deductions)
      </Button>
    </div>

    {(structureForm.deductions || []).map((item, index) => (
      <div key={`deduction-${index}`} className="flex gap-2 items-center">
        <Input
          placeholder="Deduction Type (e.g. Tax, PF, Insurance)"
          value={item.type}
          onChange={(e) => updateDeduction(index, "type", e.target.value)}
          required
          className="flex-1"
        />
        <Input
          type="number"
          placeholder="Amount"
          value={item.amount}
          onChange={(e) => updateDeduction(index, "amount", e.target.value)}
          required
          className="w-32"
        />
        {structureForm.deductions.length > 1 && (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => removeDeduction(index)}
          >
            <Trash2 className="h-4 w-4 text-red-600" />
          </Button>
        )}
      </div>
    ))}
  </div>

  {/* Net Salary Preview */}
  <div className="pt-3 border-t border-zinc-200">
    <div className="flex justify-between items-center">
      <span className="font-semibold text-zinc-900">Net Salary (Preview)</span>
      <span className="font-semibold text-lg text-zinc-900">
        ₹{calculateNetSalary().toFixed(2)}
      </span>
    </div>
    <p className="text-xs text-zinc-500 mt-1">
      Total Earnings - Total Deductions
    </p>
  </div>
         
      <Button type="submit" className="w-full" disabled={submitting}>
        {submitting ? 'Updating...' : 'Update Structure'}
      </Button>
    </form>
  </DialogContent>
</Dialog>

          <div className="grid gap-4">
            {structures.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <p className="text-zinc-600">No payroll structures yet. Create one!</p>
                </CardContent>
              </Card>
            ) : (
             <>
             {structures.map((structure) => (
  <Card key={structure.id} className="border-zinc-200" data-testid="payroll-structure-card">
    <CardHeader className="flex flex-row justify-between items-center">
      <CardTitle className="text-lg text-zinc-900">{structure.name}</CardTitle>
      <div className="flex gap-2">
        <Button size="sm" variant="outline" onClick={() => openEditDialog(structure)}>
          Edit
        </Button>
        <Button size="sm" variant="destructive" onClick={() => handleDeleteStructure(structure.id)}>
          Delete
        </Button>
      </div>
    </CardHeader>

    <CardContent>
      <div className="text-sm text-zinc-500 mb-4">
        Assigned Employees: <span className="font-semibold">{structure.employee_count}</span>
      </div>
      <div className="space-y-3">
        {/* Earnings Section */}
        {(structure.salary_types || []).filter(item => (item.category || 'earnings') === 'earnings').length > 0 && (
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm font-medium text-green-700 mb-1">
              <TrendingUp className="h-3 w-3" />
              Earnings
            </div>
            {(structure.salary_types || []).filter(item => (item.category || 'earnings') === 'earnings').map((item, index) => (
              <div key={`earning-${index}`} className="flex justify-between text-sm pl-5">
                <span className="text-zinc-600">{item.type}</span>
                <span className="font-medium text-green-600">+₹{item.amount}</span>
              </div>
            ))}
          </div>
        )}

        {/* Deductions Section */}
        {(structure.salary_types || []).filter(item => (item.category || 'earnings') === 'deductions').length > 0 && (
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm font-medium text-red-700 mb-1">
              <TrendingDown className="h-3 w-3" />
              Deductions
            </div>
            {(structure.salary_types || []).filter(item => (item.category || 'earnings') === 'deductions').map((item, index) => (
              <div key={`deduction-${index}`} className="flex justify-between text-sm pl-5">
                <span className="text-zinc-600">{item.type}</span>
                <span className="font-medium text-red-600">-₹{item.amount}</span>
              </div>
            ))}
          </div>
        )}

        <div className="pt-3 border-t border-zinc-200">
          <div className="flex justify-between">
            <span className="font-semibold text-zinc-900">Net Salary</span>
            <span className="font-semibold text-lg text-zinc-900">
              ₹{structure.net_salary.toFixed(2)}
            </span>
          </div>
        </div>
      </div>
    </CardContent>
  </Card>
))}

             </>)}
          </div>
        </TabsContent>

        <TabsContent value="assign" className="space-y-4">
          <Card className="border-zinc-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-zinc-900">
                <DollarSign className="h-5 w-5" />
                Assign Payroll to Employee
              </CardTitle>
              <CardDescription>Link an employee to a payroll structure</CardDescription>
            </CardHeader>
            <CardContent>
              <Dialog open={assignDialog} onOpenChange={setAssignDialog}>
                <DialogTrigger asChild>
                  <Button className="w-full bg-zinc-900 hover:bg-zinc-800" data-testid="assign-payroll-button">
                    Assign Payroll
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Assign Payroll</DialogTitle>
                    <DialogDescription>
                      Select an employee and payroll structure
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleAssignPayroll} className="space-y-4">
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
                              {emp.name} ({emp.employee_id}) - {emp.department}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Payroll Structure</Label>
                      <Select
                        value={assignForm.payroll_structure_id}
                        onValueChange={(value) =>
                          setAssignForm({ ...assignForm, payroll_structure_id: value })
                        }
                        required
                      >
                        <SelectTrigger data-testid="assign-structure-select">
                          <SelectValue placeholder="Select payroll structure" />
                        </SelectTrigger>
                        <SelectContent>
                          {structures.map((struct) => (
                            <SelectItem key={struct.id} value={struct.id}>
                              {struct.name} - Net: ₹{(struct.net_salary).toFixed(2)}
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
                      {submitting ? 'Assigning...' : 'Assign Payroll'}
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payslips" className="space-y-4">
          <Card className="border-zinc-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-zinc-900">
                <FileText className="h-5 w-5" />
                Generate Payslip
              </CardTitle>
              <CardDescription>Create monthly payslips for employees</CardDescription>
            </CardHeader>
            <CardContent>
              <Dialog open={payslipDialog} onOpenChange={setPayslipDialog}>
                <DialogTrigger asChild>
                  <Button className="w-full bg-zinc-900 hover:bg-zinc-800" data-testid="generate-payslip-button">
                    Generate Payslip
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Generate Payslip</DialogTitle>
                    <DialogDescription>
                      Create a payslip for a specific month
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleGeneratePayslip} className="space-y-4">
                    <div className="space-y-2">
                      <Label>Employee</Label>
                      <Select
                        value={payslipForm.employee_id}
                        onValueChange={(value) =>
                          setPayslipForm({ ...payslipForm, employee_id: value })
                        }
                        required
                      >
                        <SelectTrigger data-testid="payslip-employee-select">
                          <SelectValue placeholder="Select employee" />
                        </SelectTrigger>
                        <SelectContent>
                          {employees.map((emp) => (
                            <SelectItem key={emp.id} value={emp.id}>
                              {emp.name} ({emp.employee_id}) - {emp.department}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="month">Month</Label>
                      <Input
                        id="month"
                        data-testid="payslip-month-input"
                        type="month"
                        value={payslipForm.month}
                        onChange={(e) =>
                          setPayslipForm({ ...payslipForm, month: e.target.value })
                        }
                        required
                      />
                    </div>
                    <Button 
                      type="submit" 
                      className="w-full bg-zinc-900 hover:bg-zinc-800" 
                      data-testid="submit-payslip-button"
                      disabled={submitting}
                    >
                      {submitting ? 'Generating...' : 'Generate Payslip'}
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Generated Pay Slips Tab */}
        <TabsContent value="generated" className="space-y-4">
          <div className="grid gap-4">
            {payslips.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <FileText className="h-12 w-12 mx-auto text-zinc-400 mb-4" />
                  <p className="text-zinc-600">No payslips generated yet.</p>
                </CardContent>
              </Card>
            ) : (
              payslips.map((payslip) => (
                <Card key={payslip.id} className="border-zinc-200" data-testid="generated-payslip-card">
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-lg text-zinc-900">
                          {getEmployeeName(payslip.employee_id)} - {payslip.month}
                        </CardTitle>
                        <CardDescription className="mt-1">
                          Generated on{' '}
                          {new Date(payslip.generated_at).toLocaleDateString()}
                        </CardDescription>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          onClick={async () => {
                            try {
                              const response = await api.get(`/payslips/${payslip.id}/download`, {
                                responseType: 'text',
                              });
                              
                              // Open in new window and trigger print dialog
                              const newWindow = window.open('', '_blank');
                              if (newWindow) {
                                newWindow.document.write(response.data);
                                newWindow.document.close();
                                
                                // Wait for content to load, then trigger print
                                setTimeout(() => {
                                  newWindow.print();
                                }, 500);
                                
                                toast.success('Payslip opened for printing/download');
                              } else {
                                toast.error('Please allow popups to download payslip');
                              }
                            } catch (error) {
                              const errorMessage = error.response?.data?.detail || 'Failed to download payslip';
                              toast.error(errorMessage);
                            }
                          }}
                          className="bg-zinc-900 hover:bg-zinc-800"
                          size="sm"
                          data-testid="download-payslip-button"
                        >
                          <Download className="h-4 w-4 mr-2" />
                          Download PDF
                        </Button>
                        <Button
                          onClick={() => handleDeletePayslip(payslip.id)}
                          variant="destructive"
                          size="sm"
                          data-testid="delete-payslip-button"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {payslip.salary_types && payslip.salary_types.length > 0 ? (
                        <>
                          {/* Display individual salary types from payroll structure */}
                          {payslip.salary_types
                            .filter(st => st.category === 'earnings')
                            .map((salaryType, idx) => (
                              <div key={`earning-${idx}`} className="flex justify-between text-sm">
                                <span className="text-zinc-600">{salaryType.type}</span>
                                <span className="font-medium text-green-600">
                                  +₹{Math.abs(salaryType.amount).toFixed(2)}
                                </span>
                              </div>
                            ))}
                          {payslip.salary_types
                            .filter(st => st.category === 'deductions')
                            .map((salaryType, idx) => (
                              <div key={`deduction-${idx}`} className="flex justify-between text-sm">
                                <span className="text-zinc-600">{salaryType.type}</span>
                                <span className="font-medium text-red-600">
                                  ₹{Math.abs(salaryType.amount).toFixed(2)}
                                </span>
                              </div>
                            ))}
                        </>
                      ) : (
                        <>
                          {/* Fallback to aggregated values for backward compatibility */}
                          <div className="flex justify-between text-sm">
                            <span className="text-zinc-600">Basic Salary</span>
                            <span className="font-medium text-zinc-900">
                              ₹{payslip.basic_salary.toFixed(2)}
                            </span>
                          </div>
                          {payslip.allowances > 0 && (
                            <div className="flex justify-between text-sm">
                              <span className="text-zinc-600">Allowances</span>
                              <span className="font-medium text-green-600">
                                +₹{payslip.allowances.toFixed(2)}
                              </span>
                            </div>
                          )}
                          {payslip.deductions > 0 && (
                            <div className="flex justify-between text-sm">
                              <span className="text-zinc-600">Deductions</span>
                              <span className="font-medium text-red-600">
                                ₹{payslip.deductions.toFixed(2)}
                              </span>
                            </div>
                          )}
                        </>
                      )}
                      <div className="pt-3 border-t border-zinc-200">
                        <div className="flex justify-between">
                          <span className="font-semibold text-zinc-900">Net Pay</span>
                          <span className="font-semibold text-lg text-zinc-900">
                            ₹{payslip.net_pay.toFixed(2)}
                          </span>
                        </div>
                      </div>
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