import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Download, FileText } from 'lucide-react';
import { toast } from 'sonner';
import api from '../../lib/api';

export default function MyPayslips() {
  const [payslips, setPayslips] = useState([]);
  const [employeeId, setEmployeeId] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEmployeeAndPayslips();
  }, []);

  const fetchEmployeeAndPayslips = async () => {
    try {
      // Get current user's employee profile
      const user = JSON.parse(localStorage.getItem('user'));
      const employeesRes = await api.get('/employees');
      const employee = employeesRes.data.find((e) => e.email === user.email);
      
      if (employee) {
        setEmployeeId(employee.id);
        const payslipsRes = await api.get(`/payslips/employee/${employee.id}`);
        setPayslips(payslipsRes.data);
      }
    } catch (error) {
      toast.error('Failed to fetch payslips');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (payslipId, month) => {
    try {
      const response = await api.get(`/payslips/${payslipId}/download`, {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `payslip_${month}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('Payslip downloaded!');
    } catch (error) {
      toast.error('Failed to download payslip');
    }
  };

  if (loading) {
    return <div className="text-zinc-600">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-zinc-900">My Payslips</h2>
        <p className="text-sm text-zinc-600 mt-1">View and download your payslips</p>
      </div>

      <div className="grid gap-4">
        {payslips.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <FileText className="h-12 w-12 mx-auto text-zinc-400 mb-4" />
              <p className="text-zinc-600">No payslips available yet.</p>
            </CardContent>
          </Card>
        ) : (
          payslips.map((payslip) => (
            <Card key={payslip.id} className="border-zinc-200" data-testid="payslip-card">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg text-zinc-900">
                      Payslip - {payslip.month}
                    </CardTitle>
                    <CardDescription className="mt-1">
                      Generated on{' '}
                      {new Date(payslip.generated_at).toLocaleDateString()}
                    </CardDescription>
                  </div>
                  <Button
                    onClick={() => handleDownload(payslip.id, payslip.month)}
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
                      ${payslip.basic_salary.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-zinc-600">Allowances</span>
                    <span className="font-medium text-green-600">
                      +${payslip.allowances.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-zinc-600">Deductions</span>
                    <span className="font-medium text-red-600">
                      -${payslip.deductions.toFixed(2)}
                    </span>
                  </div>
                  <div className="pt-3 border-t border-zinc-200">
                    <div className="flex justify-between">
                      <span className="font-semibold text-zinc-900">Net Pay</span>
                      <span className="font-semibold text-lg text-zinc-900">
                        ${payslip.net_pay.toFixed(2)}
                      </span>
                    </div>
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
