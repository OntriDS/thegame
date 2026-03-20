'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/lib/hooks/use-auth';
import { useRouter } from 'next/navigation';

export default function AdminLoginPage() {
  const router = useRouter();
  const { user, isLoading, login } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);

  // Forgot Password state
  const [forgotEmail, setForgotEmail] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [resetStep, setResetStep] = useState<'request' | 'reset'>('request');
  const [isResetting, setIsResetting] = useState(false);

  // Default to email/password login only (passphrase reserved for future auth paths).
  const [showTeamLogin, setShowTeamLogin] = useState(true);
  const [isHandshaking, setIsHandshaking] = useState(false);

  const isActuallyLoading = isLoading || isHandshaking;

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setError(params.get('error'));

    // --- HANDSHAKE LOGIC ---
    const handshakeToken = params.get('handshake');
    if (handshakeToken) {
      handleHandshake(handshakeToken);
    }
    // -----------------------


    // Auto-redirect if already logged in
    if (user && !isLoading) {
      router.push('/admin');
    }
  }, [user, isLoading, router]);

  const handleHandshake = async (token: string) => {
    setIsHandshaking(true);
    try {
      const response = await fetch('/api/auth/handshake', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token })
      });

      if (response.ok) {
        window.location.href = '/admin';
      } else {
        const data = await response.json();
        setError(data.error || 'Handshake failed');
      }
    } catch (err) {
      setError('Handshake synchronization failure');
    } finally {
      setIsHandshaking(false);
    }
  };

  const handlePassphraseLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ passphrase: formData.get('passphrase') })
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(data.error || 'Invalid passphrase');
        return;
      }

      // Perform a full page redirect to ensure session sync
      window.location.href = data.next || '/admin';
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    }
  };

  const handleUsernameLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await login(username, password, rememberMe);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsResetting(true);
    setError(null);

    try {
      const response = await fetch('/api/auth/reset-password-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotEmail })
      });

      const data = await response.json();

      if (data.token) {
        setResetToken(data.token);
        setResetStep('reset');
        setError('Reset token generated! Use it below to set your new password.');
        setTimeout(() => setError(null), 5000);
      } else {
        setError(data.message || 'Reset request failed');
      }
    } catch (err) {
      setError('Failed to request password reset');
    } finally {
      setIsResetting(false);
    }
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsResetting(true);
    setError(null);

    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: resetToken,
          password: newPassword,
          confirmPassword
        })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setError('Password reset successful! You can now login with your new password.');
        setTimeout(() => {
          setShowForgotPassword(false);
          setResetStep('request');
          setForgotEmail('');
          setResetToken('');
          setNewPassword('');
          setConfirmPassword('');
          setError(null);
        }, 3000);
      } else {
        setError(data.error || 'Password reset failed');
      }
    } catch (err) {
      setError('Failed to reset password');
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-background">
      <Card className="w-full max-w-md border-primary/20 shadow-xl overflow-hidden">
        <div className="h-1 bg-primary w-full" />
        <CardHeader className="text-center pb-2">
          <CardTitle className="text-2xl font-bold flex items-center justify-center gap-2">
            <Loader2 className={`h-6 w-6 ${isActuallyLoading ? 'animate-spin text-primary' : 'text-primary/40'}`} />
            TheGame
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-6 pt-4">
          {error && (
            <div className="p-3 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md animate-in fade-in slide-in-from-top-1">
              {error === 'invalid' ? 'Invalid passphrase or credentials' : error}
            </div>
          )}

          {!showTeamLogin ? (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <form onSubmit={handlePassphraseLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="passphrase">Admin Passkey</Label>
                  <Input
                    id="passphrase"
                    name="passphrase"
                    type="password"
                    placeholder=""
                    required
                    autoFocus
                    disabled={isActuallyLoading}
                    className="text-center tracking-[0.5em] text-lg bg-accent/50 border-primary/20 focus:border-primary placeholder:tracking-normal placeholder:opacity-30"
                  />
                  <p className="text-[10px] text-center text-muted-foreground opacity-50 uppercase tracking-widest pt-1">
                    RESTRICTED ACCESS
                  </p>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="remember"
                      name="remember"
                      defaultChecked={true}
                      className="h-4 w-4 rounded border-primary/30 text-primary focus:ring-primary"
                    />
                    <Label htmlFor="remember" className="text-sm cursor-pointer opacity-70">
                      Stay logged in
                    </Label>
                  </div>
                  <Button
                    type="submit"
                    disabled={isActuallyLoading}
                    className="w-32 h-11 bg-primary text-primary-foreground font-semibold hover:shadow-lg transition-all"
                  >
                    {isActuallyLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Login'}
                  </Button>
                </div>
              </form>

              <div className="pt-4 text-center">
                <button
                  type="button"
                  onClick={() => setShowTeamLogin(true)}
                  className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors underline-offset-4 hover:underline"
                >
                  Username/Email Login
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <h3 className="text-sm font-semibold text-muted-foreground">Sign in</h3>
              <div className="pt-1 text-center">
                <button
                  type="button"
                  onClick={() => setShowTeamLogin(false)}
                  className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors underline-offset-4 hover:underline"
                >
                  Use Founder passphrase
                </button>
              </div>

              <form onSubmit={handleUsernameLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="username">Username or Email</Label>
                  <Input
                    id="username"
                    name="username"
                    type="text"
                    placeholder="Enter your username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    disabled={isActuallyLoading}
                    className="bg-accent/30"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder=""
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      disabled={isActuallyLoading}
                      className="bg-accent/30 pr-12"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-0 top-0 h-full px-3 flex items-center justify-center text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showPassword ? 'Hide' : 'Show'}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="rememberMe"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="h-4 w-4 rounded border-primary/30 text-primary focus:ring-primary"
                    />
                    <Label htmlFor="rememberMe" className="text-sm cursor-pointer opacity-70">
                      Remember me
                    </Label>
                  </div>
                  <Button
                    type="submit"
                    variant="outline"
                    disabled={isActuallyLoading}
                    className="w-32 border-primary/50 text-foreground hover:bg-primary/5"
                  >
                    {isActuallyLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Sign In'}
                  </Button>
                </div>
              </form>

              {/* Forgot Password Link */}
              <div className="pt-4 text-center">
                <button
                  type="button"
                  onClick={() => setShowForgotPassword(true)}
                  className="text-sm font-medium text-primary hover:text-primary/80 transition-colors underline-offset-4 hover:underline"
                >
                  Forgot your password?
                </button>
              </div>
            </div>
          )}
        </CardContent>

      </Card>

      {/* Forgot Password Modal */}
      {showForgotPassword && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in">
          <Card className="w-full max-w-md border-primary/20 shadow-xl overflow-hidden">
            <div className="h-1 bg-primary w-full" />
            <CardHeader className="text-center pb-2">
              <CardTitle className="text-2xl font-bold flex items-center justify-center gap-2">
                {isResetting ? <Loader2 className="h-6 w-6 animate-spin text-primary" /> : null}
                {resetStep === 'request' ? 'Forgot Password' : 'Reset Password'}
              </CardTitle>
              <CardDescription className="text-xs">
                {resetStep === 'request'
                  ? 'Enter your email to receive a password reset token'
                  : 'Use the reset token to set your new password'}
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4 pt-4">
              {error && (
                <div className="p-3 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md animate-in fade-in slide-in-from-top-1">
                  {error}
                </div>
              )}

              {resetStep === 'request' ? (
                <form onSubmit={handleForgotPassword} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="forgot-email">Email Address</Label>
                    <Input
                      id="forgot-email"
                      type="email"
                      placeholder="Enter your email"
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      disabled={isResetting}
                      autoComplete="email"
                      className="bg-accent/50"
                      required
                    />
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowForgotPassword(false)}
                      disabled={isResetting}
                      className="w-32"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={isResetting || !forgotEmail}
                      className="w-32 bg-primary text-primary-foreground font-semibold"
                    >
                      {isResetting ? 'Sending...' : 'Get Token'}
                    </Button>
                  </div>
                </form>
              ) : (
                <form onSubmit={handlePasswordReset} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="reset-token">Reset Token</Label>
                    <Input
                      id="reset-token"
                      type="text"
                      placeholder="Paste reset token here"
                      value={resetToken}
                      onChange={(e) => setResetToken(e.target.value)}
                      disabled={isResetting}
                      autoComplete="one-time-code"
                      className="bg-accent/50 font-mono"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="new-password">New Password</Label>
                    <Input
                      id="new-password"
                      type="password"
                      placeholder="Enter new password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      disabled={isResetting}
                      autoComplete="new-password"
                      className="bg-accent/50"
                      minLength={6}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirm-password">Confirm New Password</Label>
                    <Input
                      id="confirm-password"
                      type="password"
                      placeholder="Confirm new password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      disabled={isResetting}
                      autoComplete="new-password"
                      className="bg-accent/50"
                      minLength={6}
                      required
                    />
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setResetStep('request');
                        setResetToken('');
                        setNewPassword('');
                        setConfirmPassword('');
                      }}
                      disabled={isResetting}
                      className="w-32"
                    >
                      Back
                    </Button>
                    <Button
                      type="submit"
                      disabled={isResetting || !resetToken || !newPassword || !confirmPassword}
                      className="w-32 bg-primary text-primary-foreground font-semibold"
                    >
                      {isResetting ? 'Resetting...' : 'Reset Password'}
                    </Button>
                  </div>
                </form>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
