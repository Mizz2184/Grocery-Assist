import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Copy, Check, Share2, Plus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { addCollaborator } from "@/lib/services/groceryListService";
import { useToast } from "@/components/ui/use-toast";
import { Label } from "@/components/ui/label";
import { supabase } from "@/lib/supabase";
import { diagnoseSharedList } from "@/utils/debugUtils";

export function ShareGroceryList({ listId, userId, listName }: { 
  listId: string; 
  userId: string;
  listName: string;
}) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [sharing, setSharing] = useState(false);
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();
  const [listStatus, setListStatus] = useState<{exists: boolean, error?: string} | null>(null);

  const shareUrl = `${window.location.origin}/shared-list/${listId}`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({
        title: "Link copied",
        description: "The sharing link has been copied to your clipboard.",
      });
    });
  };

  const handleShare = async () => {
    if (!email.trim()) {
      toast({
        title: "Email required",
        description: "Please enter an email address to share with.",
        variant: "destructive",
      });
      return;
    }

    if (!email.includes('@') || !email.includes('.')) {
      toast({
        title: "Invalid email",
        description: "Please enter a valid email address.",
        variant: "destructive",
      });
      return;
    }

    setSharing(true);
    
    try {
      // First, verify the list exists in the database
      await verifyListExists();
      
      if (listStatus?.error) {
        toast({
          title: "Error",
          description: listStatus.error,
          variant: "destructive",
        });
        setSharing(false);
        return;
      }
      
      // Proceed with sharing
      const result = await addCollaborator(userId, listId, email);
      
      if (result) {
        toast({
          title: "List shared",
          description: `Successfully shared "${listName}" with ${email}`,
        });
        setEmail("");
        setOpen(false);
      } else {
        toast({
          title: "Error",
          description: "Failed to share the list. Please try again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error sharing list:", error);
      toast({
        title: "Error",
        description: "An error occurred while sharing the list.",
        variant: "destructive",
      });
    } finally {
      setSharing(false);
    }
  };
  
  const verifyListExists = async () => {
    try {
      console.log(`Verifying list exists: ${listId}`);
      
      // Check if the list exists in the database
      const { data, error } = await supabase
        .from('grocery_lists')
        .select('id, name')
        .eq('id', listId)
        .maybeSingle();
        
      if (error) {
        console.error("Error verifying list:", error);
        setListStatus({ exists: false, error: "Error verifying list existence" });
        return;
      }
      
      if (!data) {
        console.error(`List not found in database: ${listId}`);
        setListStatus({ exists: false, error: "This list doesn't exist in the database and cannot be shared." });
        
        // In dev mode, run diagnostic
        if (import.meta.env.DEV) {
          console.log("Running diagnostics on list...");
          await diagnoseSharedList(listId);
        }
        
        return;
      }
      
      console.log(`List verified: ${data.id} - ${data.name}`);
      setListStatus({ exists: true });
    } catch (error) {
      console.error("Verification error:", error);
      setListStatus({ exists: false, error: "Failed to verify list existence" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button 
          size="sm" 
          variant="outline" 
          className="rounded-full flex items-center gap-2"
          onClick={() => {
            // Verify list exists when opening dialog
            verifyListExists();
          }}
        >
          <Share2 className="h-4 w-4" />
          Share
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Share grocery list</DialogTitle>
          <DialogDescription>
            Share your grocery list "{listName}" with others via email or copy the link.
          </DialogDescription>
        </DialogHeader>
        
        {listStatus?.error ? (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
            <strong className="font-bold">Error: </strong>
            <span className="block sm:inline">{listStatus.error}</span>
          </div>
        ) : (
          <>
            <div className="flex items-center space-x-2">
              <div className="grid flex-1 gap-2">
                <Label htmlFor="link" className="sr-only">
                  Link
                </Label>
                <Input
                  id="link"
                  readOnly
                  value={shareUrl}
                  className="w-full"
                />
              </div>
              <Button 
                type="button" 
                size="sm" 
                className="px-3" 
                onClick={copyToClipboard}
              >
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                <span className="sr-only">Copy</span>
              </Button>
            </div>
            
            <div className="grid gap-4">
              <div>
                <Label htmlFor="email" className="text-sm font-medium">
                  Or add people via email:
                </Label>
                <div className="flex items-center space-x-2 mt-1">
                  <Input 
                    id="email" 
                    placeholder="Email address" 
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                  <Button 
                    onClick={handleShare} 
                    disabled={sharing || !email.trim()}
                    className="flex items-center gap-1"
                  >
                    {sharing ? (
                      <span className="h-4 w-4 rounded-full border-2 border-current border-t-transparent animate-spin" />
                    ) : (
                      <Plus className="h-4 w-4" />
                    )}
                    Add
                  </Button>
                </div>
              </div>
            </div>
          </>
        )}
        
        <DialogFooter className="sm:justify-start">
          <Button
            type="button"
            variant="secondary"
            onClick={() => setOpen(false)}
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 