// Updated payment page with improved UI and Stripe integration
import { useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ShoppingCart, Check, CreditCard, ArrowRight } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { 
  APP_PRICE, 
  PAYMENT_LINK, 
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

  const handlePayment = async () => {
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

    try {
      setIsProcessing(true);
      setError(null);

      // Mark payment as pending in the database
      await markUserPaymentPending(user.id, crypto.randomUUID());
      
      // Redirect directly to Stripe payment link
      window.location.href = PAYMENT_LINK;
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
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-4">
      <Card className="w-full max-w-md shadow-lg animate-fade-in">
        <CardHeader className="text-center">
          <div className="mx-auto p-2 h-20 w-20 bg-primary rounded-full mb-4 flex items-center justify-center">
            <ShoppingCart className="h-10 w-10 text-primary-foreground" />
          </div>
          <CardTitle className="text-2xl font-bold">Subscribe to Shop-Assist</CardTitle>
          <CardDescription>
            Get full access to price comparisons and save money on your groceries
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          <div className="text-center">
            <p className="text-4xl font-bold">${APP_PRICE}</p>
            <p className="text-sm text-muted-foreground">One-time payment for lifetime access</p>
          </div>
          
          <div className="space-y-3">
            <div className="flex items-start gap-2">
              <Check className="h-5 w-5 text-green-500 mt-0.5" />
              <div>
                <p className="font-medium">Compare prices across stores</p>
                <p className="text-sm text-muted-foreground">Find the best deals on groceries between MaxiPali and MasxMenos</p>
              </div>
            </div>
            
            <div className="flex items-start gap-2">
              <Check className="h-5 w-5 text-green-500 mt-0.5" />
              <div>
                <p className="font-medium">Create shopping lists</p>
                <p className="text-sm text-muted-foreground">Organize your shopping and save your favorite products</p>
              </div>
            </div>
            
            <div className="flex items-start gap-2">
              <Check className="h-5 w-5 text-green-500 mt-0.5" />
              <div>
                <p className="font-medium">Barcode scanning</p>
                <p className="text-sm text-muted-foreground">Quickly find products with your phone's camera</p>
              </div>
            </div>
          </div>
        </CardContent>
        
        <CardFooter className="flex flex-col space-y-3">
          <Button 
            className="w-full h-12 text-lg gap-2" 
            onClick={handlePayment}
            disabled={isProcessing}
          >
            <CreditCard className="h-5 w-5" />
            Pay with Stripe
            <ArrowRight className="h-5 w-5" />
          </Button>
          
          <p className="text-xs text-center text-muted-foreground pt-2">
            Secure payment processing by Stripe. Your payment information is never stored on our servers.
          </p>
        </CardFooter>
      </Card>
    </div>
  );
};

export default Payment; 