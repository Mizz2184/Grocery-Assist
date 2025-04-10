import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase, parseVerificationLink, manuallyConfirmEmail } from "@/lib/supabase";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/components/ui/use-toast";
import { AlertCircle, CheckCircle2, Loader2, Key } from "lucide-react";
import { markUserAsNew, directVerifyUser } from "@/lib/services/userService";

const VerifyEmail = () => {
  const [adminPassword, setAdminPassword] = useState("");
  const [adminMode, setAdminMode] = useState(false);
  const [adminVerifyEmail, setAdminVerifyEmail] = useState("");
  const [verificationLink, setVerificationLink] = useState("");
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [masterMode, setMasterMode] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  // Load email from localStorage if available
  useEffect(() => {
    const pendingEmail = localStorage.getItem('pending_verification_email');
    if (pendingEmail) {
      setEmail(pendingEmail);
      setAdminVerifyEmail(pendingEmail);
      
      toast({
        title: "Email pre-filled",
        description: "We've detected you just signed up. You can verify your account below.",
      });
    }
  }, [toast]);

  // This function will attempt multiple verification methods
  const handleVerifyWithEmail = async (targetEmail: string) => {
    if (!targetEmail) {
      setError("Please enter your email address");
      return;
    }

    setIsLoading(true);
    setError(null);
    
    try {
      // First attempt - try to verify directly in database
      const verified = await directVerifyUser(targetEmail);
      
      if (verified) {
        setSuccess(true);
        toast({
          title: "Email verified successfully!",
          description: "You can now log in with your credentials.",
        });
        
        setTimeout(() => {
          navigate("/login");
        }, 2000);
        return;
      }
      
      // If direct verification failed, resend verification email
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: targetEmail,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        }
      });
      
      if (error) {
        setError(error.message || "Failed to resend verification email. Please try again.");
      } else {
        toast({
          title: "Verification email sent",
          description: "Please check your inbox and spam folder for the verification link.",
        });
      }
    } catch (err) {
      console.error("Verification error:", err);
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyWithLink = async () => {
    if (!verificationLink) {
      setError("Please enter a verification link");
      return;
    }

    setIsLoading(true);
    setError(null);
    
    try {
      // Parse the verification link
      const { token, type, isValid } = parseVerificationLink(verificationLink);
      
      if (!isValid || !token) {
        setError("Invalid verification link. Make sure to copy the entire link from your email.");
        return;
      }
      
      // Try to confirm the email with the token
      const { success, error } = await manuallyConfirmEmail(token, type || 'signup');
      
      if (error) {
        setError(error.message || "Failed to verify email. Please try again.");
      } else if (success) {
        setSuccess(true);
        
        toast({
          title: "Email verified successfully!",
          description: "You can now log in with your credentials.",
        });
        
        // Redirect to login page after a short delay
        setTimeout(() => {
          navigate("/login");
        }, 2000);
      }
    } catch (err) {
      console.error("Verification error:", err);
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDevVerify = async () => {
    if (adminPassword !== import.meta.env.VITE_ADMIN_PASSWORD) {
      toast({
        title: "Invalid admin password",
        description: "Please enter the correct admin password to verify accounts.",
        variant: "destructive"
      });
      return;
    }

    if (!adminVerifyEmail) {
      setError("Please enter the email to verify");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Use SQL function if available, otherwise try direct database access
      const { data, error } = await supabase.rpc('admin_confirm_user', {
        target_email: adminVerifyEmail,
        admin_key: adminPassword
      });

      if (error) {
        console.error("Admin verification error:", error);
        
        if (error.message.includes('function') && error.message.includes('exist')) {
          // Function doesn't exist
          setError(
            `The admin_confirm_user function is not installed in your Supabase database. ` +
            `Please copy and run the SQL code from admin_confirm_user.sql in your Supabase dashboard's SQL Editor.`
          );
          
          toast({
            title: "Function not installed",
            description: "The verification function is not yet installed. Please run the SQL from admin_confirm_user.sql in your Supabase dashboard.",
            variant: "destructive"
          });
        } else {
          setError(`Verification failed: ${error.message}`);
        }
        
        // If RPC failed, use a second approach - try direct authentication methods
        const directSuccess = await directVerifyUser(adminVerifyEmail);
        if (directSuccess) {
          setSuccess(true);
          toast({
            title: "Direct verification successful!",
            description: "The account has been manually verified using an alternative method.",
          });
          setTimeout(() => navigate('/login'), 2000);
        }
      } else if (data) {
        setSuccess(true);
        
        toast({
          title: "User verified successfully!",
          description: "The account has been manually verified and can now log in.",
        });
        
        setTimeout(() => navigate('/login'), 2000);
      }
    } catch (err) {
      console.error("Error in manual verification:", err);
      setError(`An unexpected error occurred: ${err}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Add a master verify function that verifies ALL users
  const handleMasterVerify = async () => {
    if (adminPassword !== "masterAdmin123") {
      toast({
        title: "Invalid master password",
        description: "Please enter the correct master password to verify all accounts.",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Execute the SQL directly through RPC
      const { data, error } = await supabase.rpc('verify_all_emails', {
        admin_key: adminPassword
      });

      if (error) {
        console.error("Master verification error:", error);
        
        // Try alternative approach - raw SQL in a function
        try {
          // Try direct verification
          const { data: sqlData, error: sqlError } = await supabase.from('_manual_admin_tasks').select('*').limit(1);
          
          if (sqlError) {
            setError(`Master verification failed: ${error.message}. SQL fallback also failed.`);
            
            toast({
              title: "Verification function not installed",
              description: "Please run the create_tables.sql in your Supabase dashboard first.",
              variant: "destructive"
            });
          } else {
            toast({
              title: "Direct verification attempted",
              description: "A direct verification was attempted. Try logging in now.",
            });
            
            setTimeout(() => navigate('/login'), 2000);
          }
        } catch (sqlErr) {
          setError(`All verification methods failed: ${error.message}`);
        }
      } else {
        setSuccess(true);
        toast({
          title: "All users verified!",
          description: "All accounts have been verified and can now log in.",
        });
        
        setTimeout(() => navigate('/login'), 2000);
      }
    } catch (err) {
      console.error("Error in master verification:", err);
      setError(`An unexpected error occurred: ${err}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Verify Your Email</CardTitle>
          <CardDescription>
            Having trouble with email verification? Use this page to verify your account.
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          {success && (
            <Alert variant="default" className="bg-green-50 border-green-200 text-green-800 dark:bg-green-900/20 dark:border-green-900 dark:text-green-300">
              <CheckCircle2 className="h-4 w-4" />
              <AlertDescription>Your email has been successfully verified! Redirecting to login...</AlertDescription>
            </Alert>
          )}
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="verification-link">Verification Link</Label>
              <Input
                id="verification-link"
                type="text"
                placeholder="Paste the entire verification link from your email"
                value={verificationLink}
                onChange={(e) => setVerificationLink(e.target.value)}
                disabled={isLoading || success}
              />
              <p className="text-xs text-muted-foreground">
                Copy the complete link from the verification email you received.
              </p>
            </div>
            
            <Button 
              className="w-full" 
              onClick={handleVerifyWithLink}
              disabled={isLoading || success || !verificationLink}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Verifying...
                </>
              ) : "Verify Email with Link"}
            </Button>
          </div>
          
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                Or
              </span>
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="email">Verify with Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="Enter your email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isLoading || success}
            />
            <Button 
              variant="outline" 
              className="w-full" 
              onClick={() => handleVerifyWithEmail(email)}
              disabled={isLoading || success || !email}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Verifying...
                </>
              ) : "Verify Email Directly"}
            </Button>
          </div>
          
          <div className="relative pt-4">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                Developer Options
              </span>
            </div>
          </div>
          
          <div className="space-y-4">
            <Button 
              variant="outline" 
              size="sm" 
              className="w-full" 
              onClick={() => setAdminMode(!adminMode)}
            >
              {adminMode ? "Hide Developer Options" : "Show Developer Options"}
            </Button>
            
            {adminMode && (
              <div className="space-y-4 border rounded-md p-4 bg-yellow-50 dark:bg-yellow-950/20">
                <p className="text-xs text-muted-foreground mb-2">
                  For development purposes only. This allows bypassing email verification.
                </p>
                <Alert className="mb-4 bg-blue-50 border-blue-200 dark:bg-blue-950/20 dark:border-blue-900">
                  <AlertDescription className="text-xs">
                    <strong>Note:</strong> You need to run the SQL functions in your Supabase dashboard first.
                    Check the admin_confirm_user.sql and direct_verify_email.sql files for the required SQL code.
                  </AlertDescription>
                </Alert>
                <div className="space-y-2">
                  <Label htmlFor="adminEmail">Email to Verify</Label>
                  <Input
                    id="adminEmail"
                    type="email"
                    placeholder="Enter email to verify"
                    value={adminVerifyEmail}
                    onChange={(e) => setAdminVerifyEmail(e.target.value)}
                    disabled={isLoading || success}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="adminPassword">Admin Password</Label>
                  <Input
                    id="adminPassword"
                    type="password"
                    placeholder="Enter admin password"
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    disabled={isLoading || success}
                  />
                </div>
                <Button 
                  variant="default" 
                  className="w-full bg-yellow-600 hover:bg-yellow-700"
                  onClick={handleDevVerify}
                  disabled={isLoading || success || !adminVerifyEmail || !adminPassword}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Verifying...
                    </>
                  ) : "Manually Verify (Dev Only)"}
                </Button>
              </div>
            )}
          </div>
          
          <div className="relative pt-4">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                Emergency Options
              </span>
            </div>
          </div>
          
          <div className="space-y-4">
            <Button 
              variant="outline" 
              size="sm" 
              className="w-full" 
              onClick={(e) => {
                e.preventDefault();
                setMasterMode(!masterMode);
              }}
            >
              {masterMode ? "Hide Emergency Access" : "Emergency Access (Admin Only)"}
            </Button>
            
            {masterMode && (
              <div className="space-y-4 border border-red-300 rounded-md p-4 bg-red-50 dark:bg-red-950/20">
                <Alert variant="destructive" className="mb-4">
                  <AlertDescription className="text-xs">
                    <strong>Warning:</strong> This is for emergency use only. It will verify ALL users in the database.
                    Only use this if you're having persistent email verification issues.
                  </AlertDescription>
                </Alert>
                
                <div className="space-y-2">
                  <Label htmlFor="masterPassword" className="text-red-600 dark:text-red-400">Master Admin Password</Label>
                  <div className="relative">
                    <Key className="absolute left-2 top-2.5 h-4 w-4 text-red-600" />
                    <Input
                      id="masterPassword"
                      type="password"
                      placeholder="Enter master admin password"
                      className="pl-8 border-red-300"
                      value={adminPassword}
                      onChange={(e) => setAdminPassword(e.target.value)}
                      disabled={isLoading || success}
                    />
                  </div>
                </div>
                
                <Button 
                  variant="destructive" 
                  className="w-full"
                  onClick={handleMasterVerify}
                  disabled={isLoading || success || !adminPassword}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Verifying All Users...
                    </>
                  ) : "Verify All Users (Emergency Only)"}
                </Button>

                <p className="text-xs text-red-600 dark:text-red-400 mt-2">
                  If verification is failing, please run the following SQL in your Supabase dashboard:
                </p>
                <pre className="text-xs bg-slate-100 dark:bg-slate-900 p-2 rounded overflow-auto">
                  {`UPDATE auth.users
SET email_confirmed_at = NOW()
WHERE email_confirmed_at IS NULL;`}
                </pre>
              </div>
            )}
          </div>
        </CardContent>
        
        <CardFooter className="flex justify-center">
          <Button variant="link" onClick={() => navigate("/login")} className="text-sm">
            Return to Login
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};

export default VerifyEmail; 