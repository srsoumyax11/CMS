import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react';
import { authApi } from '@/api/authApi';
import { STORAGE_KEYS, AUTH_EVENTS } from '@/lib/constants';
import type { UserResponse, LoginRequest, UserType, AccountStatus } from '@/types/api';

interface AuthContextValue {
  user: UserResponse | null;
  role: UserType | null;
  accountStatus: AccountStatus | null;
  isLoading: boolean;
  login: (credentials: LoginRequest) => Promise<any>;
  finishLogin: (access_token: string, refresh_token: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  rbacRoles: string[];
  hasPermission: (permission: string) => boolean;
  can: (permission: string) => boolean;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchUser = useCallback(async () => {
    const token = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
    if (!token) {
      setUser(null);
      setIsLoading(false);
      return;
    }

    try {
      const response = await authApi.me();
      setUser(response.data.data);
    } catch {
      localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
      localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  useEffect(() => {
    const handleUnauthorized = () => {
      setUser(null);
      localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
      localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
    };
    window.addEventListener(AUTH_EVENTS.UNAUTHORIZED, handleUnauthorized);
    return () => window.removeEventListener(AUTH_EVENTS.UNAUTHORIZED, handleUnauthorized);
  }, []);

  const login = useCallback(async (credentials: LoginRequest) => {
    const response = await authApi.login(credentials);
    const tokenData = response.data.data;
    if (!tokenData) throw new Error('No token data received');
    
    if ('requires_2fa' in tokenData && tokenData.requires_2fa) {
      return tokenData;
    }

    const { access_token, refresh_token } = tokenData as any;
    localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, access_token);
    localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, refresh_token);

    const userResponse = await authApi.me();
    setUser(userResponse.data.data);
    return tokenData;
  }, []);

  const finishLogin = useCallback(async (access_token: string, refresh_token: string) => {
    localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, access_token);
    localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, refresh_token);
    const userResponse = await authApi.me();
    setUser(userResponse.data.data);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
    localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
    setUser(null);
    window.dispatchEvent(new CustomEvent(AUTH_EVENTS.LOGOUT));
  }, []);

  const rbacRoles = user?.rbac_roles ?? [];
  const permissions = user?.permissions ?? [];

  const hasPermission = useCallback(
    (permission: string) => {
      // SuperAdmin or user with explicit permission string (e.g. "complaint:view")
      if (user?.user_type === 'admin') return true;
      return permissions.includes(permission);
    },
    [permissions, user?.user_type]
  );

  const value: AuthContextValue = {
    user,
    role: user?.user_type ?? null,
    accountStatus: user?.account_status ?? null,
    isLoading,
    login,
    finishLogin,
    logout,
    refreshUser: fetchUser,
    rbacRoles,
    hasPermission,
    can: hasPermission,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
