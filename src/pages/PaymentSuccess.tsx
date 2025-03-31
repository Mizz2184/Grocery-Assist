import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, ArrowRight } from "lucide-react";
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
        // Get the session ID from localStorage
        const sessionId = localStorage.getItem(`payment_session_${user.id}`);
        
        if (!sessionId) {
          toast({
            title: "Invalid Payment Session",
            description: "Could not verify your payment. Please try again.",
            variant: "destructive",
          });
          navigate('/payment');
          return;
        }

        // Mark the user as paid
        markUserAsPaid(user.id);
        
        // Clear the session ID
        localStorage.removeItem(`payment_session_${user.id}`);

        toast({
          title: "Payment Successful",
          description: "Thank you for subscribing! You now have full access to all features.",
        });

        // Redirect to home after a short delay
        setTimeout(() => {
          navigate('/');
        }, 2000);
      } catch (error) {
        console.error('Error processing payment:', error);
        toast({
          title: "Error",
          description: "There was an error processing your payment. Please contact support.",
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
          <Button 
            onClick={() => navigate('/')}
            className="gap-2"
          >
            Go to Home
            <ArrowRight className="h-4 w-4" />
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default PaymentSuccess; 