import { useQuery } from '@tanstack/react-query';
import { metadataApi } from '@/api/metadataApi';

export interface PasswordRules {
  minLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireNumber: boolean;
  requireSpecial: boolean;
}

export function usePasswordRules() {
  return useQuery({
    queryKey: ['public-settings', 'password-rules'],
    queryFn: async () => {
      const res = await metadataApi.getPublicSettings();
      const settings = res.data.data;
      
      const rules: PasswordRules = {
        minLength: 8,
        requireUppercase: true,
        requireLowercase: true,
        requireNumber: true,
        requireSpecial: true,
      };

      if (settings) {
        if (settings['auth.password.min_length']) {
          rules.minLength = parseInt(settings['auth.password.min_length'], 10) || 8;
        }
        if (settings['auth.password.require_uppercase']) {
          rules.requireUppercase = settings['auth.password.require_uppercase'].toLowerCase() === 'true';
        }
        if (settings['auth.password.require_lowercase']) {
          rules.requireLowercase = settings['auth.password.require_lowercase'].toLowerCase() === 'true';
        }
        if (settings['auth.password.require_number']) {
          rules.requireNumber = settings['auth.password.require_number'].toLowerCase() === 'true';
        }
        if (settings['auth.password.require_special']) {
          rules.requireSpecial = settings['auth.password.require_special'].toLowerCase() === 'true';
        }
      }
      return rules;
    },
    staleTime: 1000 * 60 * 60 * 24, // 24 hours
  });
}
