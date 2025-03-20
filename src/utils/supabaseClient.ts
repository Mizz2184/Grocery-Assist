import { supabase } from '@/integrations/supabase/client';

// Re-export the supabase client from integrations
export { supabase };

// For demonstration purposes, let's create a mock authentication system
export interface MockUser {
  id: string;
  email: string;
  user_metadata: {
    full_name?: string;
    [key: string]: any;
  };
}

export const mockAuth = {
  user: null as MockUser | null,
  signIn: async (email: string, password: string) => {
    return new Promise<{ data: { user: MockUser } | null, error: Error | null }>((resolve) => {
      setTimeout(() => {
        mockAuth.user = {
          id: 'mock-user-id',
          email,
          user_metadata: {
            full_name: 'Demo User',
          },
        };
        localStorage.setItem('mock-user', JSON.stringify(mockAuth.user));
        resolve({ data: { user: mockAuth.user }, error: null });
      }, 1000);
    });
  },
  signUp: async (email: string, password: string, metadata: any) => {
    return new Promise<{ data: { user: MockUser } | null, error: Error | null }>((resolve) => {
      setTimeout(() => {
        mockAuth.user = {
          id: 'mock-user-id',
          email,
          user_metadata: metadata,
        };
        localStorage.setItem('mock-user', JSON.stringify(mockAuth.user));
        resolve({ data: { user: mockAuth.user }, error: null });
      }, 1000);
    });
  },
  signOut: async () => {
    return new Promise<void>((resolve) => {
      setTimeout(() => {
        mockAuth.user = null;
        localStorage.removeItem('mock-user');
        resolve();
      }, 500);
    });
  },
  getSession: async () => {
    return new Promise<{ data: { session: { user: MockUser } | null }, error: Error | null }>((resolve) => {
      const storedUser = localStorage.getItem('mock-user');
      if (storedUser) {
        mockAuth.user = JSON.parse(storedUser);
        resolve({ data: { session: { user: mockAuth.user } }, error: null });
      } else {
        resolve({ data: { session: null }, error: null });
      }
    });
  },
};
