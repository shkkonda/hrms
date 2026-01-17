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
import { DollarSign, FileText, Plus } from 'lucide-react';
import { toast } from 'sonner';
import api from '../../lib/api';

export default function PayrollManagement() {
  const [employees, setEmployees] = useState([]);
  const [structures, setStructures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [structureDialog, setStructureDialog] = useState(false);
  const [assignDialog, setAssignDialog] = useState(false);
  const [payslipDialog, setPayslipDialog] = useState(false);
  
  const [structureForm, setStructureForm] = useState({
    name: '',
    basic_salary: '',
    allowances: '',
    deductions: '',
  });
  
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
      const [employeesRes, structuresRes] = await Promise.all([
        api.get('/employees'),
        api.get('/payroll-structures'),
      ]);
      setEmployees(employeesRes.data);
      setStructures(structuresRes.data);
    } catch (error) {
      toast.error('Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateStructure = async (e) => {
    e.preventDefault();
    try {
      await api.post('/payroll-structures', {
        ...structureForm,
        basic_salary: parseFloat(structureForm.basic_salary),
        allowances: parseFloat(structureForm.allowances) || 0,
        deductions: parseFloat(structureForm.deductions) || 0,
      });
      toast.success('Payroll structure created!');
      setStructureForm({ name: '', basic_salary: '', allowances: '', deductions: '' });
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
      setAssignForm({ employee_id: '', payroll_structure_id: '' });
      setAssignDialog(false);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to assign payroll');
    }
  };

  const handleGeneratePayslip = async (e) => {
    e.preventDefault();
    try {
      await api.post('/payslips/generate', payslipForm);
      toast.success('Payslip generated successfully!');
      setPayslipForm({ employee_id: '', month: '' });
      setPayslipDialog(false);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to generate payslip');
    }
  };

  if (loading) {
    return <div className=\"text-zinc-600\">Loading...</div>;
  }

  return (
    <div className=\"space-y-6\">
      <div>
        <h2 className=\"text-2xl font-semibold text-zinc-900\">Payroll Management</h2>
        <p className=\"text-sm text-zinc-600 mt-1\">Create payroll structures and assign to employees</p>
      </div>

      <Tabs defaultValue=\"structures\" className=\"w-full\">
        <TabsList className=\"grid w-full max-w-2xl grid-cols-3\">
          <TabsTrigger value=\"structures\">Payroll Structures</TabsTrigger>
          <TabsTrigger value=\"assign\">Assign Payroll</TabsTrigger>
          <TabsTrigger value=\"payslips\">Generate Payslips</TabsTrigger>
        </TabsList>

        {/* Payroll Structures Tab */}
        <TabsContent value=\"structures\" className=\"space-y-4\">
          <div className=\"flex justify-end\">
            <Dialog open={structureDialog} onOpenChange={setStructureDialog}>
              <DialogTrigger asChild>
                <Button className=\"bg-zinc-900 hover:bg-zinc-800\" data-testid=\"create-structure-button\">
                  <Plus className=\"h-4 w-4 mr-2\" />
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
                <form onSubmit={handleCreateStructure} className=\"space-y-4\">
                  <div className=\"space-y-2\">
                    <Label htmlFor=\"structure_name\">Structure Name</Label>
                    <Input
                      id=\"structure_name\"
                      data-testid=\"structure-name-input\"
                      placeholder=\"e.g., Senior Engineer, Manager L2\"
                      value={structureForm.name}
                      onChange={(e) =>
                        setStructureForm({ ...structureForm, name: e.target.value })
                      }
                      required
                    />
                  </div>
                  <div className=\"space-y-2\">
                    <Label htmlFor=\"basic_salary\">Basic Salary</Label>
                    <Input
                      id=\"basic_salary\"
                      data-testid=\"structure-basic-salary-input\"
                      type=\"number\"
                      step=\"0.01\"
                      placeholder=\"5000\"
                      value={structureForm.basic_salary}
                      onChange={(e) =>
                        setStructureForm({ ...structureForm, basic_salary: e.target.value })
                      }
                      required
                    />
                  </div>
                  <div className=\"space-y-2\">
                    <Label htmlFor=\"allowances\">Allowances</Label>
                    <Input
                      id=\"allowances\"
                      data-testid=\"structure-allowances-input\"
                      type=\"number\"
                      step=\"0.01\"
                      placeholder=\"500\"
                      value={structureForm.allowances}
                      onChange={(e) =>
                        setStructureForm({ ...structureForm, allowances: e.target.value })
                      }
                    />
                  </div>
                  <div className=\"space-y-2\">
                    <Label htmlFor=\"deductions\">Deductions</Label>
                    <Input
                      id=\"deductions\"
                      data-testid=\"structure-deductions-input\"
                      type=\"number\"
                      step=\"0.01\"
                      placeholder=\"200\"
                      value={structureForm.deductions}
                      onChange={(e) =>
                        setStructureForm({ ...structureForm, deductions: e.target.value })
                      }
                    />
                  </div>
                  <Button type=\"submit\" className=\"w-full bg-zinc-900 hover:bg-zinc-800\" data-testid=\"submit-structure-button\">
                    Create Structure
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          <div className=\"grid gap-4\">
            {structures.length === 0 ? (
              <Card>
                <CardContent className=\"py-12 text-center\">
                  <p className=\"text-zinc-600\">No payroll structures yet. Create one!</p>
                </CardContent>
              </Card>
            ) : (
              structures.map((structure) => (
                <Card key={structure.id} className=\"border-zinc-200\" data-testid=\"payroll-structure-card\">
                  <CardHeader>
                    <CardTitle className=\"text-lg text-zinc-900\">{structure.name}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className=\"space-y-3\">
                      <div className=\"flex justify-between text-sm\">
                        <span className=\"text-zinc-600\">Basic Salary</span>
                        <span className=\"font-medium text-zinc-900\">
                          ${structure.basic_salary.toFixed(2)}
                        </span>
                      </div>
                      <div className=\"flex justify-between text-sm\">
                        <span className=\"text-zinc-600\">Allowances</span>
                        <span className=\"font-medium text-green-600\">
                          +${structure.allowances.toFixed(2)}
                        </span>
                      </div>
                      <div className=\"flex justify-between text-sm\">
                        <span className=\"text-zinc-600\">Deductions</span>
                        <span className=\"font-medium text-red-600\">
                          -${structure.deductions.toFixed(2)}
                        </span>
                      </div>
                      <div className=\"pt-3 border-t border-zinc-200\">
                        <div className=\"flex justify-between\">
                          <span className=\"font-semibold text-zinc-900\">Net Salary</span>
                          <span className=\"font-semibold text-lg text-zinc-900\">
                            ${(structure.basic_salary + structure.allowances - structure.deductions).toFixed(2)}
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

        {/* Assign Payroll Tab */}
        <TabsContent value=\"assign\" className=\"space-y-4\">
          <Card className=\"border-zinc-200\">
            <CardHeader>
              <CardTitle className=\"flex items-center gap-2 text-zinc-900\">
                <DollarSign className=\"h-5 w-5\" />
                Assign Payroll to Employee
              </CardTitle>
              <CardDescription>Link an employee to a payroll structure</CardDescription>
            </CardHeader>
            <CardContent>
              <Dialog open={assignDialog} onOpenChange={setAssignDialog}>
                <DialogTrigger asChild>
                  <Button className=\"w-full bg-zinc-900 hover:bg-zinc-800\" data-testid=\"assign-payroll-button\">
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
                  <form onSubmit={handleAssignPayroll} className=\"space-y-4\">
                    <div className=\"space-y-2\">
                      <Label>Employee</Label>
                      <Select
                        value={assignForm.employee_id}
                        onValueChange={(value) =>
                          setAssignForm({ ...assignForm, employee_id: value })
                        }
                        required
                      >
                        <SelectTrigger data-testid=\"assign-employee-select\">
                          <SelectValue placeholder=\"Select employee\" />
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
                    <div className=\"space-y-2\">
                      <Label>Payroll Structure</Label>
                      <Select
                        value={assignForm.payroll_structure_id}
                        onValueChange={(value) =>
                          setAssignForm({ ...assignForm, payroll_structure_id: value })
                        }
                        required
                      >
                        <SelectTrigger data-testid=\"assign-structure-select\">
                          <SelectValue placeholder=\"Select payroll structure\" />
                        </SelectTrigger>
                        <SelectContent>
                          {structures.map((struct) => (
                            <SelectItem key={struct.id} value={struct.id}>
                              {struct.name} - Net: ${(struct.basic_salary + struct.allowances - struct.deductions).toFixed(2)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <Button type=\"submit\" className=\"w-full bg-zinc-900 hover:bg-zinc-800\" data-testid=\"submit-assign-button\">
                      Assign Payroll
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Generate Payslips Tab */}
        <TabsContent value=\"payslips\" className=\"space-y-4\">
          <Card className=\"border-zinc-200\">
            <CardHeader>
              <CardTitle className=\"flex items-center gap-2 text-zinc-900\">
                <FileText className=\"h-5 w-5\" />
                Generate Payslip
              </CardTitle>
              <CardDescription>Create monthly payslips for employees</CardDescription>
            </CardHeader>
            <CardContent>
              <Dialog open={payslipDialog} onOpenChange={setPayslipDialog}>
                <DialogTrigger asChild>
                  <Button className=\"w-full bg-zinc-900 hover:bg-zinc-800\" data-testid=\"generate-payslip-button\">
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
                  <form onSubmit={handleGeneratePayslip} className=\"space-y-4\">
                    <div className=\"space-y-2\">
                      <Label>Employee</Label>
                      <Select
                        value={payslipForm.employee_id}
                        onValueChange={(value) =>
                          setPayslipForm({ ...payslipForm, employee_id: value })
                        }
                        required
                      >
                        <SelectTrigger data-testid=\"payslip-employee-select\">
                          <SelectValue placeholder=\"Select employee\" />
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
                    <div className=\"space-y-2\">
                      <Label htmlFor=\"month\">Month</Label>
                      <Input
                        id=\"month\"
                        data-testid=\"payslip-month-input\"
                        type=\"month\"
                        value={payslipForm.month}
                        onChange={(e) =>
                          setPayslipForm({ ...payslipForm, month: e.target.value })
                        }
                        required
                      />
                    </div>
                    <Button type=\"submit\" className=\"w-full bg-zinc-900 hover:bg-zinc-800\" data-testid=\"submit-payslip-button\">
                      Generate Payslip
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
