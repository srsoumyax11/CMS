import { client } from './client';
import type { APIResponse, HostelAllocation } from '@/types/api';

export interface HostelAllocationCreateData {
  student_id: string;
  room_id: string;
}

export const hostelApi = {
  getMyAllocation: () =>
    client.get<APIResponse<HostelAllocation>>('/api/hostel/mine'),

  listAllocations: () =>
    client.get<APIResponse<HostelAllocation[]>>('/api/hostel/allocations'),

  allocateRoom: (data: HostelAllocationCreateData) =>
    client.post<APIResponse<HostelAllocation>>('/api/hostel/allocations', data),

  vacateRoom: (allocationId: string) =>
    client.patch<APIResponse<HostelAllocation>>(`/api/hostel/allocations/${allocationId}/vacate`),
};
