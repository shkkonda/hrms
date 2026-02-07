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
      // Use the /payslips endpoint which automatically handles employee lookup
      const payslipsRes = await api.get('/payslips');
      setPayslips(payslipsRes.data || []);
      
      // Also get employee ID for reference if needed
      try {
        const employeesRes = await api.get('/employees');
        const user = JSON.parse(localStorage.getItem('user'));
        const employee = employeesRes.data.find((e) => e.email === user.email);
        if (employee) {
          setEmployeeId(employee.id);
        }
      } catch (err) {
        // Ignore employee lookup errors
      }
    } catch (error) {
      const errorMessage = error.response?.data?.detail || 'Failed to fetch payslips';
      toast.error(errorMessage);
      console.error('Error fetching payslips:', error);
      setPayslips([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (payslipId, month) => {
    try {
      const response = await api.get(`/payslips/${payslipId}/download`, {
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
      console.error('Download error:', error);
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
    </div>
  );
}
