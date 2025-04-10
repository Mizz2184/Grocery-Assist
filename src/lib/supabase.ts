import { createClient } from '@supabase/supabase-js';

// Define your database schema types
type Database = {
  public: {
    Tables: {
      grocery_items: {
        Row: {
          id: string;
          list_id: string;
          product_id: string;
          quantity: number;
          checked: boolean;
          created_at: string;
          updated_at?: string;
          product_data?: any;
        };
        Insert: {
          id?: string;
          list_id: string;
          product_id: string;
          quantity: number;
          checked?: boolean;
          created_at?: string;
          updated_at?: string;
          product_data?: any;
        };
        Update: {
          id?: string;
          list_id?: string;
          product_id?: string;
          quantity?: number;
          checked?: boolean;
          created_at?: string;
          updated_at?: string;
          product_data?: any;
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

// Initialize the Supabase client
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export const supabase = createClient<Database>(supabaseUrl, supabaseKey);

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
  console.log("Attempting to sign in with email:", email);
  
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    
    if (error) {
      // Log specific error details
      console.error("Auth error details:", {
        code: error.status,
        message: error.message,
        name: error.name
      });
      
      // Transform generic error messages to more user-friendly ones
      if (error.message.includes("Invalid login credentials")) {
        return { 
          data: null, 
          error: { 
            ...error, 
            message: "Invalid email or password. If you recently signed up, please check your email to confirm your account first." 
          }
        };
      }
      
      // Handle rate limiting
      if (error.message.includes("rate limit")) {
        return { 
          data: null, 
          error: { 
            ...error, 
            message: "Too many login attempts. Please try again later." 
          }
        };
      }
    }
    
    console.log("Sign in response:", { success: !!data?.session, user: data?.user?.id });
    return { data, error };
  } catch (err) {
    console.error("Unexpected error during sign in:", err);
    return {
      data: null,
      error: {
        message: "An unexpected error occurred. Please try again."
      }
    };
  }
};

export const signUpWithEmail = async (email: string, password: string, metadata?: { full_name?: string }) => {
  console.log("Starting email sign-up process", { email, metadata });
  
  // Ensure the redirect URL is properly set
  const redirectUrl = `${window.location.origin}/auth/callback`;
  console.log("Using redirect URL:", redirectUrl);
  
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: metadata,
      emailRedirectTo: redirectUrl
    }
  });
  
  console.log("Sign-up response:", { data, error });
  
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

// Add this new function to check and fix email verification
export const parseVerificationLink = (link: string) => {
  try {
    // Log the link for debugging
    console.log("Verification link received:", link);
    
    // Parse the URL
    const url = new URL(link);
    console.log("Parsed URL parts:", {
      origin: url.origin,
      pathname: url.pathname,
      search: url.search,
      hash: url.hash
    });
    
    // Extract token from the link
    const token = url.searchParams.get('token');
    const type = url.searchParams.get('type');
    const email = url.searchParams.get('email');
    
    console.log("Verification parameters:", { token, type, email });
    
    return { token, type, email, isValid: !!token && !!type };
  } catch (error) {
    console.error("Error parsing verification link:", error);
    return { isValid: false };
  }
};

// Add a function to manually confirm email
export const manuallyConfirmEmail = async (userId: string, adminPassword: string = ""): Promise<boolean> => {
  try {
    console.log(`Attempting to manually confirm email for user ID: ${userId}`);
    
    const { data, error } = await supabase.rpc('admin_confirm_user_by_id', {
      user_id_to_confirm: userId,
      admin_key: import.meta.env.VITE_ADMIN_PASSWORD || ''
    });
    
    if (error) {
      console.error('Error manually confirming email:', error);
      return false;
    }
    
    console.log('Email manually confirmed successfully');
    return true;
  } catch (error) {
    console.error('Error in manuallyConfirmEmail:', error);
    return false;
  }
};

// Add this new function
export const confirmUserWithoutEmail = async (email: string): Promise<boolean> => {
  try {
    console.log("Attempting direct confirmation for:", email);
    
    // Try using the admin function if available
    const { data, error } = await supabase.rpc('admin_confirm_user', {
      target_email: email,
      admin_key: 'dev123456'
    });
    
    if (error) {
      console.error("Direct confirmation error:", error);
      
      // If the admin function isn't available, we can try using the API to resend the verification
      // and guide the user to check their email
      const { error: resendError } = await supabase.auth.resend({
        type: 'signup',
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        }
      });
      
      if (resendError) {
        console.error("Failed to resend verification:", resendError);
        return false;
      }
      
      return false;
    }
    
    return !!data;
  } catch (error) {
    console.error("Error in confirmUserWithoutEmail:", error);
    return false;
  }
}; 