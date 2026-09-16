import { client } from './client';
import { API_ROUTES } from '@/lib/constants';
import type {
  APIResponse,
  UserResponse,
  LoginRequest,
  TokenResponse,
  RefreshTokenRequest,
  RefreshTokenResponse,
  RegisterRequest,
  RegisterResponseData,
  NameUpdateRequest,
  PasswordChangeRequest,
} from '@/types/api';

export const authApi = {
  login: (data: LoginRequest) =>
    client.post<APIResponse<TokenResponse>>(API_ROUTES.LOGIN, data),

  refresh: (data: RefreshTokenRequest) =>
    client.post<APIResponse<RefreshTokenResponse>>(API_ROUTES.REFRESH, data),

  me: () => client.get<APIResponse<UserResponse>>(API_ROUTES.ME),

  register: (data: RegisterRequest) =>
    client.post<APIResponse<RegisterResponseData>>(API_ROUTES.REGISTER, data),

  uploadPhoto: (file: File) => {
    const formData = new FormData();
    formData.append('photo', file);
    return client.post<APIResponse<{ photo_url: string }>>(
      API_ROUTES.UPLOAD_PHOTO,
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    );
  },

  updateName: (data: NameUpdateRequest) =>
    client.patch<APIResponse<{ name: string }>>(API_ROUTES.UPDATE_NAME, data),

  changePassword: (data: PasswordChangeRequest) =>
    client.post<APIResponse<{ message: string }>>(API_ROUTES.CHANGE_PASSWORD, data),
};
