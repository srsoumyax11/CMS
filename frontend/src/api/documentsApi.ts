import { client } from './client';
import type { APIResponse, DocumentRequest, PaginationParams } from '@/types/api';

export interface DocumentCreateRequest {
  document_type: string;
  reason: string;
}

export const documentsApi = {
  // Student specific endpoints
  listMyRequests: (params?: PaginationParams) =>
    client.get<APIResponse<{total: number; items: DocumentRequest[]}>>('/api/documents/my', { params }),

  createRequest: (data: DocumentCreateRequest) =>
    client.post<APIResponse<DocumentRequest>>('/api/documents', data),
};
