
import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui/use-toast";
import { User, LogOut, CreditCard, AlertTriangle } from "lucide-react";
import { getUserSubscription, cancelSubscription, formatDate, SubscriptionInfo } from "@/lib/stripe/subscription-service";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const Profile = () => {
  const { user, loading, signOut } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null);
  const [loadingSubscription, setLoadingSubscription] = useState(true);
  const [isCancelling, setIsCancelling] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  // Load subscription info when user is logged in
  useEffect(() => {
    const loadSubscription = async () => {
      if (user) {
        setLoadingSubscription(true);
        const subInfo = await getUserSubscription(user.id);
        setSubscription(subInfo);
        setLoadingSubscription(false);
      }
    };

    loadSubscription();
  }, [user]);

  const handleCancelSubscription = async () => {
    if (!user) return;

    setIsCancelling(true);
    const result = await cancelSubscription(user.id);
    
    if (result.success) {
      toast({
        title: "Subscription Cancelled",
        description: "Your subscription will remain active until the end of your billing period.",
      });
      
      // Reload subscription info
      const subInfo = await getUserSubscription(user.id);
      setSubscription(subInfo);
    } else {
      toast({
        title: "Error",
        description: result.message,
        variant: "destructive",
      });
    }
    
    setIsCancelling(false);
  };

  const handleSignOut = async () => {
    setIsSubmitting(true);
    
    try {
      await signOut();
    } catch (error) {
      console.error("Sign out error:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="page-container">
        <div className="max-w-md mx-auto">
          <Card className="animate-pulse bg-muted h-80" />
        </div>
      </div>
    );
  }

  if (user) {
    return (
      <div className="page-container">
        <div className="max-w-2xl mx-auto space-y-6">
          {/* Profile Information Card */}
          <Card className="animate-scale-in">
            <CardHeader>
              <CardTitle>My Profile</CardTitle>
              <CardDescription>
                Manage your account information
              </CardDescription>
            </CardHeader>
            
            <CardContent className="space-y-6">
              <div className="flex justify-center">
                <div className="w-24 h-24 bg-muted rounded-full flex items-center justify-center text-muted-foreground">
                  <User className="w-12 h-12" />
                </div>
              </div>
              
              <div className="space-y-4">
                <div className="space-y-1">
                  <Label>Full Name</Label>
                  <div className="p-2 border rounded-md bg-muted/50">
                    {user.user_metadata.full_name || "Not provided"}
                  </div>
                </div>
                
                <div className="space-y-1">
                  <Label>Email</Label>
                  <div className="p-2 border rounded-md bg-muted/50">
                    {user.email}
                  </div>
                </div>
              </div>
            </CardContent>
            
            <CardFooter>
              <Button 
                variant="outline" 
                className="w-full rounded-full"
                onClick={handleSignOut}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <span className="h-5 w-5 rounded-full border-2 border-current border-t-transparent animate-spin mr-2" />
                ) : (
                  <LogOut className="w-4 h-4 mr-2" />
                )}
                Sign Out
              </Button>
            </CardFooter>
          </Card>

          {/* Subscription Information Card */}
          <Card className="animate-scale-in">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="w-5 h-5" />
                Subscription
              </CardTitle>
              <CardDescription>
                Manage your subscription and billing
              </CardDescription>
            </CardHeader>
            
            <CardContent className="space-y-4">
              {loadingSubscription ? (
                <div className="flex items-center justify-center py-8">
                  <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin"></div>
                </div>
              ) : subscription ? (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <Label className="text-muted-foreground">Plan Type</Label>
                      <div className="font-medium">
                        {subscription.payment_type === 'SUBSCRIPTION' ? 'Monthly Subscription' : 'Lifetime Access'}
                      </div>
                    </div>
                    
                    <div className="space-y-1">
                      <Label className="text-muted-foreground">Status</Label>
                      <div className={cn(
                        "font-medium",
                        subscription.status === 'PAID' ? "text-green-600" : "text-yellow-600"
                      )}>
                        {subscription.cancel_at_period_end ? 'Cancelling' : subscription.status}
                      </div>
                    </div>
                  </div>

                  {subscription.payment_type === 'SUBSCRIPTION' && subscription.current_period_end && (
                    <div className="space-y-1">
                      <Label className="text-muted-foreground">
                        {subscription.cancel_at_period_end ? 'Access Until' : 'Next Billing Date'}
                      </Label>
                      <div className="font-medium">
                        {formatDate(subscription.current_period_end)}
                      </div>
                    </div>
                  )}

                  {subscription.cancel_at_period_end && (
                    <div className="flex items-start gap-2 p-3 bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-md">
                      <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                          Subscription Cancelled
                        </p>
                        <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                          Your subscription will remain active until {formatDate(subscription.current_period_end)}. 
                          You can continue using all features until then.
                        </p>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No subscription information found
                </div>
              )}
            </CardContent>
            
            {subscription && subscription.payment_type === 'SUBSCRIPTION' && !subscription.cancel_at_period_end && (
              <CardFooter>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button 
                      variant="destructive" 
                      className="w-full"
                      disabled={isCancelling}
                    >
                      {isCancelling ? (
                        <>
                          <span className="h-4 w-4 rounded-full border-2 border-current border-t-transparent animate-spin mr-2" />
                          Cancelling...
                        </>
                      ) : (
                        'Cancel Subscription'
                      )}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Cancel Subscription?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Your subscription will be cancelled, but you'll continue to have access until the end of your current billing period on {formatDate(subscription.current_period_end)}.
                        <br /><br />
                        You can resubscribe at any time.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Keep Subscription</AlertDialogCancel>
                      <AlertDialogAction onClick={handleCancelSubscription} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                        Yes, Cancel
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </CardFooter>
            )}
          </Card>
        </div>
      </div>
    );
  }

  // If not logged in, redirect to login page
  return <div className="page-container">
    <div className="max-w-md mx-auto text-center py-12">
      <p className="text-muted-foreground mb-4">Please log in to view your profile</p>
      <Button onClick={() => navigate('/login')}>Go to Login</Button>
    </div>
  </div>;
};

export default Profile;
