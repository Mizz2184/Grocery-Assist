import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { GroceryListItem } from "@/components/GroceryListItem";
import { Button } from "@/components/ui/button";
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardDescription, 
  CardContent,
  CardFooter 
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui/use-toast";
import { 
  ShoppingCart, 
  ArrowLeft, 
  Check, 
  Share2,
  Plus,
  User,
  Copy,
  Terminal,
  Search
} from "lucide-react";
import { GroceryList as GroceryListType } from "@/utils/productData";
import { getSharedGroceryListById, addCollaborator, updateListItem, deleteGroceryListItem, verifyListExists, addItemToSharedList } from "@/lib/services/groceryListService";
import { convertCRCtoUSD } from "@/utils/currencyUtils";
import { supabase } from "@/lib/supabase";
import { diagnoseSharedList, fixCollaboratorArray } from "@/utils/debugUtils";
import { getProductStore, storeOrder, storeNames, storeColors, STORE } from "@/utils/storeUtils";
import { useSearch, Product } from "@/hooks/useSearch";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { v4 as uuidv4 } from "uuid";

// Helper functions
const getProductPrice = (product: any): number => {
  if (!product) return 0;
  
  // Use type assertion to avoid TypeScript errors
  const anyProduct = product as any;
  
  // Direct price property
  if (typeof anyProduct.price === 'number') return anyProduct.price;
  
  // If product has prices array
  if (anyProduct.prices && Array.isArray(anyProduct.prices) && anyProduct.prices.length > 0) {
    return anyProduct.prices[0].price || 0;
  }
  
  return 0;
};

// Define store groups for rendering section headers
const storeGroupNames: { [key: string]: string } = storeNames;

// Helper function to update a list item
const handleUpdateListItem = async (sharedList: GroceryListType, user: any, toast: any, setSharedList: React.Dispatch<React.SetStateAction<GroceryListType | null>>, itemId: string, updates: any) => {
  if (!user || !sharedList) {
    toast({
      title: "Error",
      description: "You must be logged in to update items.",
      variant: "destructive",
    });
    return;
  }

  try {
    // Optimistically update local state first for responsive UI
    setSharedList(prev => {
      if (!prev) return null;

      return {
        ...prev,
        items: prev.items.map(item => 
          item.id === itemId ? { ...item, ...updates } : item
        )
      };
    });

    // Call the API to update the item
    const { success, message } = await updateListItem(
      sharedList.id,
      itemId,
      user.id,
      updates
    );

    if (!success) {
      console.error('Error updating item:', message);
      toast({
        title: "Update Failed",
        description: "Failed to update the item on the server.",
        variant: "destructive",
      });
    }
  } catch (error) {
    console.error('Error updating list item:', error);
    toast({
      title: "Error",
      description: "An error occurred while updating the item.",
      variant: "destructive",
    });
  }
};

// Helper function to remove a list item
const handleRemoveListItem = async (sharedList: GroceryListType, user: any, toast: any, setSharedList: React.Dispatch<React.SetStateAction<GroceryListType | null>>, itemId: string) => {
  if (!user || !sharedList) {
    toast({
      title: "Error",
      description: "You must be logged in to remove items.",
      variant: "destructive",
    });
    return;
  }

  try {
    // Optimistically update local state first for responsive UI
    setSharedList(prev => {
      if (!prev) return null;

      return {
        ...prev,
        items: prev.items.filter(item => item.id !== itemId)
      };
    });

    // Call the API to delete the item with listId and userId for notifications
    const success = await deleteGroceryListItem(itemId, sharedList.id, user?.id);

    if (!success) {
      console.error('Error removing item from database');
      toast({
        title: "Delete Failed",
        description: "Failed to remove the item from the server.",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Item Removed",
        description: "The item has been removed from the list.",
      });
    }
  } catch (error) {
    console.error('Error removing list item:', error);
    toast({
      title: "Error",
      description: "An error occurred while removing the item.",
      variant: "destructive",
    });
  }
};

