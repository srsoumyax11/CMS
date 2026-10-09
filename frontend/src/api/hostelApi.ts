import { client } from './client';
import type { APIResponse } from '@/types/api';

export interface HostelData {
  id: string;
  name: string;
  warden_user_id?: string | null;
  capacity?: number | null;
  status: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface HostelRoomData {
  id: string;
  hostel_id: string;
  room_number: string;
  capacity: number;
  current_occupancy: number;
  status: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface StudentHostelAllocationData {
  hostel_id?: string | null;
  building_name?: string | null;
  room_number?: string | null;
  room_capacity?: number;
  occupied_count?: number;
  status?: string;
  allocated_at?: string | null;
  warden_name?: string | null;
  warden_email?: string | null;
}

export interface RoomAllocationPayload {
  student_user_id: string;
  hostel_id: string;
  room_number: string;
}

export interface RoomAllocationResult {
  success: boolean;
  message: string;
  student_user_id: string;
  hostel_id: string;
  room_number: string;
}

export const hostelApi = {
  listHostels: async (skip = 0, limit = 100) => {
    const res = await client.get<APIResponse<{ total: number; items: HostelData[] }>>('/api/hostels/', {
      params: { skip, limit },
    });
    return res.data;
  },

  createHostel: async (data: { name: string; warden_user_id?: string | null; capacity?: number | null }) => {
    const res = await client.post<APIResponse<HostelData>>('/api/hostels/', data);
    return res.data;
  },

  listRooms: async (hostelId: string, skip = 0, limit = 100) => {
    const res = await client.get<APIResponse<{ total: number; items: HostelRoomData[] }>>(`/api/hostels/${hostelId}/rooms`, {
      params: { skip, limit },
    });
    return res.data;
  },

  createRoom: async (hostelId: string, data: { room_number: string; capacity?: number }) => {
    const res = await client.post<APIResponse<HostelRoomData>>(`/api/hostels/${hostelId}/rooms`, data);
    return res.data;
  },

  allocateRoom: async (payload: RoomAllocationPayload) => {
    const res = await client.post<APIResponse<RoomAllocationResult>>('/api/hostels/allocate', payload);
    return res.data;
  },

  deallocateRoom: async (studentUserId: string) => {
    const res = await client.post<APIResponse<{ message: string }>>(`/api/hostels/deallocate/${studentUserId}`);
    return res.data;
  },

  getMyAllocation: async () => {
    const res = await client.get<APIResponse<StudentHostelAllocationData | null>>('/api/hostels/mine');
    return res.data;
  },
};
