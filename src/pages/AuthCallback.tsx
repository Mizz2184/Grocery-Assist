import { useEffect, useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Loader2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";

const AuthCallback = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    // Log information to help debug
    console.log("Auth callback initiated");
    console.log("Location:", {
      pathname: location.pathname,
      search: location.search,
      hash: location.hash,
    });

    const handleAuthCallback = async () => {
      try {
        // Get the access_token and refresh_token from URL fragment
        const hashParams = new URLSearchParams(location.hash.substring(1));
        const accessToken = hashParams.get("access_token");
        const refreshToken = hashParams.get("refresh_token");
        const type = hashParams.get("type");
        
        // Also check URL query parameters for non-hash-based auth
        const queryParams = new URLSearchParams(location.search);
        const code = queryParams.get("code");
        
        console.log("Auth parameters:", { 
          hasAccessToken: !!accessToken,
          hasRefreshToken: !!refreshToken, 
          type,
          hasCode: !!code
        });

        // Check for OAuth error
        const errorParam = hashParams.get("error") || queryParams.get("error");
        const errorDescription = hashParams.get("error_description") || queryParams.get("error_description");
        
        if (errorParam || errorDescription) {
          console.error("OAuth error:", errorParam, errorDescription);
          setError(errorDescription || "Authentication failed");
          setLoading(false);
          return;
        }
        
        // Check for email confirmation
        if (location.search.includes("email-confirmed=true") || location.search.includes("type=recovery")) {
          console.log("Email confirmed or password recovery");
          setSuccess(true);
          setLoading(false);
          return;
        }

        // Case 1: We have tokens in the URL fragment
        if (accessToken && refreshToken && type) {
          console.log("Setting session with tokens from fragment");
          
          // Set the session in Supabase
          const { error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });

          if (sessionError) {
            console.error("Session error:", sessionError);
            setError(sessionError.message);
          } else {
            setSuccess(true);
            toast({
              title: "Login successful",
              description: "You have been signed in successfully!"
            });
          }
        } 
        // Case 2: We have a code in the URL query (Authorization Code flow)
        else if (code) {
          console.log("Processing authorization code");
          // The code should be automatically processed by Supabase
          // We just need to check if we have a session
          const { data, error: sessionError } = await supabase.auth.getSession();
          
          if (sessionError) {
            console.error("Session error with code:", sessionError);
            setError(sessionError.message);
          } else if (data.session) {
            console.log("Session established with code");
            setSuccess(true);
            toast({
              title: "Login successful",
              description: "You have been signed in successfully!"
            });
          } else {
            console.error("No session with code");
            setError("Failed to establish a session. Please try logging in again.");
          }
        }
        // Case 3: No tokens or code, try to check if we already have a session
        else {
          console.log("No tokens or code, checking for existing session");
          const { data, error: sessionError } = await supabase.auth.getSession();
          
          if (sessionError) {
            console.error("Session check error:", sessionError);
            setError(sessionError.message);
          } else if (data.session) {
            console.log("Existing session found");
            setSuccess(true);
          } else {
            console.error("No session found");
            setError("No authentication data found. Please try logging in again.");
          }
        }
      } catch (err) {
        console.error("Auth callback error:", err);
        setError("An unexpected error occurred during authentication");
      } finally {
        setLoading(false);
      }
    };

    handleAuthCallback();
  }, [location, toast, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-4">
        <Card className="w-full max-w-md shadow-lg">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold">Verifying your account</CardTitle>
            <CardDescription>Please wait while we verify your credentials</CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center py-6">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-4">
        <Card className="w-full max-w-md shadow-lg">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold text-destructive">Authentication Failed</CardTitle>
            <CardDescription>There was a problem verifying your account</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
            <div className="flex justify-center">
              <Button onClick={() => navigate("/login")}>
                Return to Login
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (success) {
    return <Navigate to="/" replace />;
  }

  return null;
};

export default AuthCallback; 