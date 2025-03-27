import { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, Home } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { markUserAsPaid } from "@/lib/stripe/stripe-client";
import { useToast } from "@/components/ui/use-toast";

const PaymentSuccess = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    // Process successful payment
    if (user) {
      // Mark the user as paid
      markUserAsPaid(user.id);
      
      // Show success toast
      toast({
        title: "Payment successful",
        description: "Thank you for subscribing to Grocery-Assist!",
      });
    } else {
      // If no user is found, redirect to login
      navigate("/login", { replace: true });
    }
  }, [user, navigate, toast]);

  if (!user) {
    return null; // Will redirect to login from useEffect
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-4">
      <Card className="w-full max-w-md shadow-lg animate-fade-in">
        <CardHeader className="text-center">
          <div className="mx-auto p-3 h-20 w-20 bg-green-100 dark:bg-green-900/20 rounded-full mb-4 flex items-center justify-center">
            <CheckCircle className="h-12 w-12 text-green-600 dark:text-green-400" />
          </div>
          <CardTitle className="text-2xl font-bold">Payment Successful!</CardTitle>
          <CardDescription>
            Thank you for subscribing to Grocery-Assist
          </CardDescription>
        </CardHeader>
        
        <CardContent className="text-center space-y-2">
          <p>
            Your payment has been processed successfully, and your account has been activated with full access to all features.
          </p>
          <p className="text-sm text-muted-foreground">
            You can now start comparing prices and saving money on your grocery shopping!
          </p>
        </CardContent>
        
        <CardFooter className="flex justify-center">
          <Link to="/">
            <Button className="gap-2">
              <Home className="h-4 w-4" />
              Go to Dashboard
            </Button>
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
};

export default PaymentSuccess; 