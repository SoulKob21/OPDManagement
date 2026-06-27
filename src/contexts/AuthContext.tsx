import React, { createContext, useContext, useEffect, useState } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import type { AuthContextType } from '../types/auth';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [allowedMenus, setAllowedMenus] = useState<string[] | null | undefined>(undefined);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);

  const fetchUserPermissions = async (userId: string, email?: string) => {
    try {
      const conditions = email
        ? `user_id.eq."${userId}",user_id.eq."${email}"`
        : `user_id.eq."${userId}"`;

      const { data, error } = await supabase
        .from('user_permissions')
        .select('allowed_menus, display_name, role')
        .or(conditions);

      if (error) {
        console.warn('[Auth] Error fetching user permissions:', error.message);
        setAllowedMenus(null);
        setDisplayName(null);
        setRole(null);
        return;
      }

      if (data && data.length > 0) {
        setAllowedMenus(data[0].allowed_menus);
        setDisplayName(data[0].display_name);
        setRole(data[0].role);
      } else {
        setAllowedMenus(null);
        setDisplayName(null);
        setRole(null);
      }
    } catch (err) {
      console.error('[Auth] Unexpected error fetching permissions:', err);
      setAllowedMenus(null);
      setDisplayName(null);
      setRole(null);
    }
  };

  useEffect(() => {
    if (user) {
      fetchUserPermissions(user.id, user.email);
    } else {
      setAllowedMenus(null);
      setDisplayName(null);
      setRole(null);
    }
  }, [user]);

  useEffect(() => {
    let mounted = true;

    // Check if bypass is requested (only allowed in DEV mode)
    const shouldBypass = import.meta.env.DEV && localStorage.getItem('DEV_BYPASS_LOGIN') === 'true';

    // Dev bypass: skip Supabase auth entirely
    if (shouldBypass) {
      setUser({ id: 'dev-user', email: 'admin@opd.com' } as User);
      setSession({} as Session);
      setLoading(false);
      return;
    }

    // Get initial session
    const getInitialSession = async () => {
      try {
        const { data: { session: initialSession }, error } = await supabase.auth.getSession();
        if (error) {
          console.error('[Auth] Error getting initial session:', error.message);
        }
        
        if (mounted) {
          setSession(initialSession);
          setUser(initialSession?.user ?? null);
        }
      } catch (err) {
        console.error('[Auth] Unexpected error during initial session check:', err);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    getInitialSession();

    // Listen to auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, currentSession) => {
      if (mounted) {
        setSession(currentSession);
        setUser(currentSession?.user ?? null);
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const logout = async () => {
    try {
      setLoading(true);
      localStorage.removeItem('DEV_BYPASS_LOGIN');
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('[Auth] Error signing out:', error.message);
      }
    } catch (err) {
      console.error('[Auth] Unexpected error during signout:', err);
    } finally {
      // Always reset local application state
      setSession(null);
      setUser(null);
      setLoading(false);
      
      // Redirect to login (fallback in case route transition is not handled reactively)
      window.location.href = '/login';
    }
  };

  const contextLoading = loading || (!!user && allowedMenus === undefined);

  return (
    <AuthContext.Provider value={{ session, user, loading: contextLoading, logout, allowedMenus: allowedMenus === undefined ? null : allowedMenus, displayName, role, fetchUserPermissions }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
