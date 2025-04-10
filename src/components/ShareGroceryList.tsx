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
        <Button variant="outline" size="sm" className="flex items-center gap-2">
          <Share2 className="h-4 w-4" />
          Share List
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Share grocery list</DialogTitle>
          <DialogDescription>
            Anyone with the link can view your list. Add collaborators by email to allow them to edit.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <div className="grid flex-1 gap-2">
              <Label htmlFor="link" className="sr-only">
                Share link
              </Label>
              <Input
                id="link"
                readOnly
                className="font-mono"
                value={shareUrl}
              />
            </div>
            <Button 
              type="button" 
              size="icon" 
              variant={copied ? "secondary" : "outline"} 
              onClick={copyToClipboard}
            >
              {copied ? (
                <Check className="h-4 w-4" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          </div>
          
          <div>
            <Label htmlFor="collaborator" className="text-xs text-muted-foreground">
              Add a collaborator with edit permissions
            </Label>
            <div className="flex mt-1 space-x-2">
              <Input
                id="collaborator"
                placeholder="Email address"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="flex-1"
              />
              <Button 
                type="button"
                onClick={handleShare}
                disabled={sharing}
              >
                {sharing ? (
                  <>
                    <Plus className="mr-2 h-4 w-4 animate-spin" />
                    Adding...
                  </>
                ) : (
                  <>
                    <Plus className="mr-2 h-4 w-4" />
                    Add
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
        
        <DialogFooter className="sm:justify-start">
          <Button
            type="button"
            variant="secondary"
            onClick={() => setOpen(false)}
          >
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 