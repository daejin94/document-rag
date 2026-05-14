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
}
