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
import { Plus, Calendar, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import api from '../../lib/api';

export default function HolidayManagement() {
  const [holidays, setHolidays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({ date: '', name: '' });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchHolidays();
  }, []);

  const fetchHolidays = async () => {
    try {
      const res = await api.get('/holidays');
      setHolidays(res.data);
    } catch {
      toast.error('Failed to fetch holidays');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;
    
    // Check for duplicate date
    const duplicateExists = holidays.some(
      holiday => holiday.date === formData.date
    );
    
    if (duplicateExists) {
      toast.error('A holiday with this date already exists.');
      return;
    }
    
    setSubmitting(true);
    try {
      await api.post('/holidays', formData);
      toast.success('Holiday created');
      setFormData({ date: '', name: '' });
      setOpen(false);
      fetchHolidays();
    } catch (error) {
      const errorMessage = error.response?.data?.detail || 'Operation failed';
      toast.error(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (holidayId) => {
    if (!window.confirm('Are you sure you want to delete this holiday?')) return;
    try {
      await api.delete(`/holidays/${holidayId}`);
      toast.success('Holiday deleted');
      fetchHolidays();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Delete failed');
    }
  };

  const handleBulkAdd2026 = async () => {
    if (!window.confirm('This will add all 2026 holidays. Continue?')) return;
    
    const holidays2026 = [
      { date: '2026-01-01', name: 'New Year' },
      { date: '2026-01-14', name: 'Pongal/Makar Sankranthi' },
      { date: '2026-01-26', name: 'Republic Day' },
      { date: '2026-03-04', name: 'Holi' },
      { date: '2026-03-19', name: 'Ugadi' },
      { date: '2026-03-20', name: 'Ramzan(id-ul-Fitr)' },
      { date: '2026-04-03', name: 'Good Friday' },
      { date: '2026-05-01', name: 'May Day' },
      { date: '2026-09-14', name: 'Ganesh Chaturthi' },
      { date: '2026-10-02', name: 'Gandhi Jayanthi' },
      { date: '2026-10-20', name: 'Dussehra' },
      { date: '2026-11-09', name: 'Diwali' },
      { date: '2026-12-25', name: 'Christmas' },
    ];
    
    try {
      await api.post('/holidays/bulk', holidays2026);
      toast.success('2026 holidays added successfully');
      fetchHolidays();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to add holidays');
    }
  };

  if (loading) {
    return <div className="text-zinc-600">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-semibold text-zinc-900">Holiday Management</h2>
          <p className="text-sm text-zinc-600 mt-1">Manage company holidays</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleBulkAdd2026}
            className="border-zinc-300"
          >
            Add 2026 Holidays
          </Button>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="bg-zinc-900">
                <Plus className="h-4 w-4 mr-2" /> Create Holiday
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Holiday</DialogTitle>
                <DialogDescription>Add a new company holiday</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label>Date</Label>
                  <Input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label>Name</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., New Year"
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={submitting}>
                  {submitting ? 'Creating...' : 'Create Holiday'}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {holidays.length === 0 ? (
          <Card className="col-span-full">
            <CardContent className="py-12 text-center">
              <Calendar className="h-12 w-12 mx-auto text-zinc-400 mb-4" />
              <p className="text-zinc-600">No holidays added yet.</p>
              <p className="text-sm text-zinc-500 mt-2">
                Click "Add 2026 Holidays" to add the default holiday list.
              </p>
            </CardContent>
          </Card>
        ) : (
          holidays.map((holiday) => (
            <Card key={holiday.id}>
              <CardHeader>
                <CardTitle className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    {holiday.name}
                  </div>
                  <Button
                    size="icon"
                    variant="outline"
                    onClick={() => handleDelete(holiday.id)}
                  >
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </CardTitle>
                <CardDescription>
                  {new Date(holiday.date).toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </CardDescription>
              </CardHeader>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
