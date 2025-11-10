import { useEffect, useState } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, Search, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { markUserAsPaid } from "@/lib/stripe/stripe-client";

const PaymentSuccess = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [verificationStatus, setVerificationStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const processPayment = async () => {
      if (!user) {
        navigate('/login');
        return;
      }

      try {
        // Mark the user as paid
        await markUserAsPaid(user.id);
        setVerificationStatus('success');
        
        // Toast message
        toast({
          title: "Payment Successful",
          description: "Thank you for subscribing! You now have full access to all features.",
        });

        // Redirect to home after a short delay
        setTimeout(() => {
          navigate('/home');
        }, 3000);
      } catch (error) {
        console.error('Error processing payment:', error);
        setErrorMessage("There was an error processing your payment. Please try again or contact support.");
        setVerificationStatus('error');
        toast({
          title: "Error",
          description: "There was an error processing your payment. Please try again.",
          variant: "destructive",
        });
      }
    };

    processPayment();
  }, [user, navigate, toast]);

  if (!user) {
    return <Navigate to="/login" />;
  }

  return (
    <div className="container max-w-lg py-8">
      <Card>
        <CardHeader className="text-center">
          {verificationStatus === 'loading' && (
            <>
              <div className="mx-auto p-2 h-20 w-20 bg-blue-100 dark:bg-blue-900 rounded-full mb-4 flex items-center justify-center">
                <div className="h-10 w-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              </div>
              <CardTitle className="text-2xl font-bold">Verifying Payment...</CardTitle>
              <CardDescription>
                Please wait while we verify your payment status.
              </CardDescription>
            </>
          )}
          
          {verificationStatus === 'success' && (
            <>
              <div className="mx-auto p-2 h-20 w-20 bg-green-100 dark:bg-green-900 rounded-full mb-4 flex items-center justify-center">
                <CheckCircle2 className="h-10 w-10 text-green-500" />
              </div>
              <CardTitle className="text-2xl font-bold">Payment Successful!</CardTitle>
              <CardDescription>
                Your payment has been processed successfully, and your account has been activated with full access to all features.
              </CardDescription>
            </>
          )}
          
          {verificationStatus === 'error' && (
            <>
              <div className="mx-auto p-2 h-20 w-20 bg-red-100 dark:bg-red-900 rounded-full mb-4 flex items-center justify-center">
                <AlertTriangle className="h-10 w-10 text-red-500" />
              </div>
              <CardTitle className="text-2xl font-bold">Payment Verification Failed</CardTitle>
              <CardDescription>
                {errorMessage || "We couldn't verify your payment. Please try again or contact support."}
              </CardDescription>
            </>
          )}
        </CardHeader>
        <CardContent className="text-center">
          {verificationStatus === 'success' && (
            <>
              <p className="mb-4">Redirecting you to the home page to start searching for products...</p>
              <Button 
                onClick={() => navigate('/home')}
                className="gap-2"
              >
                Go to Home
                <Search className="h-4 w-4" />
              </Button>
            </>
          )}
          
          {verificationStatus === 'error' && (
            <>
              <p className="mb-4">Please try again or contact our support team for assistance.</p>
              <Button 
                onClick={() => navigate('/payment')}
                className="gap-2"
                variant="outline"
              >
                Return to Payment Page
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default PaymentSuccess; 