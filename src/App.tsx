import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "@/context/ThemeContext";
import { AuthProvider } from "@/hooks/useAuth";
import { SearchProvider } from "@/context/SearchContext";
import { TranslationProvider } from "@/context/TranslationContext";
import { Toaster } from "@/components/ui/toaster";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Navbar } from "@/components/Navbar";
import { useTranslation } from "@/context/TranslationContext";
import React, { useMemo } from "react";
import ProtectedRoute from "@/components/ProtectedRoute";
import PaymentRequired from "@/components/PaymentRequired";

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

const queryClient = new QueryClient();

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <SearchProvider>
            <TranslationProvider>
              <BrowserRouter>
                <Routes>
                  {/* Public routes */}
                  <Route path="/login" element={<Login />} />
                  <Route path="/auth/callback" element={<AuthCallback />} />
                  
                  {/* Payment routes - protected but not payment-required */}
                  <Route path="/payment" element={
                    <ProtectedRoute>
                      <Payment />
                    </ProtectedRoute>
                  } />
                  
                  <Route path="/payment-success" element={
                    <ProtectedRoute>
                      <PaymentSuccess />
                    </ProtectedRoute>
                  } />
                  
                  {/* Protected and payment-required routes */}
                  <Route path="/" element={
                    <ProtectedRoute>
                      <PaymentRequired>
                        <div className="min-h-screen flex flex-col pt-20 w-full">
                          <Navbar />
                          <main className="flex-1 w-full">
                            <Index />
                          </main>
                        </div>
                      </PaymentRequired>
                    </ProtectedRoute>
                  } />
                  
                  <Route path="/product/:id" element={
                    <ProtectedRoute>
                      <PaymentRequired>
                        <div className="min-h-screen flex flex-col pt-20 w-full">
                          <Navbar />
                          <main className="flex-1 w-full">
                            <Product />
                          </main>
                        </div>
                      </PaymentRequired>
                    </ProtectedRoute>
                  } />
                  
                  <Route path="/grocery-list" element={
                    <ProtectedRoute>
                      <PaymentRequired>
                        <div className="min-h-screen flex flex-col pt-20 w-full">
                          <Navbar />
                          <main className="flex-1 w-full">
                            <GroceryList />
                          </main>
                        </div>
                      </PaymentRequired>
                    </ProtectedRoute>
                  } />
                  
                  <Route path="/profile" element={
                    <ProtectedRoute>
                      <PaymentRequired>
                        <div className="min-h-screen flex flex-col pt-20 w-full">
                          <Navbar />
                          <main className="flex-1 w-full">
                            <Profile />
                          </main>
                        </div>
                      </PaymentRequired>
                    </ProtectedRoute>
                  } />
                  
                  <Route path="/settings" element={
                    <ProtectedRoute>
                      <PaymentRequired>
                        <div className="min-h-screen flex flex-col pt-20 w-full">
                          <Navbar />
                          <main className="flex-1 w-full">
                            <Settings />
                          </main>
                        </div>
                      </PaymentRequired>
                    </ProtectedRoute>
                  } />
                  
                  <Route path="/shared-list" element={
                    <ProtectedRoute>
                      <PaymentRequired>
                        <div className="min-h-screen flex flex-col pt-20 w-full">
                          <Navbar />
                          <main className="flex-1 w-full">
                            <SharedList />
                          </main>
                        </div>
                      </PaymentRequired>
                    </ProtectedRoute>
                  } />
                  
                  <Route path="/shared-list/:listId" element={
                    <ProtectedRoute>
                      <PaymentRequired>
                        <div className="min-h-screen flex flex-col pt-20 w-full">
                          <Navbar />
                          <main className="flex-1 w-full">
                            <SharedList />
                          </main>
                        </div>
                      </PaymentRequired>
                    </ProtectedRoute>
                  } />
                  
                  <Route path="*" element={<NotFound />} />
                </Routes>
                <Toaster />
              </BrowserRouter>
            </TranslationProvider>
          </SearchProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
