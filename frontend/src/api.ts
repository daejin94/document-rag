import type {
  ChatMessage,
  ChatSession,
  DocumentDetail,
  DocumentItem,
  LoginResponse,
  Project,
  ProjectMember,
  ProjectRole,
  QueryResponse,
  SignupResponse,
} from './types';

const API_BASE = '';

async function request<T>(path: string, options: RequestInit = {}, token?: string): Promise<T> {
  const headers = new Headers(options.headers);
  if (!(options.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(`${API_BASE}${path}`, { ...options, headers });
  if (!response.ok) {
    let message = `HTTP ${response.status}`;
    try {
      const body = await response.json();
      message = body.message || message;
    } catch {
      message = response.statusText || message;
    }
    throw new Error(message);
  }
  return response.json() as Promise<T>;
}

export function login(email: string, password: string) {
  return request<LoginResponse>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export function signup(email: string, password: string, name: string) {
  return request<SignupResponse>('/api/auth/signup', {
    method: 'POST',
    body: JSON.stringify({ email, password, name }),
  });
}

export function fetchProjects(token: string) {
  return request<Project[]>('/api/projects', {}, token);
}

export function createProject(token: string, name: string) {
  return request<Project>('/api/projects', {
    method: 'POST',
    body: JSON.stringify({ name }),
  }, token);
}

export function fetchProjectMembers(token: string, projectId: number) {
  return request<ProjectMember[]>(`/api/projects/${projectId}/members`, {}, token);
}

export function addProjectMember(token: string, projectId: number, email: string, role: ProjectRole) {
  return request<ProjectMember>(`/api/projects/${projectId}/members`, {
    method: 'POST',
    body: JSON.stringify({ email, role }),
  }, token);
}

export function deleteProjectMember(token: string, projectId: number, memberUserId: number) {
  return request<{ deleted: boolean }>(`/api/projects/${projectId}/members/${memberUserId}`, { method: 'DELETE' }, token);
}

export function fetchDocuments(token: string, projectId: number) {
  return request<DocumentItem[]>(`/api/projects/${projectId}/documents`, {}, token);
}

export function fetchDocumentDetail(token: string, projectId: number, documentId: number) {
  return request<DocumentDetail>(`/api/projects/${projectId}/documents/${documentId}`, {}, token);
}

export function uploadDocument(token: string, projectId: number, title: string, file: File) {
  const formData = new FormData();
  formData.append('title', title);
  formData.append('file', file);
  return request<{ documentId: number; title: string; status: string }>(`/api/projects/${projectId}/documents`, { method: 'POST', body: formData }, token);
}

export function deleteDocument(token: string, projectId: number, documentId: number) {
  return request<{ deleted: boolean }>(`/api/projects/${projectId}/documents/${documentId}`, { method: 'DELETE' }, token);
}

export function queryDocuments(token: string, question: string, projectId: number, documentIds: number[], sessionId?: number) {
  return request<QueryResponse>(`/api/projects/${projectId}/chat/query`, {
    method: 'POST',
    body: JSON.stringify({ question, documentIds, sessionId }),
  }, token);
}

export function fetchSessions(token: string, projectId: number) {
  return request<ChatSession[]>(`/api/projects/${projectId}/chat/sessions`, {}, token);
}

export function fetchMessages(token: string, projectId: number, sessionId: number) {
  return request<ChatMessage[]>(`/api/projects/${projectId}/chat/sessions/${sessionId}/messages`, {}, token);
}
