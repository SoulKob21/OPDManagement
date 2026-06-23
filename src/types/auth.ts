import type { User, Session } from '@supabase/supabase-js';

export interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  logout: () => Promise<void>;
  allowedMenus: string[] | null; // null means no record (defaults to all menus) or not loaded yet
  displayName: string | null; // User's name from user_permissions
  role: string | null; // User's role/position from user_permissions
  fetchUserPermissions: (userId: string, email?: string) => Promise<void>;
}

export interface AuthErrorState {
  message: string;
  code?: string;
}

