import { SupabaseClient } from '@supabase/supabase-js';

declare module '@supabase/supabase-js' {
  export interface SupabaseAuthClient {
    admin: any;
    signInWithPassword(credentials: any): Promise<any>;
    signOut(): Promise<any>;
    signUp(credentials: any): Promise<any>;
    updateUser(attributes: any): Promise<any>;
    refreshSession(): Promise<any>;
    getSession(): Promise<any>;
    onAuthStateChange(callback: any): { data: { subscription: { unsubscribe: () => void } } };
  }
}
