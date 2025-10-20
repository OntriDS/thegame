'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Eye, EyeOff } from 'lucide-react';

export default function AdminLoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [nextParam, setNextParam] = useState('/admin');
  const [error, setError] = useState<string | null>(null);

  // Get search params on client side
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setNextParam(params.get('next') ?? '/admin');
    setError(params.get('error'));
  }, []);

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Access required</CardTitle>
        </CardHeader>
        <CardContent>
          {error === 'invalid' ? (
            <p className="mb-3 text-sm text-destructive">Invalid passphrase. Try again.</p>
          ) : null}
          {error === 'config' ? (
            <p className="mb-3 text-sm text-destructive">Server configuration missing. Set ADMIN_ACCESS_KEY and ADMIN_SESSION_SECRET.</p>
          ) : null}

          <form action="/admin/login/submit" method="POST" className="space-y-4">
            <input type="hidden" name="next" value={nextParam} />
            <div className="space-y-2">
              <Label htmlFor="passphrase">Passphrase</Label>
              <div className="relative">
                <Input 
                  id="passphrase" 
                  name="passphrase" 
                  type={showPassword ? "text" : "password"} 
                  required 
                  autoFocus 
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={togglePasswordVisibility}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input id="remember" name="remember" type="checkbox" defaultChecked />
              <Label htmlFor="remember">Remember me</Label>
            </div>
            <Button type="submit" className="w-full">Continue</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}


