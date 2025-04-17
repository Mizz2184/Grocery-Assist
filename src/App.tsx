import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "@/context/ThemeContext";
import { AuthProvider } from "@/hooks/useAuth";
import { SearchProvider } from "@/context/SearchContext";
import { TranslationProvider } from "@/context/TranslationContext";
import { Toaster } from "@/components/ui/toaster";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Navbar } from "@/components/Navbar";
import { useTranslation } from "@/context/TranslationContext";
import React, { useMemo, useEffect, useState } from "react";
import ProtectedRoute from "@/components/ProtectedRoute";
import PaymentRequired from "@/components/PaymentRequired";
import { fetchCurrentExchangeRate } from '@/utils/currencyUtils';
import { checkUserPaymentStatus } from "@/lib/stripe/stripe-client";
import { useAuth } from "@/hooks/useAuth";

// Pages
import Index from "./pages/Index";
import Product from "./pages/Product";
import GroceryList from "./pages/GroceryList";
import Profile from "./pages/Profile";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";
import Login from "./pages/Login";
import AuthCallback from "./pages/AuthCallback";
import Payment from "./pages/Payment";
import PaymentSuccess from "./pages/PaymentSuccess";
import SharedList from "./pages/SharedList";
import VerifyEmail from "./pages/VerifyEmail";
import ExchangeRate from "./pages/ExchangeRate";

// Create a reusable component for translating text
interface TranslatedTextProps {
  es: string;
  en?: string;
  children?: React.ReactNode;
  className?: string;
  as?: React.ElementType;
  dangerouslySetInnerHTML?: boolean;
}

export const TranslatedText: React.FC<TranslatedTextProps> = ({ 
  es, 
  en, 
  children,
  className,
  as: Component = 'span',
  dangerouslySetInnerHTML = false
}) => {
  const { isTranslated, translateText } = useTranslation();
  
  if (children) {
    return (
      <Component className={className}>
        {children}
      </Component>
    );
  }
  
  const translatedContent = isTranslated ? (en || translateText(es)) : es;
  
  if (dangerouslySetInnerHTML) {
    return (
      <Component 
        className={className} 
        dangerouslySetInnerHTML={{ __html: translatedContent }} 
      />
    );
  }
  
  return (
    <Component className={className}>
      {translatedContent}
    </Component>
  );
};

// Hook for automatically translating text anywhere in the app
export const useAutoTranslate = () => {
  const { isTranslated, translateText } = useTranslation();
  
  // Function to translate any text
  const t = useMemo(() => {
    return (text: string | undefined | null, fallback?: string): string => {
      if (!text) return fallback || '';
      return isTranslated ? translateText(text) : text;
    };
  }, [isTranslated, translateText]);
  
  // Function to translate objects with text properties
  const tObject = useMemo(() => {
    return <T extends Record<string, any>>(obj: T): T => {
      if (!obj || typeof obj !== 'object') return obj;
      
      const result = { ...(obj as any) } as any;
      
      // Recursively translate all string properties
      Object.keys(result).forEach(key => {
        const value = result[key];
        
        if (typeof value === 'string') {
          result[key] = t(value);
        } else if (value && typeof value === 'object' && !Array.isArray(value)) {
          result[key] = tObject(value);
        } else if (Array.isArray(value)) {
          result[key] = value.map(item => 
            typeof item === 'string' ? t(item) : 
            (typeof item === 'object' ? tObject(item) : item)
          );
        }
      });
      
      return result as T;
    };
  }, [t]);
  
  return {
    t,                 // Translate single text
    tObject,           // Translate object with text properties
    isTranslated       // Current translation state
  };
};

// Create a new QueryClient instance outside of component
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

// Protected route component that checks auth and payment status
const ProtectedRouteComponent = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

// Payment protected route that checks if user has paid
const PaymentProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  // Comment out payment verification state
  /* 
  const [hasPaid, setHasPaid] = useState<boolean | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const checkPayment = async () => {
      if (user) {
        const paid = await checkUserPaymentStatus(user.id);
        setHasPaid(paid);
      }
      setChecking(false);
    };

    checkPayment();
  }, [user]);

  if (loading || checking) {
    return <div>Loading...</div>;
  }
  */

  // Simplified loading check without payment verification
  if (loading) {
    return <div>Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  /* Comment out payment requirement
  if (!hasPaid) {
    return <Navigate to="/payment" replace />;
  }
  */

  return <>{children}</>;
};

