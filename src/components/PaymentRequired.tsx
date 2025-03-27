import { ReactNode, useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { checkUserPaymentStatus } from "@/lib/stripe/stripe-client";

interface PaymentRequiredProps {
  children: ReactNode;
}

const PaymentRequired = ({ children }: PaymentRequiredProps) => {
  const { user, loading } = useAuth();
  const location = useLocation();
  const [hasPaid, setHasPaid] = useState<boolean | null>(null);
  const [isCheckingPayment, setIsCheckingPayment] = useState(true);

  useEffect(() => {
    const checkPayment = async () => {
      if (!user) return;
      
      try {
        // Check if the user has already paid
        const paymentStatus = await checkUserPaymentStatus(user.id);
        setHasPaid(paymentStatus);
      } catch (error) {
        console.error("Error checking payment status:", error);
        // Default to not paid if error
        setHasPaid(false);
      } finally {
        setIsCheckingPayment(false);
      }
    };

    if (user) {
      checkPayment();
    } else if (!loading) {
      setIsCheckingPayment(false);
    }
  }, [user, loading]);

  if (loading || isCheckingPayment) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center">
          <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin mb-4"></div>
          <p className="text-muted-foreground">Checking subscription...</p>
        </div>
      </div>
    );
  }

  // If the user hasn't paid, redirect to payment page
  if (user && hasPaid === false) {
    return <Navigate to="/payment" state={{ from: location }} replace />;
  }

  // If authenticated and paid or on a payment-related page, render the children
  return <>{children}</>;
};

export default PaymentRequired; 