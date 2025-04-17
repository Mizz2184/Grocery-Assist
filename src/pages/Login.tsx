import { useState, useEffect } from "react";
import { Navigate, useNavigate, useLocation, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { useSearch } from "@/context/SearchContext";
import { signInWithGoogle, signInWithEmail, supabase } from "@/lib/supabase";
import { ShoppingCart, AlertCircle, Mail, Lock, User } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/use-toast";
import { checkUserPaymentStatus } from "@/lib/stripe/stripe-client";
import { markUserAsNew } from "@/lib/services/userService";
import { PAYMENT_LINK } from "@/lib/stripe/stripe-client";

const Login = () => {
  // State hooks - define ALL hooks at the top level
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isSigningUp, setIsSigningUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [currentView, setCurrentView] = useState("login");
  const [shouldRedirect, setShouldRedirect] = useState(false);
  const [redirectPath, setRedirectPath] = useState("/");
  const [showPaymentCard, setShowPaymentCard] = useState(false);
  const [newUserEmail, setNewUserEmail] = useState("");
  
  // Hook calls
  const { user } = useAuth();
  const { clearSearch } = useSearch();
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  
  // Extract redirect URL from query parameters
  const queryParams = new URLSearchParams(location.search);
  const redirectUrl = queryParams.get('redirect') || '/';

  // Handle user authentication state
  useEffect(() => {
    if (user) {
      // PAYMENT REQUIREMENT DISABLED - Always redirect to home
      /*
      // Check if this is a new user that needs to complete payment
      const isNewUser = localStorage.getItem('is_new_user') === 'true';
      
      // Set redirect state instead of navigating directly
      setShouldRedirect(true);
      setRedirectPath(isNewUser ? '/payment' : redirectUrl);
      */
      
      // Always redirect to home
      setShouldRedirect(true);
      setRedirectPath('/home');
    }
  }, [user, redirectUrl]);

  // If user is already logged in, check their payment status once
  useEffect(() => {
    let isMounted = true;

    const checkUserStatus = async () => {
      if (!user || !isMounted) return;

      // PAYMENT REQUIREMENT DISABLED - App is free for now
      // Original implementation is commented out for future use
      /*
      try {
        const hasPaid = await checkUserPaymentStatus(user.id);
        if (hasPaid && isMounted) {
          navigate('/home'); // If paid, go to main app
        } else if (isMounted) {
          navigate('/payment'); // If not paid, go to payment
        }
      } catch (error) {
        console.error('Error checking payment status:', error);
      }
      */
      
      // Always redirect to home page, bypassing payment verification
      navigate('/home');
    };

    checkUserStatus();

    return () => {
      isMounted = false;
    };
  }, [user, navigate]); // Only depend on user and navigate

  // Handle email login
  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError("Please enter both email and password.");
      return;
    }

    try {
      setIsLoggingIn(true);
      setError(null);
      // Clear search state before login attempt
      // clearSearch();
      
      console.log("Attempting login with:", email);
      const { error } = await signInWithEmail(email, password);
      
      if (error) {
        console.error("Login error:", error.message);
        setError(error.message);
        
        // If login fails, check if this might be a verification issue
        if (error.message.includes("Invalid") || error.message.includes("confirm")) {
          setTimeout(() => {
            toast({
              title: "Need to verify your email?",
              description: (
                <div className="flex flex-col gap-2">
                  <span>If you recently signed up, please check your email to confirm your account or</span>
                  <Button 
                    variant="outline" 
                    className="w-full text-sm"
                    onClick={() => navigate('/verify-email')}
                  >
                    Click here for verification help
                  </Button>
                </div>
              ),
              duration: 10000, // Show for 10 seconds
            });
          }, 1000);
        }
      }
    } catch (err) {
      setError("An unexpected error occurred. Please try again.");
      console.error("Login error:", err);
    } finally {
      setIsLoggingIn(false);
    }
  };

  // Handle Google login
  const handleGoogleLogin = async () => {
    try {
      setIsLoggingIn(true);
      setError(null);
      // Clear search state before login attempt
      // clearSearch();
      const { error } = await signInWithGoogle();
      if (error) {
        setError(error.message);
      }
    } catch (err) {
      setError("An unexpected error occurred. Please try again.");
      console.error("Login error:", err);
    } finally {
      setIsLoggingIn(false);
    }
  };

  // Handle email sign-up
  const handleEmailSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) throw error;

      if (data.user) {
        // Mark user as new in the database but don't show payment screen
        await markUserAsNew(data.user.id);
        
        // Don't set these states that trigger payment flow
        // setNewUserEmail(email);
        // setShowPaymentCard(true);
        
        toast({
          title: "Account created",
          description: "Please check your email to verify your account. Once verified, you can sign in to access the app.",
        });
        
        // Switch back to login view after successful signup
        setCurrentView("login");
      }
    } catch (error) {
      console.error("Error signing up:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create account",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Google sign-in
  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) throw error;
      
      // Show success toast
      toast({
        title: "Google authentication initiated",
        description: "Please complete the Google sign-in process in the popup window.",
      });
    } catch (error) {
      console.error("Error signing in with Google:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to sign in with Google",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Render redirect if user is authenticated
  if (shouldRedirect && user) {
    return <Navigate to={redirectPath} />;
  }

  // Main render
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-4">
      <Card className="w-full max-w-md shadow-lg animate-fade-in">
        <CardHeader className="text-center">
          <div className="mx-auto p-2 h-20 w-20 bg-primary rounded-full mb-4 flex items-center justify-center">
            <ShoppingCart className="h-10 w-10 text-primary-foreground" />
          </div>
          <CardTitle className="text-2xl font-bold">Welcome to Shop-Assist</CardTitle>
          <CardDescription>
            Sign in to start comparing prices and saving money on your grocery shopping
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Tabs defaultValue="login" className="w-full" value={currentView} onValueChange={setCurrentView}>
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="login">Login</TabsTrigger>
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
            </TabsList>
            
            <TabsContent value="login" className="space-y-4">
              <form onSubmit={handleEmailLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input 
                      id="email" 
                      type="email" 
                      placeholder="you@example.com"
                      className="pl-8"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={isLoggingIn}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input 
                      id="password" 
                      type="password" 
                      placeholder="••••••••"
                      className="pl-8"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={isLoggingIn}
                    />
                  </div>
                </div>
                <Button 
                  type="submit" 
                  className="w-full h-10" 
                  disabled={isLoggingIn}
                >
                  {isLoggingIn ? (
                    <>
                      <span className="mr-2 h-4 w-4 rounded-full border-2 border-current border-t-transparent animate-spin" />
                      Signing in...
                    </>
                  ) : "Sign In"}
                </Button>
              </form>
              
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">
                    Or continue with
                  </span>
                </div>
              </div>
              
              <Button 
                className="w-full h-10" 
                variant="outline"
                onClick={handleGoogleLogin}
                disabled={isLoggingIn}
              >
                {isLoggingIn ? (
                  <>
                    <span className="mr-2 h-4 w-4 rounded-full border-2 border-current border-t-transparent animate-spin" />
                    Signing in...
                  </>
                ) : (
                  <>
                    <svg
                      className="mr-2 h-4 w-4"
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      width="24"
                      height="24"
                    >
                      <path
                        fill="currentColor"
                        d="M20.283 10.356h-8.327v3.451h4.792c-.446 2.193-2.313 3.453-4.792 3.453a5.27 5.27 0 0 1-5.279-5.28 5.27 5.27 0 0 1 5.279-5.279c1.259 0 2.397.447 3.29 1.178l2.6-2.599c-1.584-1.381-3.615-2.233-5.89-2.233a8.908 8.908 0 0 0-8.934 8.934 8.907 8.907 0 0 0 8.934 8.934c4.467 0 8.529-3.249 8.529-8.934 0-.528-.081-1.097-.202-1.625z"
                      />
                    </svg>
                    Sign in with Google
                  </>
                )}
              </Button>
            </TabsContent>
            
            <TabsContent value="signup" className="space-y-4">
              <form onSubmit={handleEmailSignUp} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="fullName">Full Name</Label>
                  <div className="relative">
                    <User className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input 
                      id="fullName" 
                      type="text" 
                      placeholder="John Doe"
                      className="pl-8"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      disabled={isSigningUp}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signupEmail">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input 
                      id="signupEmail" 
                      type="email" 
                      placeholder="you@example.com"
                      className="pl-8"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={isSigningUp}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signupPassword">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input 
                      id="signupPassword" 
                      type="password" 
                      placeholder="••••••••"
                      className="pl-8"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={isSigningUp}
                    />
                  </div>
                </div>
                <Button 
                  type="submit" 
                  className="w-full h-10" 
                  disabled={isSigningUp}
                >
                  {isSigningUp ? (
                    <>
                      <span className="mr-2 h-4 w-4 rounded-full border-2 border-current border-t-transparent animate-spin" />
                      Signing up...
                    </>
                  ) : "Create Account"}
                </Button>
              </form>
              
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">
                    Or continue with
                  </span>
                </div>
              </div>
              
              <Button 
                className="w-full h-10" 
                variant="outline"
                onClick={handleGoogleSignIn}
                disabled={isSigningUp}
              >
                {isSigningUp ? (
                  <>
                    <span className="mr-2 h-4 w-4 rounded-full border-2 border-current border-t-transparent animate-spin" />
                    Signing up...
                  </>
                ) : (
                  <>
                    <svg
                      className="mr-2 h-4 w-4"
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      width="24"
                      height="24"
                    >
                      <path
                        fill="currentColor"
                        d="M20.283 10.356h-8.327v3.451h4.792c-.446 2.193-2.313 3.453-4.792 3.453a5.27 5.27 0 0 1-5.279-5.28 5.27 5.27 0 0 1 5.279-5.279c1.259 0 2.397.447 3.29 1.178l2.6-2.599c-1.584-1.381-3.615-2.233-5.89-2.233a8.908 8.908 0 0 0-8.934 8.934 8.907 8.907 0 0 0 8.934 8.934c4.467 0 8.529-3.249 8.529-8.934 0-.528-.081-1.097-.202-1.625z"
                      />
                    </svg>
                    Sign up with Google
                  </>
                )}
              </Button>
            </TabsContent>
          </Tabs>
        </CardContent>
        <CardFooter className="text-center text-sm text-muted-foreground">
          By signing in, you agree to our Terms of Service and Privacy Policy
        </CardFooter>
      </Card>
    </div>
  );
};

export default Login; 