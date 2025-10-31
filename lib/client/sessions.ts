import { ClientAPI } from './client-api';

export async function getSessions() {
  return await ClientAPI.getSessions();
}

export async function createSession(model?: string) {
  return await ClientAPI.createSession(model);
}

export async function setActiveSession(sessionId: string) {
  return await ClientAPI.setActiveSession(sessionId);
}

export async function clearActiveSession() {
  const res = await fetch('/api/ai/sessions', { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to clear active session');
  return await res.json();
}



