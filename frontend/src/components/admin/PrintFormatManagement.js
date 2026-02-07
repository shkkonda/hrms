import { useState, useEffect, useMemo } from 'react';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Edit, Trash2, Eye, FileText, CheckCircle, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import api from '../../lib/api';

const DEFAULT_TEMPLATE = `<!DOCTYPE html>
<html>
<head>
    <style>
        body {
            font-family: Arial, sans-serif;
            padding: 40px;
            color: #333;
        }
        .letterhead {
            text-align: center;
            border-bottom: 3px solid #333;
            padding-bottom: 20px;
            margin-bottom: 30px;
        }
        .company-name {
            font-size: 28px;
            font-weight: bold;
            color: #1a1a1a;
            margin: 0;
        }
        .company-info {
            color: #666;
            font-size: 12px;
            margin-top: 5px;
        }
        .document-title {
            text-align: center;
            font-size: 24px;
            font-weight: bold;
            margin: 30px 0;
            color: #1a1a1a;
        }
        .employee-info {
            margin: 20px 0;
            background: #f9f9f9;
            padding: 15px;
            border-radius: 5px;
        }
        .info-row {
            display: flex;
            margin: 8px 0;
        }
        .info-label {
            width: 150px;
            font-weight: bold;
            color: #666;
        }
        .salary-table {
            width: 100%;
            border-collapse: collapse;
            margin: 30px 0;
        }
        .salary-table th {
            background: #333;
            color: white;
            padding: 12px;
            text-align: left;
        }
        .salary-table td {
            padding: 12px;
            border-bottom: 1px solid #ddd;
        }
        .total-row {
            font-weight: bold;
            background: #f5f5f5;
            font-size: 16px;
        }
        .footer {
            margin-top: 50px;
            text-align: center;
            color: #666;
            font-size: 11px;
            border-top: 1px solid #ddd;
            padding-top: 20px;
        }
    </style>
</head>
<body>
    <div class="letterhead">
        <h1 class="company-name">YOUR COMPANY NAME</h1>
        <p class="company-info">
            123 Business Street, City, State 12345 | Phone: (555) 123-4567 | Email: hr@company.com
        </p>
    </div>

    <h2 class="document-title">SALARY SLIP</h2>

    <div class="employee-info">
        <div class="info-row">
            <div class="info-label">Employee Name:</div>
            <div>{{ employee_name }}</div>
        </div>
        <div class="info-row">
            <div class="info-label">Employee ID:</div>
            <div>{{ employee_id }}</div>
        </div>
        <div class="info-row">
            <div class="info-label">Email:</div>
            <div>{{ employee_email }}</div>
        </div>
        <div class="info-row">
            <div class="info-label">Department:</div>
            <div>{{ department }}</div>
        </div>
        <div class="info-row">
            <div class="info-label">Pay Period:</div>
            <div>{{ month }}</div>
        </div>
    </div>

    <table class="salary-table">
        <tr>
            <th>Description</th>
            <th style="text-align: right;">Amount (₹)</th>
        </tr>
        <tr>
            <td>Basic Salary</td>
            <td style="text-align: right;">₹{{ "%.2f"|format(basic_salary) }}</td>
        </tr>
        <tr>
            <td>Allowances</td>
            <td style="text-align: right;">₹{{ "%.2f"|format(allowances) }}</td>
        </tr>
        <tr>
            <td>Deductions</td>
            <td style="text-align: right;">₹{{ "%.2f"|format(deductions) }}</td>
        </tr>
        <tr class="total-row">
            <td>Net Salary</td>
            <td style="text-align: right;">₹{{ "%.2f"|format(net_pay) }}</td>
        </tr>
    </table>

    <div class="footer">
        <p>This is a computer-generated document. No signature is required.</p>
        <p>Generated on: {{ generated_date }}</p>
    </div>
</body>
</html>`;

// Sample data for preview
const SAMPLE_DATA = {
  employee_name: "John Doe",
  employee_id: "EMP12AB34CD",
  employee_email: "john@company.com",
  department: "Engineering",
  month: "January 2025",
  basic_salary: 50000.00,
  allowances: 5000.00,
  deductions: 2000.00,
  net_pay: 53000.00,
  generated_date: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
};

