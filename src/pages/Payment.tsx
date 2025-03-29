// Updated payment page with improved UI and Stripe integration
import { useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ShoppingCart, Check, CreditCard, ArrowRight } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { APP_PRICE, STRIPE_PAYMENT_LINK, checkUserPaymentStatus, markUserAsPaid } from "@/lib/stripe/stripe-client";

const Payment = () => {
  const { user, loading } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [hasPaid, setHasPaid] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkPayment = async () => {
      if (!user) return;
      
      setIsLoading(true);
      try {
        // Check if the user has already paid
        const paymentStatus = await checkUserPaymentStatus(user.id);
        setHasPaid(paymentStatus);
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
  }, [user, loading, toast]);

  const handlePaymentRedirect = () => {
    // For demo purposes, let's add a simulated callback parameter with the user ID
    // In production, you'd implement proper Stripe webhook handling
    const redirectUrl = `${STRIPE_PAYMENT_LINK}?client_reference_id=${user?.id}&success_url=${encodeURIComponent(window.location.origin + '/payment-success')}`;
    
    // Open payment link in new tab/window
    window.open(redirectUrl, '_blank');
  };

  // For demo purposes - normally this would be handled by a webhook
  const handleSimulatePayment = () => {
    if (!user) return;
    
    // Mark the user as paid in local storage
    markUserAsPaid(user.id);
    setHasPaid(true);
    
    toast({
      title: "Payment successful",
      description: "Thank you for subscribing to Fam-Assist!",
    });
  };

  // Redirect to login if not logged in
  if (!loading && !user) {
    return <Navigate to="/login" replace />;
  }

  // Redirect to home if already paid
  if (!isLoading && hasPaid) {
    return <Navigate to="/" replace />;
  }

  if (loading || isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-spin h-12 w-12 rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-4">
      <Card className="w-full max-w-md shadow-lg animate-fade-in">
        <CardHeader className="text-center">
          <div className="mx-auto p-2 h-20 w-20 bg-primary rounded-full mb-4 flex items-center justify-center">
            <ShoppingCart className="h-10 w-10 text-primary-foreground" />
          </div>
          <CardTitle className="text-2xl font-bold">Subscribe to Fam-Assist</CardTitle>
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
            onClick={handlePaymentRedirect}
          >
            <CreditCard className="h-5 w-5" />
            Pay with Stripe
            <ArrowRight className="h-5 w-5" />
          </Button>
          
          {/* For demo purposes only - simulate payment */}
          <Button 
            variant="outline" 
            className="w-full" 
            onClick={handleSimulatePayment}
          >
            Simulate Successful Payment
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