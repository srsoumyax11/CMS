import { client } from './client';
import type { APIResponse, FeeDue } from '@/types/api';

export const financeApi = {
  listMyFees: () =>
    client.get<APIResponse<FeeDue[]>>('/api/finance/mine'),
};
