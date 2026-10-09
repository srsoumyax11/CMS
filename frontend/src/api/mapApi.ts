import { client } from './client';
import {
  APIResponse,
  MapLocationResponse,
  MapLocationListResponse,
  MapLocationCreateRequest,
  MapLocationUpdateRequest,
  MapPathResponse,
  MapPathCreateRequest,
  RouteResponse,
  LocationType,
} from '../types/api';

export const mapApi = {
  listLocations: async (params?: {
    q?: string;
    location_type?: LocationType;
    floor?: number;
    parent_id?: string;
    skip?: number;
    limit?: number;
  }) => {
    const res = await client.get<APIResponse<MapLocationListResponse>>('/map/locations', { params });
    return res.data;
  },

  getLocation: async (id: string) => {
    const res = await client.get<APIResponse<MapLocationResponse>>(`/map/locations/${id}`);
    return res.data;
  },

  createLocation: async (data: MapLocationCreateRequest) => {
    const res = await client.post<APIResponse<MapLocationResponse>>('/map/locations', data);
    return res.data;
  },

  updateLocation: async (id: string, data: MapLocationUpdateRequest) => {
    const res = await client.put<APIResponse<MapLocationResponse>>(`/map/locations/${id}`, data);
    return res.data;
  },

  deleteLocation: async (id: string) => {
    const res = await client.delete<APIResponse<boolean>>(`/map/locations/${id}`);
    return res.data;
  },

  createPath: async (data: MapPathCreateRequest) => {
    const res = await client.post<APIResponse<MapPathResponse>>('/map/paths', data);
    return res.data;
  },

  deletePath: async (id: string) => {
    const res = await client.delete<APIResponse<boolean>>(`/map/paths/${id}`);
    return res.data;
  },

  calculateRoute: async (fromLocationId: string, toLocationId: string) => {
    const res = await client.get<APIResponse<RouteResponse>>('/map/route', {
      params: {
        from_location_id: fromLocationId,
        to_location_id: toLocationId,
      },
    });
    return res.data;
  },
};