export default function PrintFormatManagement() {
  const [formats, setFormats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [createDialog, setCreateDialog] = useState(false);
  const [editDialog, setEditDialog] = useState(false);
  const [editingFormat, setEditingFormat] = useState(null);
  const [previewHtml, setPreviewHtml] = useState('');
  const [previewError, setPreviewError] = useState('');
  
  const [formData, setFormData] = useState({
    name: '',
    template_html: DEFAULT_TEMPLATE,
    is_default: false,
  });

  useEffect(() => {
    fetchFormats();
  }, []);

  // Generate preview HTML from template
  const generatePreview = async (htmlTemplate) => {
    if (!htmlTemplate || !htmlTemplate.trim()) {
      setPreviewHtml('');
      setPreviewError('');
      return;
    }

    try {
      // Simple Jinja2 variable replacement for preview
      let preview = htmlTemplate;
      Object.entries(SAMPLE_DATA).forEach(([key, value]) => {
        const regex = new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'g');
        preview = preview.replace(regex, String(value));
      });
      
      // Handle Jinja2 filters (basic support)
      preview = preview.replace(/\{\{\s*"%.2f"\s*\|\s*format\((\w+)\)\s*\}\}/g, (match, varName) => {
        const value = SAMPLE_DATA[varName] || 0;
        return `₹${value.toFixed(2)}`;
      });

      setPreviewHtml(preview);
      setPreviewError('');
    } catch (error) {
      setPreviewError('Error generating preview: ' + error.message);
      setPreviewHtml('');
    }
  };

  // Update preview when template changes (with debounce for better performance)
  useEffect(() => {
    if (createDialog || editDialog) {
      const timeoutId = setTimeout(() => {
        generatePreview(formData.template_html);
      }, 500); // Wait 500ms after user stops typing
      
      return () => clearTimeout(timeoutId);
    }
  }, [formData.template_html, createDialog, editDialog]);

  const fetchFormats = async () => {
    try {
      const response = await api.get('/print-formats');
      setFormats(response.data);
    } catch (error) {
      toast.error('Failed to fetch print formats');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await api.post('/print-formats', formData);
      toast.success('Print format created!');
      setFormData({ name: '', template_html: DEFAULT_TEMPLATE, is_default: false });
      fetchFormats();
      setCreateDialog(false);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create print format');
    }
  };

  const handleEdit = (format) => {
    setEditingFormat(format);
    setFormData({
      name: format.name,
      template_html: format.template_html,
      is_default: format.is_default,
    });
    setEditDialog(true);
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    try {
      await api.put(`/print-formats/${editingFormat.id}`, formData);
      toast.success('Print format updated!');
      setFormData({ name: '', template_html: DEFAULT_TEMPLATE, is_default: false });
      setEditingFormat(null);
      fetchFormats();
      setEditDialog(false);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to update print format');
    }
  };

  const handleDelete = async (formatId) => {
    if (!window.confirm('Are you sure you want to delete this print format?')) return;
    try {
      await api.delete(`/print-formats/${formatId}`);
      toast.success('Print format deleted!');
      fetchFormats();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to delete print format');
    }
  };

  const handlePreview = async (formatId) => {
    try {
      const response = await api.post(`/print-formats/${formatId}/preview`, {}, {
        responseType: 'text'
      });
      // Open preview in new window
      const newWindow = window.open('', '_blank');
      if (newWindow) {
        newWindow.document.write(response.data);
        newWindow.document.close();
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to preview print format');
    }
  };

  const resetToDefault = () => {
    setFormData({ ...formData, template_html: DEFAULT_TEMPLATE });
  };

  if (loading) {
    return <div className="text-zinc-600">Loading...</div>;
  }

  const FormatForm = ({ onSubmit, isEdit = false }) => (
    <div className="grid grid-cols-2 gap-6 h-[80vh]">
      {/* Left Column - Editor */}
      <div className="flex flex-col space-y-4 overflow-hidden">
        <form onSubmit={onSubmit} className="flex flex-col space-y-4 h-full">
          <div className="space-y-2">
            <Label htmlFor="format_name">Format Name</Label>
            <Input
              id="format_name"
              data-testid="format-name-input"
              placeholder="e.g., Company Letterhead Format"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>
          
          <div className="space-y-2 flex-1 flex flex-col min-h-0">
            <div className="flex justify-between items-center">
              <Label htmlFor="template_html">Jinja2 HTML Template</Label>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={resetToDefault}
              >
                <RefreshCw className="h-3 w-3 mr-1" />
                Reset to Default
              </Button>
            </div>
            <Textarea
              id="template_html"
              data-testid="template-html-input"
              placeholder="HTML with Jinja2 variables"
              value={formData.template_html}
              onChange={(e) => setFormData({ ...formData, template_html: e.target.value })}
              className="font-mono text-sm flex-1 min-h-0"
              required
            />
            <p className="text-xs text-zinc-500">
              Available variables: employee_name, employee_id, employee_email, department, month, basic_salary, allowances, deductions, net_pay, generated_date
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="is_default"
              data-testid="is-default-checkbox"
              checked={formData.is_default}
              onChange={(e) => setFormData({ ...formData, is_default: e.target.checked })}
              className="rounded border-zinc-300"
            />
            <Label htmlFor="is_default" className="cursor-pointer">
              Set as default format
            </Label>
          </div>

          <Button type="submit" className="w-full bg-zinc-900 hover:bg-zinc-800" data-testid="submit-format-button">
            {isEdit ? 'Update Format' : 'Create Format'}
          </Button>
        </form>
      </div>

      {/* Right Column - Preview */}
      <div className="flex flex-col space-y-2 overflow-hidden">
        <div className="flex justify-between items-center">
          <Label>Live Preview</Label>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => generatePreview(formData.template_html)}
          >
            <RefreshCw className="h-3 w-3 mr-1" />
            Refresh
          </Button>
        </div>
        <Card className="flex-1 overflow-hidden border-zinc-200">
          <CardContent className="p-0 h-full overflow-auto">
            {previewError ? (
              <div className="p-4 text-red-600 text-sm">
                {previewError}
              </div>
            ) : previewHtml ? (
              <iframe
                srcDoc={previewHtml}
                className="w-full h-full border-0"
                title="HTML Preview"
                sandbox="allow-same-origin"
              />
            ) : (
              <div className="p-8 text-center text-zinc-500">
                <Eye className="h-12 w-12 mx-auto mb-4 text-zinc-400" />
                <p>Preview will appear here as you type</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-semibold text-zinc-900">Print Formats</h2>
          <p className="text-sm text-zinc-600 mt-1">
            Create custom payslip templates with HTML and Jinja2
          </p>
        </div>
        <Dialog open={createDialog} onOpenChange={setCreateDialog}>
          <DialogTrigger asChild>
            <Button className="bg-zinc-900 hover:bg-zinc-800" data-testid="create-format-button">
              <Plus className="h-4 w-4 mr-2" />
              Create Format
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-7xl max-h-[90vh] overflow-hidden">
            <DialogHeader>
              <DialogTitle>Create Print Format</DialogTitle>
              <DialogDescription>
                Design a custom payslip template using HTML and Jinja2 variables
              </DialogDescription>
            </DialogHeader>
            <FormatForm onSubmit={handleCreate} />
          </DialogContent>
        </Dialog>
      </div>

      {/* Edit Dialog */}
      <Dialog open={editDialog} onOpenChange={setEditDialog}>
        <DialogContent className="max-w-7xl max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle>Edit Print Format</DialogTitle>
            <DialogDescription>
              Update your custom payslip template
            </DialogDescription>
          </DialogHeader>
          <FormatForm onSubmit={handleUpdate} isEdit={true} />
        </DialogContent>
      </Dialog>

      {/* Formats List */}
      <div className="grid gap-4">
        {formats.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <FileText className="h-12 w-12 mx-auto text-zinc-400 mb-4" />
              <p className="text-zinc-600">No print formats yet. Create your first format!</p>
            </CardContent>
          </Card>
        ) : (
          formats.map((format) => (
            <Card key={format.id} className="border-zinc-200" data-testid="format-card">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <CardTitle className="text-lg text-zinc-900 flex items-center gap-2">
                      {format.name}
                      {format.is_default && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Default
                        </span>
                      )}
                    </CardTitle>
                    <CardDescription className="mt-1">
                      Created on {new Date(format.created_at).toLocaleDateString()}
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePreview(format.id)}
                      className="border-zinc-300"
                      data-testid="preview-format-button"
                    >
                      <Eye className="h-3 w-3 mr-1" />
                      Preview
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(format)}
                      className="border-zinc-300"
                      data-testid="edit-format-button"
                    >
                      <Edit className="h-3 w-3 mr-1" />
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(format.id)}
                      className="border-zinc-300 text-red-600 hover:text-red-700"
                      data-testid="delete-format-button"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
