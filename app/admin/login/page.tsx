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
  const [playerId, setPlayerId] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);

  const [showTeamLogin, setShowTeamLogin] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setError(params.get('error'));

    // Load saved Player ID
    const savedPlayerId = localStorage.getItem('last_player_id');
    if (savedPlayerId) {
      setPlayerId(savedPlayerId);
    }

    // Auto-redirect if already logged in
    if (user && !isLoading) {
      router.push('/admin');
    }
  }, [user, isLoading, router]);

  const handlePassphraseLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);

    try {
      const response = await fetch('/api/auth/passphrase-login', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        setError(errorData.error || 'Invalid passphrase');
        return;
      }

      // Save Player ID if "Stay logged in" is checked
      if (formData.get('remember') === 'on') {
        localStorage.setItem('last_player_id', playerId);
      } else {
        localStorage.removeItem('last_player_id');
      }

      // Success! Refresh auth state and redirect
      await login(null, null, false);
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

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-background">
      <Card className="w-full max-w-md border-primary/20 shadow-xl overflow-hidden">
        <div className="h-1 bg-primary w-full" />
        <CardHeader className="text-center pb-2">
          <CardTitle className="text-2xl font-bold flex items-center justify-center gap-2">
            <Loader2 className={`h-6 w-6 ${isLoading ? 'animate-spin text-primary' : 'text-primary/40'}`} />
            TheGame Login
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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="playerId">Player ID</Label>
                    <Input
                      id="playerId"
                      name="playerId"
                      type="text"
                      placeholder="e.g. player-one"
                      value={playerId}
                      onChange={(e) => setPlayerId(e.target.value)}
                      required
                      autoFocus={!playerId}
                      disabled={isLoading}
                      className="bg-accent/50 border-primary/20 focus:border-primary"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="passphrase">Passphrase</Label>
                    <Input
                      id="passphrase"
                      name="passphrase"
                      type="password"
                      placeholder=""
                      required
                      autoFocus={!!playerId}
                      disabled={isLoading}
                      className="text-center tracking-widest bg-accent/50 border-primary/20 focus:border-primary"
                    />
                  </div>
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
                    disabled={isLoading}
                    className="w-32 h-11 bg-primary text-primary-foreground font-semibold hover:shadow-lg transition-all"
                  >
                    {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Enter System'}
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
              <div className="flex items-center gap-2 mb-2">
                <button
                  onClick={() => setShowTeamLogin(false)}
                  className="text-xs p-1 hover:bg-accent rounded"
                >
                  ← Back
                </button>
                <h3 className="text-sm font-semibold text-muted-foreground">Team Member Login</h3>
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
                    disabled={isLoading}
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
                      disabled={isLoading}
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
                    disabled={isLoading}
                    className="w-32 border-primary/50 text-foreground hover:bg-primary/5"
                  >
                    {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Sign In'}
                  </Button>
                </div>
              </form>
            </div>
          )}
        </CardContent>

      </Card>
    </div>
  );
}