// Create a separate component for the app content with hooks
function AppContent() {
  // The exchange rate is already being loaded in the main App component
  // No need to fetch it again here

  return (
    <Routes>
      {/* Public routes - Login is now both the root and /login path */}
      <Route path="/" element={<Login />} />
      <Route path="/login" element={<Login />} />
      <Route path="/auth/callback" element={<AuthCallback />} />
      <Route path="/verify-email" element={<VerifyEmail />} />
      
      {/* Protected routes that require authentication */}
      <Route path="/payment" element={
        <ProtectedRouteComponent>
          <Payment />
        </ProtectedRouteComponent>
      } />
      <Route path="/payment-success" element={
        <ProtectedRouteComponent>
          <PaymentSuccess />
        </ProtectedRouteComponent>
      } />
      
      {/* Routes that require both auth and payment */}
      <Route path="/home" element={
        <ProtectedRouteComponent>
          <div className="min-h-screen flex flex-col pt-20 w-full">
            <Navbar />
            <main className="flex-1 w-full">
              <Index />
            </main>
          </div>
        </ProtectedRouteComponent>
      } />
      
      <Route path="/product/:id" element={
        <ProtectedRouteComponent>
          <div className="min-h-screen flex flex-col pt-20 w-full">
            <Navbar />
            <main className="flex-1 w-full">
              <Product />
            </main>
          </div>
        </ProtectedRouteComponent>
      } />
      
      <Route path="/grocery-list" element={
        <ProtectedRouteComponent>
          <div className="min-h-screen flex flex-col pt-20 w-full">
            <Navbar />
            <main className="flex-1 w-full">
              <GroceryList />
            </main>
          </div>
        </ProtectedRouteComponent>
      } />
      
      <Route path="/profile" element={
        <ProtectedRouteComponent>
          <div className="min-h-screen flex flex-col pt-20 w-full">
            <Navbar />
            <main className="flex-1 w-full">
              <Profile />
            </main>
          </div>
        </ProtectedRouteComponent>
      } />
      
      <Route path="/settings" element={
        <ProtectedRouteComponent>
          <div className="min-h-screen flex flex-col pt-20 w-full">
            <Navbar />
            <main className="flex-1 w-full">
              <Settings />
            </main>
          </div>
        </ProtectedRouteComponent>
      } />
      
      <Route path="/shared-list" element={
        <ProtectedRouteComponent>
          <div className="min-h-screen flex flex-col pt-20 w-full">
            <Navbar />
            <main className="flex-1 w-full">
              <SharedList />
            </main>
          </div>
        </ProtectedRouteComponent>
      } />
      
      <Route path="/shared-list/:listId" element={
        <ProtectedRouteComponent>
          <div className="min-h-screen flex flex-col pt-20 w-full">
            <Navbar />
            <main className="flex-1 w-full">
              <SharedList />
            </main>
          </div>
        </ProtectedRouteComponent>
      } />
      
      <Route path="/exchange-rate" element={
        <ProtectedRouteComponent>
          <div className="min-h-screen flex flex-col pt-20 w-full">
            <Navbar />
            <main className="flex-1 w-full">
              <ExchangeRate />
            </main>
          </div>
        </ProtectedRouteComponent>
      } />
      
      {/* Redirect all unknown routes to login */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

// Provide the React Query client to the App
export default function App() {
  // Fetch exchange rate when the app loads
  useEffect(() => {
    // Fetch the exchange rate in the background
    fetchCurrentExchangeRate().then(rate => {
      console.log(`Exchange rate loaded: ${rate} USD per CRC`);
    }).catch(error => {
      console.error('Failed to load initial exchange rate:', error);
    });
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <SearchProvider>
            <TranslationProvider>
              <Router>
                <AppContent />
                <Toaster />
              </Router>
            </TranslationProvider>
          </SearchProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
