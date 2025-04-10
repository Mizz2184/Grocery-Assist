import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { checkUserPaymentStatus } from '@/lib/stripe/stripe-client';
import { markUserAsNew } from '@/lib/services/userService';

const AuthCallback = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    const handleCallback = async () => {
      if (!user) return;

      try {
        // Check if user has already paid
        const hasPaid = await checkUserPaymentStatus(user.id);
        
        if (hasPaid) {
          // If paid, redirect to main app
          navigate('/');
        } else {
          // If not paid, mark as new user and redirect to payment
          await markUserAsNew(user.id);
          navigate('/payment');
        }
      } catch (error) {
        console.error('Error in auth callback:', error);
        // On error, redirect to payment to be safe
        navigate('/payment');
      }
    };

    handleCallback();
  }, [user, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
    </div>
  );
};

export default AuthCallback; 