import { ReactNode, useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { checkUserPaymentStatus } from "@/lib/stripe/stripe-client";
import { isNewUser as dbIsNewUser } from "@/lib/services/userService";

interface PaymentRequiredProps {
  children: ReactNode;
}

const PaymentRequired = ({ children }: PaymentRequiredProps) => {
  const { user, loading } = useAuth();
  const location = useLocation();
  const [hasPaid, setHasPaid] = useState<boolean | null>(null);
  const [isCheckingPayment, setIsCheckingPayment] = useState(true);
  const [isNewUser, setIsNewUser] = useState<boolean>(false);

  // Check if this is a new user that needs to complete payment
  useEffect(() => {
    const checkIfNewUser = async () => {
      if (!user) return;
      
      try {
        // Check database for new user status
        const newUserStatus = await dbIsNewUser(user.id);
        setIsNewUser(newUserStatus);
        
        // If new user and not on payment page, set hasPaid to false to trigger redirect
        if (newUserStatus && !location.pathname.includes('/payment')) {
          setHasPaid(false);
        }
      } catch (error) {
        console.error("Error checking if user is new:", error);
      }
    };
    
    checkIfNewUser();
  }, [user, location.pathname]);

  useEffect(() => {
    const checkPayment = async () => {
      if (!user) return;
      
      try {
        // Check if the user has already paid
        const paymentStatus = await checkUserPaymentStatus(user.id);
        console.log("Payment status check result:", paymentStatus);
        
        // If paid, they're not a new user anymore
        if (paymentStatus) {
          setIsNewUser(false);
        }
        
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

  // Allow payment-related pages without a payment check
  if (location.pathname === '/payment' || location.pathname === '/payment-success') {
    return <>{children}</>;
  }

  // If the user hasn't paid, redirect to payment page
  if (user && hasPaid === false) {
    return <Navigate to="/payment" replace />;
  }

  // User has paid or payment check passed
  return <>{children}</>;
};

export default PaymentRequired; 