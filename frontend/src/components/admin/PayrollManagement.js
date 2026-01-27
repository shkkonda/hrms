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
import { DollarSign, FileText, Plus, Download } from 'lucide-react';
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
 

  const openEditDialog = (structure) => {
  setEditStructure(structure);
  setStructureForm({
   name: structure.name,
    salary_types: structure.salary_types || [],
    print_format_id: structure.print_format_id || 'none'
  });
  setEditDialog(true);
};

 const [structureForm, setStructureForm] = useState({
  name: '',
  salary_types: [{ type: '', amount: '' }],
  net_salary: '',
  print_format_id: ''
});
const addSalaryType = () => {
  setStructureForm(prev => ({
    ...prev,
    salary_types: [...(prev.salary_types || []), { type: '', amount: '' }]
  }));
};


const updateSalaryType = (index, field, value) => {
  const updated = [...structureForm.salary_types];
  updated[index][field] = value;

  setStructureForm({
    ...structureForm,
    salary_types: updated
  });
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
  try {
    await api.put(`/payroll-structures/${editStructure.id}`, {
      name: structureForm.name,
      salary_types: structureForm.salary_types.map(item => ({
        type: item.type,
        amount: Number(item.amount)
      })),
      print_format_id: structureForm.print_format_id && structureForm.print_format_id !== 'none' ? structureForm.print_format_id : null
    });

    toast.success("Payroll structure updated!");
    setEditDialog(false);
    fetchData();
  } catch (error) {
    toast.error("Failed to update structure");
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
  try {
    await api.post('/payroll-structures', {
      name: structureForm.name,
      salary_types: structureForm.salary_types.map(item => ({
        type: item.type,
        amount: Number(item.amount)
      })),
      print_format_id: structureForm.print_format_id && structureForm.print_format_id !== 'none' ? structureForm.print_format_id : null
    });

    toast.success('Payroll structure created!');
    setStructureForm({ name: '', salary_types: [{ type: '', amount: '' }], print_format_id: 'none' });
    fetchData();
    setStructureDialog(false);
  } catch (error) {
    toast.error('Failed to create payroll structure');
  }
};

  const handleAssignPayroll = async (e) => {
  e.preventDefault();
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
  }
};

  const handleGeneratePayslip = async (e) => {
    e.preventDefault();
    try {
      // Validate month format (should be YYYY-MM)
      const monthValue = payslipForm.month;
      if (!monthValue || !/^\d{4}-\d{2}$/.test(monthValue)) {
        toast.error('Please select a valid month (YYYY-MM format)');
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
    }
  };

  const getEmployeeName = (employeeId) => {
    const emp = employees.find((e) => e.id === employeeId);
    return emp ? emp.name : 'Unknown';
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
      salary_types: [{ type: '', amount: '' }],
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

  <div className="flex justify-between items-center">
    <Label>Salary Types</Label>
    <Button type="button" variant="outline" onClick={addSalaryType}>
      + Add Salary Type
    </Button>
  </div>

  {(structureForm.salary_types || []).map((item, index) => (
    <div key={index} className="flex gap-2">
      <Input
        placeholder="Salary Type (e.g. Basic, HRA)"
        value={item.type}
        onChange={(e) => updateSalaryType(index, "type", e.target.value)}
        required
      />
      <Input
        type="number"
        placeholder="Amount"
        value={item.amount}
        onChange={(e) => updateSalaryType(index, "amount", e.target.value)}
        required
      />
    </div>
  ))}

  <Button type="submit" className="w-full">
    Create Payroll
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

  <div className="flex justify-between items-center">
    <Label>Salary Types</Label>
    <Button type="button" variant="outline" onClick={addSalaryType}>
      + Add Salary Type
    </Button>
  </div>

  {(structureForm.salary_types || []).map((item, index) => (
    <div key={index} className="flex gap-2">
      <Input
        placeholder="Salary Type (e.g. Basic, HRA)"
        value={item.type}
        onChange={(e) => updateSalaryType(index, "type", e.target.value)}
        required
      />
      <Input
        type="number"
        placeholder="Amount"
        value={item.amount}
        onChange={(e) => updateSalaryType(index, "amount", e.target.value)}
        required
      />
    </div>
  ))}
         
      <Button type="submit" className="w-full">Update Structure</Button>
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
      <div className="text-sm text-zinc-500 mb-2">
    Assigned Employees: <span className="font-semibold">{structure.employee_count}</span>
  </div>
      <div className="space-y-2">
        {(structure.salary_types || []).map((item, index) => (
          <div key={index} className="flex justify-between text-sm">
            <span className="text-zinc-600">{item.type}</span>
            <span className="font-medium text-zinc-900">₹{item.amount}</span>
          </div>
        ))}

        <div className="pt-3 border-t border-zinc-200">
          <div className="flex justify-between">
            <span className="font-semibold text-zinc-900">Net Salary</span>
            <span className="font-semibold text-lg text-zinc-900">
              ₹{structure.net_salary}
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
                    <Button type="submit" className="w-full bg-zinc-900 hover:bg-zinc-800" data-testid="submit-assign-button">
                      Assign Payroll
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
                    <Button type="submit" className="w-full bg-zinc-900 hover:bg-zinc-800" data-testid="submit-payslip-button">
                      Generate Payslip
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
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-zinc-600">Basic Salary</span>
                        <span className="font-medium text-zinc-900">
                          ₹{payslip.basic_salary.toFixed(2)}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-zinc-600">Allowances</span>
                        <span className="font-medium text-green-600">
                          +₹{payslip.allowances.toFixed(2)}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-zinc-600">Deductions</span>
                        <span className="font-medium text-red-600">
                          -₹{payslip.deductions.toFixed(2)}
                        </span>
                      </div>
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