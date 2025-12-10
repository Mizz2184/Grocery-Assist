// Payment page with lifetime deal option
import { useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ShoppingCart, Check, ArrowRight, Crown, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { 
  PRICING, 
  checkUserPaymentStatus, 
  markUserPaymentPending
} from "@/lib/stripe/stripe-client";

const Payment = () => {
  const { user, loading } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [hasPaid, setHasPaid] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const checkPayment = async () => {
      if (!user) return;
      
      setIsLoading(true);
      try {
        if (!navigator.onLine) {
          // Handle offline mode
          toast({
            title: "Offline Mode",
            description: "You appear to be offline. Some features may be limited.",
          });
          setIsLoading(false);
          return;
        }
        
        const paymentStatus = await checkUserPaymentStatus(user.id);
        setHasPaid(paymentStatus);
        
        if (paymentStatus) {
          toast({
            title: "Already Paid",
            description: "You have already completed your payment. Redirecting to home...",
          });
          navigate('/');
        }
      } catch (error) {
        console.error("Error checking payment status:", error);
        toast({
          title: "Error",
          description: "Could not check your payment status. Please try again.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    if (user) {
      checkPayment();
    } else if (!loading) {
      setIsLoading(false);
    }
  }, [user, loading, toast, navigate]);

  const handlePayment = async (planType: 'MONTHLY' | 'LIFETIME') => {
    if (!user) {
      toast({
        title: "Error",
        description: "You must be logged in to make a payment",
        variant: "destructive",
      });
      return;
    }
    
    if (!navigator.onLine) {
      toast({
        title: "Network Error",
        description: "You appear to be offline. Please check your internet connection and try again.",
        variant: "destructive",
      });
      return;
    }

    const selectedPlan = PRICING[planType];
    
    if (!selectedPlan.paymentLink) {
      toast({
        title: "Configuration Error",
        description: "Payment link not configured. Please contact support.",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsProcessing(true);
      setError(null);

      // Mark payment as pending in the database
      await markUserPaymentPending(user.id, crypto.randomUUID());
      
      // Redirect directly to Stripe payment link
      window.location.href = selectedPlan.paymentLink;
    } catch (err) {
      console.error('Payment error:', err);
      setError(err instanceof Error ? err.message : 'Failed to process payment');
      toast({
        title: "Payment Error",
        description: err instanceof Error ? err.message : 'Failed to process payment',
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Show loading state
  if (loading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-4">
        <Card className="w-full max-w-md shadow-lg animate-fade-in">
          <CardHeader className="text-center">
            <CardTitle>Loading...</CardTitle>
            <CardDescription>Checking your payment status...</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  // If user is not logged in, redirect to login
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // If user has already paid, redirect to home
  if (hasPaid) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 p-4 py-12">
      <div className="w-full max-w-5xl">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="mx-auto p-3 h-20 w-20 bg-gradient-to-br from-primary to-primary/80 rounded-2xl mb-6 flex items-center justify-center shadow-lg">
            <ShoppingCart className="h-10 w-10 text-primary-foreground" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
            Get Lifetime Access
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Get full access to price comparisons, meal planning, and smart grocery shopping
          </p>
        </div>

        {/* Pricing Card */}
        <div className="flex justify-center mb-8">
          {/* Lifetime Deal */}
          <Card className="relative overflow-hidden border-2 border-primary shadow-xl hover:shadow-2xl transition-all duration-300">
            <div className="absolute top-0 right-0 bg-gradient-to-br from-yellow-400 to-orange-500 text-white px-4 py-1 text-sm font-bold rounded-bl-lg flex items-center gap-1">
              <Crown className="h-4 w-4" />
              BEST VALUE
            </div>
            
            <CardHeader className="text-center pb-8 pt-12">
              <div className="mx-auto p-3 h-16 w-16 bg-gradient-to-br from-yellow-100 to-orange-100 dark:from-yellow-900/30 dark:to-orange-900/30 rounded-xl mb-4 flex items-center justify-center">
                <Sparkles className="h-8 w-8 text-orange-600 dark:text-orange-400" />
              </div>
              <CardTitle className="text-2xl font-bold">Lifetime Deal</CardTitle>
              <div className="mt-4">
                <span className="text-5xl font-bold">${PRICING.LIFETIME.price}</span>
                <span className="text-muted-foreground">/once</span>
              </div>
              <CardDescription className="mt-2">
                Pay once, use forever
              </CardDescription>
            </CardHeader>
            
            <CardContent className="space-y-4 pb-6">
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <Check className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                  <p className="text-sm">Compare prices across all stores</p>
                </div>
                <div className="flex items-start gap-3">
                  <Check className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                  <p className="text-sm">Unlimited meal plans & recipes</p>
                </div>
                <div className="flex items-start gap-3">
                  <Check className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                  <p className="text-sm">Smart grocery lists with sharing</p>
                </div>
                <div className="flex items-start gap-3">
                  <Check className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                  <p className="text-sm">Family Sharing</p>
                </div>
                <div className="flex items-start gap-3">
                  <Check className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                  <p className="text-sm">Lifetime access - no recurring fees</p>
                </div>
                <div className="flex items-start gap-3">
                  <Check className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                  <p className="text-sm">All future updates included</p>
                </div>
                <div className="flex items-start gap-3">
                  <Check className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                  <p className="text-sm">Priority customer support</p>
                </div>
              </div>
            </CardContent>
            
            <CardFooter>
              <Button 
                className="w-full h-12 text-base gap-2 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70" 
                onClick={() => handlePayment('LIFETIME')}
                disabled={isProcessing}
              >
                <Crown className="h-5 w-5" />
                Get Lifetime Access
                <ArrowRight className="h-5 w-5" />
              </Button>
            </CardFooter>
          </Card>
        </div>

        {/* Footer */}
        <div className="text-center space-y-4">
          <p className="text-sm text-muted-foreground">
            🔒 Secure payment processing by Stripe. Your payment information is never stored on our servers.
          </p>
          <p className="text-xs text-muted-foreground">
            Questions? Contact us at https://www.shop-assist.app/contact
          </p>
        </div>
      </div>
    </div>
  );
};

export default Payment; 