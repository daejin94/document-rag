export type DocumentStatus = 'UPLOADED' | 'PROCESSING' | 'COMPLETED' | 'FAILED';

// 답변의 문서 의존도. STRICT=문서 Context만, HYBRID=문서 우선 + 부족분 AI 일반 지식 보충.
export type AnswerMode = 'STRICT' | 'HYBRID';

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
}

export interface SignupResponse {
  userId: number;
  email: string;
  name: string;
}

export interface TelegramLinkCode {
  code: string;
  expiresAt: string;
}

export interface TelegramBot {
  id: number;
  botUsername: string;
  maskedToken: string;
  createdAt: string;
}

export type ProjectRole = 'ADMIN' | 'MEMBER';

export type UserRole = 'USER' | 'SUPER_ADMIN';

export type UserStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface DailyUsage {
  date: string;
  chatPromptTokens: number;
  chatCompletionTokens: number;
  embeddingTokens: number;
  totalTokens: number;
}

export interface AdminUser {
  userId: number;
  email: string;
  name: string;
  role: UserRole;
  status: UserStatus;
  createdAt: string;
  totalTokens: number;
}

export interface AdminProjectMember {
  userId: number;
  email: string;
  name: string;
  role: ProjectRole;
}

export interface AdminProject {
  projectId: number;
  name: string;
  description: string | null;
  createdAt: string;
  createdByEmail: string;
  members: AdminProjectMember[];
  totalTokens: number;
}

export interface Project {
  projectId: number;
  name: string;
  description: string | null;
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
