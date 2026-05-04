import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { UserRole } from '../types';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { UtensilsCrossed, ChefHat, UserCircle, Settings } from 'lucide-react';
import { ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import React from "react";
export function Login() {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [selectedRole, setSelectedRole] = useState<UserRole>('server');
  const [isLoading, setIsLoading] = useState(false);
  const authBaseUrl = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env?.VITE_AUTH_BASE_URL ?? 'https://auth-service-606057767170.asia-southeast1.run.app';

  const roles = [
    {
      value: 'server' as UserRole,
      label: 'Server',
      labelVi: 'Nhân viên phục vụ',
      icon: UserCircle,
      color: 'blue',
      description: 'Tạo và quản lý đơn hàng',
    },
    {
      value: 'chef' as UserRole,
      label: 'Chef',
      labelVi: 'Đầu bếp',
      icon: ChefHat,
      color: 'orange',
      description: 'Xử lý đơn hàng trong bếp',
    },
    {
      value: 'manager' as UserRole,
      label: 'Manager',
      labelVi: 'Quản lý',
      icon: Settings,
      color: 'purple',
      description: 'Quản lý menu và hệ thống',
    },
  ];

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!username || !password) {
      toast.error('Vui lòng nhập đầy đủ thông tin');
      return;
    }

    setIsLoading(true);

    try {
      const success = await login(username, password, selectedRole);
      if (success) {
        toast.success(`Đăng nhập thành công với vai trò ${roles.find(r => r.value === selectedRole)?.labelVi}`);
      } else {
        toast.error('Đăng nhập thất bại');
      }
    } catch (error) {
      toast.error('Có lỗi xảy ra');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-slate-50 to-slate-100">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="space-y-3 text-center">
          <div className="flex justify-center">
            <div className="p-3 bg-primary/10 rounded-full">
              <UtensilsCrossed className="h-12 w-12 text-primary" />
            </div>
          </div>
          <CardTitle className="text-3xl">IRMS</CardTitle>
          <CardDescription className="text-base">
            Intelligent Restaurant Management System
          </CardDescription>
        </CardHeader>

        <CardContent>
          <div className="mb-4 rounded-lg border bg-slate-50 p-3 text-xs text-slate-600">
            <div className="flex items-center gap-2 font-medium text-slate-800">
              <ShieldCheck className="h-4 w-4" />
              Auth backend đang kết nối
            </div>
            <p className="mt-1 break-all">{authBaseUrl}</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-6">
            {/* Role Selection */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Vai trò / Role</Label>
              <div className="grid grid-cols-3 gap-2">
                {roles.map((role) => {
                  const Icon = role.icon;
                  const isSelected = selectedRole === role.value;

                  return (
                    <button
                      key={role.value}
                      type="button"
                      onClick={() => setSelectedRole(role.value)}
                      className={`
                        p-3 rounded-lg border-2 transition-all
                        ${isSelected
                          ? 'border-primary bg-primary/10 shadow-sm'
                          : 'border-border hover:border-primary/50 hover:bg-slate-50'
                        }
                      `}
                    >
                      <Icon className={`h-6 w-6 mx-auto mb-1 ${isSelected ? 'text-primary' : 'text-muted-foreground'}`} />
                      <div className={`text-xs font-medium ${isSelected ? 'text-primary' : 'text-muted-foreground'}`}>
                        {role.label}
                      </div>
                    </button>
                  );
                })}
              </div>
              <p className="text-xs text-muted-foreground text-center">
                {roles.find(r => r.value === selectedRole)?.description}
              </p>
            </div>

            {/* Username */}
            <div className="space-y-2">
              <Label htmlFor="username">Tên đăng nhập / Username</Label>
              <Input
                id="username"
                type="text"
                placeholder="Nhập tên đăng nhập"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={isLoading}
                autoComplete="username"
              />
            </div>

            {/* Password */}
            <div className="space-y-2">
              <Label htmlFor="password">Mật khẩu / Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Nhập mật khẩu"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
                autoComplete="current-password"
              />
            </div>

            {/* Remember me */}
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="remember"
                className="rounded border-gray-300"
              />
              <Label htmlFor="remember" className="text-sm font-normal cursor-pointer">
                Ghi nhớ đăng nhập
              </Label>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              className="w-full"
              size="lg"
              disabled={isLoading}
            >
              {isLoading ? 'Đang đăng nhập...' : 'Đăng nhập'}
            </Button>
          </form>

          {/* Demo Credentials */}
          <div className="mt-6 p-3 bg-slate-50 rounded-lg border">
            <p className="text-xs font-medium text-slate-700 mb-2">Demo Credentials:</p>
            <p className="text-xs text-slate-600">Username: <span className="font-mono">demo</span></p>
            <p className="text-xs text-slate-600">Password: <span className="font-mono">demo</span></p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
