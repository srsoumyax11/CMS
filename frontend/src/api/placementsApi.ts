import { client } from './client';
import type {
  APIResponse,
  PlacementNoticeResponse,
  PlacementNoticeListResponse,
  PlacementNoticeCreateRequest,
  PlacementNoticeUpdateRequest,
  PlacementApplicationResponse,
  PlacementApplicationListResponse,
  PlacementApplicationCreateRequest,
  PlacementApplicationStatusUpdateRequest,
} from '@/types/api';

export const placementsApi = {
  // ── Placement Notices (Drives) ──
  listNotices: (publishedOnly: boolean = true, skip: number = 0, limit: number = 100) =>
    client.get<APIResponse<PlacementNoticeListResponse>>('/api/placements/notices', {
      params: { published_only: publishedOnly, skip, limit },
    }),

  getNotice: (noticeId: string) =>
    client.get<APIResponse<PlacementNoticeResponse>>(`/api/placements/notices/${noticeId}`),

  createNotice: (data: PlacementNoticeCreateRequest) =>
    client.post<APIResponse<PlacementNoticeResponse>>('/api/placements/notices', data),

  updateNotice: (noticeId: string, data: PlacementNoticeUpdateRequest) =>
    client.put<APIResponse<PlacementNoticeResponse>>(`/api/placements/notices/${noticeId}`, data),

  // ── Applications ──
  applyForDrive: (noticeId: string, data: PlacementApplicationCreateRequest) =>
    client.post<APIResponse<PlacementApplicationResponse>>(
      `/api/placements/notices/${noticeId}/apply`,
      data
    ),

  listNoticeApplications: (noticeId: string, skip: number = 0, limit: number = 100) =>
    client.get<APIResponse<PlacementApplicationListResponse>>(
      `/api/placements/notices/${noticeId}/applications`,
      { params: { skip, limit } }
    ),

  getMyApplications: (skip: number = 0, limit: number = 100) =>
    client.get<APIResponse<PlacementApplicationListResponse>>(
      '/api/placements/applications/mine',
      { params: { skip, limit } }
    ),

  updateApplicationStatus: (
    applicationId: string,
    data: PlacementApplicationStatusUpdateRequest
  ) =>
    client.put<APIResponse<PlacementApplicationResponse>>(
      `/api/placements/applications/${applicationId}/status`,
      data
    ),
};
