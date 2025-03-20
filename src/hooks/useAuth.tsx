
import { useEffect, useState, createContext, useContext } from 'react';
import { mockAuth } from '@/utils/supabaseClient';
import { useToast } from "@/components/ui/use-toast";

interface AuthUser {
  id: string;
  email: string;
  user_metadata: {
    full_name?: string;
  };
}

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, fullName: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const getSession = async () => {
      setLoading(true);
      const { data, error } = await mockAuth.getSession();
      
      if (error) {
        console.error("Error fetching session:", error);
      } else if (data?.session?.user) {
        setUser(data.session.user);
      }
      
      setLoading(false);
    };

    getSession();
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      setLoading(true);
      const { data, error } = await mockAuth.signIn(email, password);
      
      if (error) throw error;
      if (data?.user) {
        setUser(data.user);
        toast({
          title: "Welcome back!",
          description: "You've successfully signed in.",
        });
      }
    } catch (error: any) {
      toast({
        title: "Sign in failed",
        description: error.message || "Please check your credentials and try again.",
        variant: "destructive",
      });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    try {
      setLoading(true);
      const { data, error } = await mockAuth.signUp(email, password, { full_name: fullName });
      
      if (error) throw error;
      if (data?.user) {
        setUser(data.user);
        toast({
          title: "Account created",
          description: "Welcome to Cost Comrade!",
        });
      }
    } catch (error: any) {
      toast({
        title: "Sign up failed",
        description: error.message || "Please try again with different credentials.",
        variant: "destructive",
      });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    try {
      setLoading(true);
      await mockAuth.signOut();
      setUser(null);
      toast({
        title: "Signed out",
        description: "You've been successfully signed out.",
      });
    } catch (error: any) {
      toast({
        title: "Sign out failed",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signUp, signOut }}>
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
