import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@/context/ThemeContext";
import { AuthProvider } from "@/hooks/useAuth";
import { SearchProvider } from "@/context/SearchContext";
import { TranslationProvider } from "@/context/TranslationContext";
import { Toaster } from "@/components/ui/toaster";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Navbar } from "@/components/Navbar";
import { useTranslation } from "@/context/TranslationContext";
import React from "react";
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
}

export const TranslatedText: React.FC<TranslatedTextProps> = ({ 
  es, 
  en, 
  children,
  className
}) => {
  const { isTranslated, translateText } = useTranslation();
  
  if (children) {
    return (
      <span className={className}>
        {children}
      </span>
    );
  }
  
  return (
    <span className={className}>
      {isTranslated ? (en || translateText(es)) : es}
    </span>
  );
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
                        <div className="min-h-screen flex flex-col pt-20">
                          <Navbar />
                          <main className="flex-1">
                            <Index />
                          </main>
                        </div>
                      </PaymentRequired>
                    </ProtectedRoute>
                  } />
                  
                  <Route path="/product/:id" element={
                    <ProtectedRoute>
                      <PaymentRequired>
                        <div className="min-h-screen flex flex-col pt-20">
                          <Navbar />
                          <main className="flex-1">
                            <Product />
                          </main>
                        </div>
                      </PaymentRequired>
                    </ProtectedRoute>
                  } />
                  
                  <Route path="/grocery-list" element={
                    <ProtectedRoute>
                      <PaymentRequired>
                        <div className="min-h-screen flex flex-col pt-20">
                          <Navbar />
                          <main className="flex-1">
                            <GroceryList />
                          </main>
                        </div>
                      </PaymentRequired>
                    </ProtectedRoute>
                  } />
                  
                  <Route path="/profile" element={
                    <ProtectedRoute>
                      <PaymentRequired>
                        <div className="min-h-screen flex flex-col pt-20">
                          <Navbar />
                          <main className="flex-1">
                            <Profile />
                          </main>
                        </div>
                      </PaymentRequired>
                    </ProtectedRoute>
                  } />
                  
                  <Route path="/settings" element={
                    <ProtectedRoute>
                      <PaymentRequired>
                        <div className="min-h-screen flex flex-col pt-20">
                          <Navbar />
                          <main className="flex-1">
                            <Settings />
                          </main>
                        </div>
                      </PaymentRequired>
                    </ProtectedRoute>
                  } />
                  
                  <Route path="/shared-list" element={
                    <ProtectedRoute>
                      <PaymentRequired>
                        <div className="min-h-screen flex flex-col pt-20">
                          <Navbar />
                          <main className="flex-1">
                            <SharedList />
                          </main>
                        </div>
                      </PaymentRequired>
                    </ProtectedRoute>
                  } />
                  
                  <Route path="/shared-list/:listId" element={
                    <ProtectedRoute>
                      <PaymentRequired>
                        <div className="min-h-screen flex flex-col pt-20">
                          <Navbar />
                          <main className="flex-1">
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
