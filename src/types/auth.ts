import type { User, Session } from '@supabase/supabase-js';

export interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  logout: () => Promise<void>;
  allowedMenus: string[] | null; // null means no record (defaults to all menus) or not loaded yet
  fetchUserPermissions: (userId: string, email?: string) => Promise<void>;
}

export interface AuthErrorState {
  message: string;
  code?: string;
}