const SharedList = () => {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { listId } = useParams<{ listId: string }>();
  const { query, searchResults } = useSearch();
  
  const [sharedList, setSharedList] = useState<GroceryListType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [accessRequested, setAccessRequested] = useState(false);
  const [requestingAccess, setRequestingAccess] = useState(false);
  const [notAuthorized, setNotAuthorized] = useState(false);
  const [requestingAccessInfo, setRequestingAccessInfo] = useState<{ listId: string; listName: string; listOwner: string } | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [hasEditPermission, setHasEditPermission] = useState(false);
  const [isAddingProduct, setIsAddingProduct] = useState(false);

  // Toggle edit mode
  const toggleEditMode = () => {
    // Only allow toggling edit mode if the user has permission
    if (sharedList?.hasEditPermission) {
      setEditMode(!editMode);
    } else {
      toast({
        title: "Permission denied",
        description: "You don't have permission to edit this list. Only the owner and collaborators can edit.",
        variant: "destructive",
      });
    }
  };

  // Fetch shared list
  useEffect(() => {
    const fetchSharedList = async () => {
      if (!listId) {
        setError("No list ID provided");
        setLoading(false);
        return;
      }
      
      try {
        setLoading(true);
        setError(null);
        
        console.log("Fetching shared list with userId:", user?.id || 'anonymous');
        
        // First verify if the list exists
        const listExists = await verifyListExists(listId);
        if (!listExists) {
          setError("The grocery list does not exist or may have been deleted.");
          setLoading(false);
          return;
        }
        
        // Attempt to fetch list with or without user authentication
        // If userId is not provided, the list will be fetched in view-only mode
        const list = await getSharedGroceryListById(
          user?.id || 'anonymous', 
          listId
        );
        
        if (!list) {
          setError("Could not load the grocery list. Please try again.");
          setLoading(false);
          return;
        }
        
        setSharedList(list);
        setHasEditPermission(list.hasEditPermission);
        
        // If we have a list but no edit permission and user is logged in, display a toast message
        if (list && !list.hasEditPermission && user) {
          toast({
            title: "View-only access",
            description: "You can view this shared list but don't have permission to edit it.",
          });
        } else if (!user) {
          toast({
            title: "View-only mode",
            description: "Sign in to add collaborators or edit this list if you have permission.",
          });
        }
        
        console.log("Shared list fetched successfully", list);
      } catch (err: any) {
        console.error("Error fetching shared list:", err);
        setError(err.message || "Failed to load the shared grocery list");
        
        toast({
          title: "Error loading list",
          description: err.message || "Could not load the grocery list. Please check the URL and try again.",
          variant: "destructive",
        });
        
        // Check if this is a permission error
        if (err.message && err.message.includes("permission")) {
          setNotAuthorized(true);
        }
      } finally {
        setLoading(false);
      }
    };

    // Only fetch if we have a listId
    if (listId) {
      fetchSharedList();
    }
  }, [listId, user?.id, toast]);

  const handleBackToLists = () => {
    navigate('/grocery-list');
  };
  
  const handleCopyLink = () => {
    const shareUrl = `${window.location.origin}/shared-list/${listId}`;
    
    navigator.clipboard.writeText(shareUrl).then(() => {
      toast({
        title: "Link copied",
        description: "The sharing link has been copied to your clipboard.",
      });
    });
  };

  const calculateTotalPrice = () => {
    if (!sharedList) return { total: 0, currency: '₡' };
    
    let total = 0;
    let currency = '₡';
    
    sharedList.items.forEach(item => {
      if (item.productData) {
        // Use the helper function
        const itemPrice = getProductPrice(item.productData);
        total += itemPrice * item.quantity;
      }
    });
    
    return { total, currency };
  };

  const formatCurrency = (amount: number) => {
    return amount.toLocaleString('es-CR', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });
  };

  // Format USD currency
  const formatUSD = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };
  
  // Handle requesting access to the list
  const handleRequestAccess = async () => {
    if (!user || !user.email || !listId) {
      toast({
        title: "Error",
        description: "You must be logged in to request access.",
        variant: "destructive",
      });
      return;
    }
    
    setRequestingAccess(true);
    
    try {
      // Get list owner information
      const { data: listData, error: listError } = await supabase
        .from('grocery_lists')
        .select('id, name, user_id')
        .eq('id', listId)
        .single();
        
      if (listError) {
        throw new Error('Failed to get list information');
      }
      
      // Fetch list owner's details to display who shared the list
      const { data: ownerData, error: ownerError } = await supabase
        .from('users')
        .select('id, name, user_id')
        .eq('id', listData.user_id)
        .single();
        
      if (ownerError) {
        throw new Error('Failed to get owner information');
      }
      
      // Create a notification for the list owner
      await supabase
        .from('notifications')
        .insert({
          user_id: listData.user_id,
          type: 'access_request',
          content: `${user.email} is requesting access to your list "${listData.name}"`,
          metadata: {
            listId: listId,
            listName: listData.name,
            requesterId: user.id,
            requesterEmail: user.email
          },
          is_read: false,
          created_at: new Date().toISOString()
        });
      
      setAccessRequested(true);
      
      toast({
        title: "Access requested",
        description: "Your request has been sent to the list owner. You'll be notified when access is granted.",
      });
    } catch (error) {
      console.error('Error requesting access:', error);
      toast({
        title: "Error",
        description: "Failed to request access. Please try again later.",
        variant: "destructive",
      });
    } finally {
      setRequestingAccess(false);
    }
  };
  
  // Handle accepting an invitation
  const handleAcceptInvitation = async () => {
    if (!user || !user.email || !listId) {
      toast({
        title: "Error",
        description: "You must be logged in to accept the invitation.",
        variant: "destructive",
      });
      return;
    }
    
    setRequestingAccess(true);
    
    try {
      // Get list information
      const { data: listData, error: listError } = await supabase
        .from('grocery_lists')
        .select('id, name, user_id, collaborators')
        .eq('id', listId)
        .single();
        
      if (listError) {
        throw new Error('Failed to get list information');
      }
      
      // Verify user is invited
      const isInvited = listData.collaborators && 
        listData.collaborators.includes(user.email.toLowerCase());
        
      if (!isInvited) {
        toast({
          title: "Not invited",
          description: "You don't have an invitation to this list.",
          variant: "destructive",
        });
        setRequestingAccess(false);
        return;
      }
      
      // No need to update collaborators as the user is already in the list
      // Just fetch the list again to gain access
      const list = await getSharedGroceryListById(user.id, listId);
      
      if (list) {
        setSharedList(list);
        setError(null);
        
        toast({
          title: "Access granted",
          description: "You now have access to this grocery list.",
        });
      } else {
        throw new Error('Failed to access the list');
      }
    } catch (error) {
      console.error('Error accepting invitation:', error);
      toast({
        title: "Error",
        description: "Failed to accept the invitation. Please try again later.",
        variant: "destructive",
      });
    } finally {
      setRequestingAccess(false);
    }
  };

  // Regular component methods
  const handleUpdateItem = (itemId: string, updates: any) => {
    handleUpdateListItem(sharedList!, user!, toast, setSharedList, itemId, updates);
  };

  const handleRemoveItem = (itemId: string) => {
    handleRemoveListItem(sharedList!, user!, toast, setSharedList, itemId);
  };

  const handleAddProduct = async (product: Product) => {
    if (!sharedList || !listId || !user) return;
    
    try {
      setIsAddingProduct(true);
      const newItem: GroceryListItem = {
        id: uuidv4(),
        productId: product.id,
        name: product.name,
        brand: product.brand,
        price: product.price,
        currency: product.currency,
        store: product.store,
        checked: false,
        quantity: 1,
        unit: product.unit || 'unit',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // Add item to the shared list
      const updatedList = await addItemToSharedList(listId, newItem);
      setSharedList(updatedList);

      toast({
        title: "Product Added",
        description: `${product.name} has been added to the shared list.`,
      });
    } catch (error) {
      console.error('Error adding product:', error);
      toast({
        title: "Error",
        description: "Failed to add the product to the list.",
        variant: "destructive",
      });
    } finally {
      setIsAddingProduct(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 pb-16">
        <Button 
          variant="ghost" 
          className="mb-4" 
          onClick={handleBackToLists}
        >
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Lists
        </Button>
        <div className="flex flex-col gap-4">
          <div className="h-8 w-1/3 bg-gray-200 animate-pulse rounded"></div>
          <div className="h-4 w-1/4 bg-gray-200 animate-pulse rounded"></div>
          <div className="mt-4 grid gap-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-20 bg-gray-200 animate-pulse rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    const listExists = error.includes("don't have access") || error.includes("accept the invitation");
    const isInvited = error.includes("accept the invitation");
    
    return (
      <div className="container mx-auto px-4 pb-16">
        <Button 
          variant="ghost" 
          className="mb-4" 
          onClick={handleBackToLists}
        >
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Lists
        </Button>
        
        <Card className="overflow-hidden">
          <CardHeader>
            <CardTitle className="text-xl">
              {isInvited ? "Invitation Pending" : "Access Error"}
            </CardTitle>
            <CardDescription>
              {error}
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            {isInvited && user ? (
              <Button 
                className="w-full"
                onClick={handleAcceptInvitation}
                disabled={requestingAccess}
              >
                {requestingAccess ? (
                  <>
                    <span className="h-4 w-4 rounded-full border-2 border-current border-t-transparent animate-spin mr-2" />
                    Accepting Invitation...
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4 mr-2" />
                    Accept Invitation
                  </>
                )}
              </Button>
            ) : listExists && !accessRequested && user ? (
              <Button 
                className="w-full"
                onClick={handleRequestAccess}
                disabled={requestingAccess}
              >
                {requestingAccess ? (
                  <>
                    <span className="h-4 w-4 rounded-full border-2 border-current border-t-transparent animate-spin mr-2" />
                    Requesting Access...
                  </>
                ) : (
                  <>
                    <User className="h-4 w-4 mr-2" />
                    Request Access
                  </>
                )}
              </Button>
            ) : accessRequested ? (
              <div className="bg-muted px-4 py-3 rounded-lg text-sm">
                Access request sent. The list owner will review your request.
              </div>
            ) : !user ? (
              <div className="space-y-4">
                <p>You need to sign in to request access to this list.</p>
                <Button
                  onClick={() => navigate(`/login?redirect=/shared-list/${listId}`)}
                  className="w-full"
                >
                  Sign In
                </Button>
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!sharedList) {
    return (
      <div className="page-container">
        <div className="flex flex-col items-center justify-center py-16 text-center max-w-md mx-auto gap-6">
          <div className="rounded-full bg-muted p-4">
            <ShoppingCart className="w-12 h-12 text-muted-foreground" />
          </div>
          <h1 className="text-3xl font-bold">List Not Found</h1>
          <p className="text-muted-foreground">
            The grocery list you're looking for doesn't exist or you don't have access to it.
          </p>
          <Button 
            className="rounded-full h-12 px-8"
            onClick={handleBackToLists}
          >
            Back to My Lists
          </Button>
        </div>
      </div>
    );
  }

  const { total, currency } = calculateTotalPrice();
  
  if (notAuthorized) {
    return (
      <div className="page-container">
        <div className="flex flex-col items-center justify-center py-16 text-center max-w-md mx-auto gap-6">
          <div className="rounded-full bg-muted p-4">
            <ShoppingCart className="w-12 h-12 text-muted-foreground" />
          </div>
          <h1 className="text-3xl font-bold">Access Denied</h1>
          <p className="text-muted-foreground">
            {error || "The shared list could not be found or you don't have permission to view it."}
          </p>
          
          <div className="bg-muted p-4 rounded-lg text-sm text-left w-full">
            <p className="font-medium mb-2">Why am I seeing this?</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>You're not on the collaborators list for this grocery list</li>
              <li>You might be signed in with a different email than the one invited</li>
              <li>The list owner needs to add your email: <strong>{user?.email}</strong></li>
            </ul>
          </div>
          
          {user && requestingAccessInfo && !accessRequested && (
            <Button 
              className="rounded-full h-12 px-8 flex items-center gap-2"
              onClick={handleRequestAccess}
              disabled={requestingAccess}
            >
              {requestingAccess ? (
                <>
                  <span className="h-4 w-4 rounded-full border-2 border-current border-t-transparent animate-spin" />
                  Requesting Access...
                </>
              ) : (
                <>
                  <User className="h-5 w-5" />
                  Request Access
                </>
              )}
            </Button>
          )}
          
          {accessRequested && (
            <div className="bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 px-4 py-3 rounded-lg text-sm">
              Access request sent. The list owner will review your request.
            </div>
          )}
          
          <Button 
            className="rounded-full"
            onClick={handleBackToLists}
          >
            Back to My Lists
          </Button>
          
          {import.meta.env.DEV && requestingAccessInfo && (
            <div className="mt-4 p-3 bg-muted rounded text-left text-xs text-muted-foreground overflow-auto w-full">
              <div className="font-semibold mb-1">Debug Info:</div>
              <div>List ID: {requestingAccessInfo.listId}</div>
              <div>List Name: {requestingAccessInfo.listName}</div>
              <div>Owner ID: {requestingAccessInfo.listOwner}</div>
              <div>Your Email: {user?.email}</div>
              
              <div className="mt-3 flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => diagnoseSharedList(requestingAccessInfo.listId, user?.email || '')}
                >
                  <Terminal className="w-3 h-3 mr-1" />
                  Diagnose Access
                </Button>
                
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => fixCollaboratorArray(requestingAccessInfo.listId)}
                >
                  <Terminal className="w-3 h-3 mr-1" />
                  Fix Collaborators
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 pb-16">
      <Button 
        variant="ghost" 
        className="mb-4" 
        onClick={handleBackToLists}
      >
        <ArrowLeft className="mr-2 h-4 w-4" /> Back to My Lists
      </Button>
      
      {loading ? (
        <div className="flex flex-col gap-4">
          <div className="h-8 w-1/3 bg-gray-200 animate-pulse rounded"></div>
          <div className="h-4 w-1/4 bg-gray-200 animate-pulse rounded"></div>
          <div className="mt-4 grid gap-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-20 bg-gray-200 animate-pulse rounded"></div>
            ))}
          </div>
        </div>
      ) : error ? (
        <Card className="mb-4">
          <CardHeader>
            <CardTitle className="text-red-500">Error Loading List</CardTitle>
            <CardDescription>
              {error}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p>There was a problem loading this shared grocery list. Please check that you have the correct link.</p>
          </CardContent>
        </Card>
      ) : sharedList ? (
        <>
          <Card className="mb-4 overflow-hidden">
            <CardHeader className="pb-2">
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-2xl font-bold">{sharedList.name}</CardTitle>
                  <CardDescription>
                    Shared by {sharedList.createdBy}
                    {sharedList.createdAt && (
                      <div className="text-xs text-muted-foreground mt-1">
                        Created {new Date(sharedList.createdAt).toLocaleDateString('en-US', { 
                          year: 'numeric', 
                          month: 'short', 
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </div>
                    )}
                  </CardDescription>
                </div>
                
                <div className="flex gap-2">
                  {user ? (
                    <Button 
                      variant={editMode ? "outline" : "secondary"} 
                      size="sm" 
                      onClick={toggleEditMode}
                      disabled={!sharedList.hasEditPermission}
                    >
                      {editMode ? "View Mode" : "Edit Mode"}
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      onClick={() => navigate(`/login?redirect=/shared-list/${listId}`)}
                    >
                      Sign in to edit
                    </Button>
                  )}
                  
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleCopyLink}
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    Copy Link
                  </Button>
                </div>
              </div>
            </CardHeader>
            
            <CardContent className="pt-2 pb-0">
              {/* Total price information */}
              <div className="flex justify-between items-center border-t border-b py-3 px-1 mb-4">
                <div className="text-sm text-muted-foreground">
                  {sharedList.items.length} {sharedList.items.length === 1 ? 'item' : 'items'}
                </div>
                
                <div className="flex flex-col items-end">
                  <div className="font-semibold text-lg">
                    {currency}{formatCurrency(total)}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {formatUSD(convertCRCtoUSD(total))}
                  </div>
                </div>
              </div>
              
              {/* Show message if no items */}
              {sharedList.items.length === 0 && (
                <div className="py-8 text-center text-muted-foreground">
                  <ShoppingCart className="mx-auto h-12 w-12 mb-2 opacity-20" />
                  <p>This grocery list is empty</p>
                </div>
              )}
            </CardContent>
          </Card>
          
          {/* List items */}
          <div className="space-y-2">
            {Array.isArray(sharedList.items) && sharedList.items.length > 0 && (
              // Group items by store
              Object.entries(
                sharedList.items.reduce((groups, item) => {
                  // Get store from product data using the imported utility function
                  const store = getProductStore(item.productData) as STORE;
                  if (!groups[store]) {
                    groups[store] = [];
                  }
                  groups[store].push(item);
                  return groups;
                }, {} as Record<STORE, any[]>)
              )
              .sort(([storeA], [storeB]) => {
                // Sort by the predefined store order
                const indexA = storeOrder.indexOf(storeA as STORE);
                const indexB = storeOrder.indexOf(storeB as STORE);
                // If not found in the order, put at the end
                const posA = indexA >= 0 ? indexA : storeOrder.length;
                const posB = indexB >= 0 ? indexB : storeOrder.length;
                return posA - posB;
              })
              .map(([store, storeItems]) => (
                <div key={store}>
                  <h3 className="font-medium mb-2 mt-6 text-sm text-muted-foreground uppercase">{storeGroupNames[store] || store}</h3>
                  
                  <div className="space-y-2">
                    {storeItems.map((item) => (
                      <GroceryListItem
                        key={item.id}
                        item={item}
                        editMode={editMode && !!sharedList.hasEditPermission}
                        onCheckItem={(checked) => handleUpdateListItem(
                          sharedList, 
                          user, 
                          toast, 
                          setSharedList, 
                          item.id, 
                          { checked }
                        )}
                        onDeleteItem={() => handleRemoveListItem(
                          sharedList,
                          user,
                          toast,
                          setSharedList,
                          item.id
                        )}
                        onUpdateQuantity={(quantity) => handleUpdateListItem(
                          sharedList,
                          user,
                          toast,
                          setSharedList,
                          item.id,
                          { quantity }
                        )}
                        storeColor={storeColors[store as STORE]}
                      />
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      ) : null}
    </div>
  );
};

export default SharedList; 