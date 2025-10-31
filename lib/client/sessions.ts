import { ClientAPI } from '@/lib/client-api';

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
  return await ClientAPI.clearActiveSession();
}



