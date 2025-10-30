export async function getSessions(): Promise<any> {
  const res = await fetch('/api/ai/sessions', { cache: 'no-store' });
  if (!res.ok) throw new Error('Failed to load sessions');
  return await res.json();
}

export async function createSession(): Promise<any> {
  const res = await fetch('/api/ai/sessions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'create' })
  });
  if (!res.ok) throw new Error('Failed to create session');
  return await res.json();
}

export async function setActiveSession(sessionId: string): Promise<any> {
  const res = await fetch('/api/ai/sessions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'set-active', sessionId })
  });
  if (!res.ok) throw new Error('Failed to set active session');
  return await res.json();
}

export async function clearActiveSession(): Promise<any> {
  const res = await fetch('/api/ai/sessions', { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to clear active session');
  return await res.json();
}



