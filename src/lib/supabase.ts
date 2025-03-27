import { createClient } from '@supabase/supabase-js';

// Define your database schema types
type Database = {
  public: {
    Tables: {
      grocery_items: {
        Row: {
          id: string;
          list_id: string;
          user_id: string;
          product_id: string;
          quantity: number;
          checked: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          list_id: string;
          user_id: string;
          product_id: string;
          quantity: number;
          checked?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          list_id?: string;
          user_id?: string;
          product_id?: string;
          quantity?: number;
          checked?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      grocery_lists: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          collaborators: string[];
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          collaborators?: string[];
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          collaborators?: string[];
          created_at?: string;
          updated_at?: string;
        };
      };
      user_products: {
        Row: {
          id: string;
          user_id: string;
          product_id: string;
          name: string;
          brand: string;
          price: number;
          image_url: string;
          store: string;
          category: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          product_id: string;
          name: string;
          brand: string;
          price: number;
          image_url?: string;
          store: string;
          category?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          product_id?: string;
          name?: string;
          brand?: string;
          price?: number;
          image_url?: string;
          store?: string;
          category?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
  };
};

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);

// Helper functions for authentication
export const signInWithGoogle = async () => {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}/auth/callback`
    }
  });
  
  return { data, error };
};

export const signInWithEmail = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });
  
  return { data, error };
};

export const signUpWithEmail = async (email: string, password: string, metadata?: { full_name?: string }) => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: metadata,
      emailRedirectTo: `${window.location.origin}/auth/callback`
    }
  });
  
  return { data, error };
};

export const signOut = async () => {
  return supabase.auth.signOut();
};

export const getCurrentUser = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
};

export const getSession = async () => {
  const { data: { session } } = await supabase.auth.getSession();
  return session;
};

// Subscribe to auth changes
export const subscribeToAuthChanges = (callback: (event: 'SIGNED_IN' | 'SIGNED_OUT', session: any) => void) => {
  return supabase.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_IN') {
      callback('SIGNED_IN', session);
    } else if (event === 'SIGNED_OUT') {
      callback('SIGNED_OUT', session);
    }
  });
}; 