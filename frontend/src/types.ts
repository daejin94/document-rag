export type DocumentStatus = 'UPLOADED' | 'PROCESSING' | 'COMPLETED' | 'FAILED';

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
}

export interface SignupResponse {
  userId: number;
  email: string;
  name: string;
}

export type ProjectRole = 'ADMIN' | 'MEMBER';

export interface Project {
  projectId: number;
  name: string;
  role: ProjectRole;
  createdAt: string;
}

export interface ProjectMember {
  userId: number;
  email: string;
  name: string;
  role: ProjectRole;
  joinedAt: string;
}

export interface DocumentItem {
  documentId: number;
  title: string;
  originalFileName: string;
  status: DocumentStatus;
  createdAt: string;
}

export interface DocumentDetail extends DocumentItem {
  chunkCount: number;
}

export interface Source {
  documentId: number;
  documentTitle: string;
  chunkId: number;
  chunkIndex: number;
  similarity: number;
  contentPreview: string;
}

export interface QueryResponse {
  sessionId: number;
  answer: string;
  sources: Source[];
  model: {
    chatModel: string;
    embeddingModel: string;
  };
  usage: {
    promptTokens: number;
    completionTokens: number;
  };
}

export interface ChatSession {
  sessionId: number;
  title: string;
  createdAt: string;
  updatedAt: string;
}

export type MessageRole = 'USER' | 'ASSISTANT';

export interface ChatMessage {
  role: MessageRole;
  content: string;
  sources: Source[];
  createdAt: string;
}
