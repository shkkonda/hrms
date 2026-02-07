import { useState } from 'react';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Users, DollarSign, Calendar, LogOut, Building2, FileText, Sparkles } from 'lucide-react';
import EmployeeManagement from '../components/admin/EmployeeManagement';
import PayrollManagement from '../components/admin/PayrollManagement';
import LeaveManagement from '../components/admin/LeaveManagement';
import DepartmentManagement from '../components/admin/DepartmentManagement';
import PrintFormatManagement from '../components/admin/PrintFormatManagement';
import HolidayManagement from '../components/admin/HolidayManagement';

export default function AdminDashboard({ user, onLogout }) {
  const location = useLocation();
  const currentPath = location.pathname;

  const menuItems = [
    { path: '/admin/departments', label: 'Departments', icon: Building2 },
    { path: '/admin/employees', label: 'Employees', icon: Users },
    { path: '/admin/payroll', label: 'Payroll', icon: DollarSign },
    { path: '/admin/leaves', label: 'Leave Management', icon: Calendar },
    { path: '/admin/holidays', label: 'Holidays', icon: Sparkles },
    { path: '/admin/print-formats', label: 'Print Formats', icon: FileText },
  ];

  return (
    <div className="min-h-screen bg-zinc-50">
      {/* Header */}
      <header className="bg-white border-b border-zinc-200">
        <div className="mx-auto px-6 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-xl font-semibold text-zinc-900">HR Management</h1>
            <p className="text-sm text-zinc-600">Admin Dashboard</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm font-medium text-zinc-900">{user.full_name}</p>
              <p className="text-xs text-zinc-600 capitalize">{user.role}</p>
            </div>
            <Button
              onClick={onLogout}
              variant="outline"
              size="sm"
              className="border-zinc-300"
              data-testid="logout-button"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside className="w-64 bg-white border-r border-zinc-200 min-h-[calc(100vh-73px)]">
          <nav className="p-4 space-y-2">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentPath.startsWith(item.path);
              return (
                <Link key={item.path} to={item.path}>
                  <div
                    className={`flex items-center gap-3 px-4 py-2.5 rounded-md transition-colors ${
                      isActive
                        ? 'bg-zinc-900 text-white'
                        : 'text-zinc-700 hover:bg-zinc-100'
                    }`}
                    data-testid={`nav-${item.label.toLowerCase().replace(' ', '-')}`}
                  >
                    <Icon className="h-5 w-5" />
                    <span className="text-sm font-medium">{item.label}</span>
                  </div>
                </Link>
              );
            })}
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-6">
          <Routes>
            <Route path="/" element={<DepartmentManagement />} />
            <Route path="/departments" element={<DepartmentManagement />} />
            <Route path="/employees" element={<EmployeeManagement />} />
            <Route path="/payroll" element={<PayrollManagement />} />
            <Route path="/leaves" element={<LeaveManagement />} />
            <Route path="/holidays" element={<HolidayManagement />} />
            <Route path="/print-formats" element={<PrintFormatManagement />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}
