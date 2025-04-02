import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { markUserAsPaid } from "@/lib/stripe/stripe-client";

const PaymentSuccess = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const processPayment = async () => {
      if (!user) {
        navigate('/login');
        return;
      }

      try {
        // Mark the user as paid for test mode
        markUserAsPaid(user.id);
        
        // Toast message
        toast({
          title: "Payment Successful",
          description: "Thank you for subscribing! You now have full access to all features.",
        });

        // Immediately redirect to home
        navigate('/');
      } catch (error) {
        console.error('Error processing payment:', error);
        toast({
          title: "Error",
          description: "There was an error processing your payment. Please try again.",
          variant: "destructive",
        });
        navigate('/payment');
      }
    };

    processPayment();
  }, [user, navigate, toast]);

  return (
    <div className="container max-w-lg py-8">
      <Card>
        <CardHeader className="text-center">
          <div className="mx-auto p-2 h-20 w-20 bg-green-100 dark:bg-green-900 rounded-full mb-4 flex items-center justify-center">
            <CheckCircle2 className="h-10 w-10 text-green-500" />
          </div>
          <CardTitle className="text-2xl font-bold">Payment Successful!</CardTitle>
          <CardDescription>
            Your payment has been processed successfully, and your account has been activated with full access to all features.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          <p className="mb-4">Redirecting you to the home page to start searching for products...</p>
          <Button 
            onClick={() => navigate('/')}
            className="gap-2"
          >
            Go to Search
            <Search className="h-4 w-4" />
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default PaymentSuccess; 