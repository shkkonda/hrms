import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import api from '../lib/api';

export default function Login({ onLogin }) {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    full_name: '',
    role: 'employee',
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const endpoint = isLogin ? '/auth/login' : '/auth/register';
      const payload = isLogin
        ? { email: formData.email, password: formData.password }
        : formData;

      const response = await api.post(endpoint, payload);
      onLogin(response.data.user, response.data.access_token, response.data.refresh_token);
      toast.success(isLogin ? 'Login successful!' : 'Registration successful!');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 p-4">
      <Card className="w-full max-w-md border-zinc-200" data-testid="login-card">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-semibold text-zinc-900">
            {isLogin ? 'Sign In' : 'Create Account'}
          </CardTitle>
          <CardDescription className="text-zinc-600">
            {isLogin
              ? 'Enter your credentials to access your account'
              : 'Fill in your details to create a new account'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div className="space-y-2">
                <Label htmlFor="full_name" className="text-zinc-700">
                  Full Name
                </Label>
                <Input
                  id="full_name"
                  data-testid="full-name-input"
                  placeholder="John Doe"
                  value={formData.full_name}
                  onChange={(e) =>
                    setFormData({ ...formData, full_name: e.target.value })
                  }
                  required
                  className="border-zinc-300"
                />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email" className="text-zinc-700">
                Email
              </Label>
              <Input
                id="email"
                data-testid="email-input"
                type="email"
                placeholder="your@email.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
                className="border-zinc-300"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-zinc-700">
                Password
              </Label>
              <Input
                id="password"
                data-testid="password-input"
                type="password"
                placeholder="••••••••"
                value={formData.password}
                onChange={(e) =>
                  setFormData({ ...formData, password: e.target.value })
                }
                required
                className="border-zinc-300"
              />
            </div>
            {!isLogin && (
              <div className="space-y-2">
                <Label htmlFor="role" className="text-zinc-700">
                  Role
                </Label>
                <select
                  id="role"
                  data-testid="role-select"
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className="w-full px-3 py-2 border border-zinc-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
                >
                  <option value="employee">Employee</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
            )}
            <Button
              type="submit"
              data-testid="submit-button"
              className="w-full bg-zinc-900 hover:bg-zinc-800 text-white"
              disabled={loading}
            >
              {loading ? 'Please wait...' : isLogin ? 'Sign In' : 'Create Account'}
            </Button>
          </form>
          <div className="mt-4 text-center text-sm">
            <button
              type="button"
              onClick={() => setIsLogin(!isLogin)}
              className="text-zinc-700 hover:text-zinc-900 underline"
              data-testid="toggle-auth-mode"
            >
              {isLogin
                ? "Don't have an account? Sign up"
                : 'Already have an account? Sign in'}
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
