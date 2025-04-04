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
  Copy
} from "lucide-react";
import { GroceryList as GroceryListType } from "@/utils/productData";
import { getSharedGroceryListById, addCollaborator, updateListItem, deleteGroceryListItem } from "@/lib/services/groceryListService";
import { convertCRCtoUSD } from "@/utils/currencyUtils";
import { supabase } from "@/lib/supabase";

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

// Helper function to get store name from any product structure
const getProductStore = (product: any): string => {
  if (!product) return 'Unknown';
  
  // Use type assertion to avoid TypeScript errors
  const anyProduct = product as any;
  
  // Direct store property
  if (anyProduct.store) {
    // Normalize store names
    const storeName = String(anyProduct.store).trim();
    
    if (storeName.includes('MaxiPali') || storeName.toLowerCase().includes('maxipali')) return 'MaxiPali';
    if (storeName.includes('MasxMenos') || storeName.toLowerCase().includes('masxmenos')) return 'MasxMenos';
    if (storeName.includes('Walmart') || storeName.toLowerCase().includes('walmart')) return 'Walmart';
    
    return storeName;
  }
  
  return 'Unknown';
};

// Define the store order for displaying store groups
const storeOrder = ['Walmart', 'MaxiPali', 'MasxMenos', 'PriceSmart', 'Automercado', 'Unknown'];

// Define store groups for rendering section headers
const storeGroupNames: { [key: string]: string } = {
  'Walmart': 'Walmart',
  'MaxiPali': 'MaxiPali',
  'MasxMenos': 'MasxMenos',
  'PriceSmart': 'PriceSmart',
  'Automercado': 'Automercado',
  'Unknown': 'Other Stores'
};

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

    // Call the API to delete the item
    const success = await deleteGroceryListItem(itemId);

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
  
  const [sharedList, setSharedList] = useState<GroceryListType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [accessRequested, setAccessRequested] = useState(false);
  const [requestingAccess, setRequestingAccess] = useState(false);
  const [notAuthorized, setNotAuthorized] = useState(false);
  const [requestingAccessInfo, setRequestingAccessInfo] = useState<{ listId: string; listName: string; listOwner: string } | null>(null);
  const [editMode, setEditMode] = useState(false);

  // Toggle edit mode
  const toggleEditMode = () => {
    setEditMode(!editMode);
    toast({
      title: editMode ? "View Mode" : "Edit Mode",
      description: editMode 
        ? "You are now viewing the shared list." 
        : "You can now edit items in this shared list.",
    });
  };

  useEffect(() => {
    const fetchSharedList = async () => {
      if (!user || !listId) {
        setLoading(false);
        return;
      }
      
      try {
        console.log(`⏳ Fetching shared list: listId=${listId}, userId=${user.id}, userEmail=${user.email}`);
        
        try {
          // Try to get the full list with items using our service
          console.log(`🔎 Attempting to fetch list via getSharedGroceryListById`);
          const fullList = await getSharedGroceryListById(user.id, listId);
          
          console.log(`✅ Successfully loaded shared list with ${fullList?.items?.length || 0} items`);
          setSharedList(fullList);
          setLoading(false);
        } catch (accessError: any) {
          console.error('❌ Access error:', accessError);
          
          // Check the database directly to see if list exists, for better error messages
          const { data: listCheck, error: listCheckError } = await supabase
            .from('grocery_lists')
            .select('id, name, user_id, collaborators')
            .eq('id', listId)
            .single();
            
          if (listCheckError) {
            console.error('❌ Error checking if list exists:', listCheckError);
            setError('The shared list could not be found.');
            setLoading(false);
            return;
          }
          
          console.log('📋 List exists, checking details:', listCheck);
          console.log('👥 Collaborators:', Array.isArray(listCheck.collaborators) 
            ? JSON.stringify(listCheck.collaborators)
            : listCheck.collaborators);
          
          // Set not authorized and allow user to request access
          setNotAuthorized(true);
          setRequestingAccessInfo({
            listId: listCheck.id,
            listName: listCheck.name,
            listOwner: listCheck.user_id
          });
          
          // Also set a helpful error message
          if (accessError.message?.includes('permission') || 
              accessError.message?.includes('access')) {
            setError(`You don't have access to this list. You can request access from the owner.`);
          } else {
            setError(accessError.message || 'Failed to load the shared list. Please try again.');
          }
          
          setLoading(false);
        }
      } catch (error: any) {
        console.error('❌ Error fetching shared list:', error);
        setError(error.message || "Failed to load the shared list. Please try again.");
        toast({
          title: "Error",
          description: error.message || "Failed to load the shared list. Please try again.",
          variant: "destructive",
        });
        setLoading(false);
      }
    };
    
    if (!authLoading) {
      fetchSharedList();
    }
  }, [user, listId, authLoading, toast]);

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

  if (loading) {
    return (
      <div className="page-container">
        <div className="max-w-4xl mx-auto">
          <div className="h-8 w-48 bg-muted animate-pulse rounded mb-8" />
          <div className="grid grid-cols-1 gap-6">
            <div>
              <Card className="animate-pulse bg-muted h-96" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="page-container">
        <div className="flex flex-col items-center justify-center py-16 text-center max-w-md mx-auto gap-6">
          <div className="rounded-full bg-muted p-4">
            <ShoppingCart className="w-12 h-12 text-muted-foreground" />
          </div>
          <h1 className="text-3xl font-bold">Sign in to view this grocery list</h1>
          <p className="text-muted-foreground">
            You need to sign in with the email address that was used to invite you to this list.
          </p>
          <Button 
            className="rounded-full h-12 px-8"
            onClick={() => navigate(`/login?redirect=/shared-list/${listId}`)}
          >
            Sign in
          </Button>
        </div>
      </div>
    );
  }

  if (error) {
    const listExists = error.includes("don't have access") || error.includes("accept the invitation");
    const isInvited = error.includes("accept the invitation");
    
    return (
      <div className="page-container">
        <div className="flex flex-col items-center justify-center py-16 text-center max-w-md mx-auto gap-6">
          <div className="rounded-full bg-muted p-4">
            <ShoppingCart className="w-12 h-12 text-muted-foreground" />
          </div>
          <h1 className="text-3xl font-bold">
            {isInvited ? "Invitation Pending" : "Access Denied"}
          </h1>
          <p className="text-muted-foreground">
            {error}
          </p>
          
          {isInvited ? (
            <Button 
              className="rounded-full h-12 px-8 flex items-center gap-2"
              onClick={handleAcceptInvitation}
              disabled={requestingAccess}
            >
              {requestingAccess ? (
                <>
                  <span className="h-4 w-4 rounded-full border-2 border-current border-t-transparent animate-spin" />
                  Accepting Invitation...
                </>
              ) : (
                <>
                  <Plus className="h-5 w-5" />
                  Accept Invitation
                </>
              )}
            </Button>
          ) : listExists && !accessRequested ? (
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
          ) : accessRequested ? (
            <div className="bg-muted px-4 py-3 rounded-lg text-sm">
              Access request sent. The list owner will review your request.
            </div>
          ) : null}
          
          <Button 
            variant="outline"
            className="rounded-full"
            onClick={handleBackToLists}
          >
            Back to My Lists
          </Button>
        </div>
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
            <div className="bg-muted px-4 py-3 rounded-lg text-sm">
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
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleBackToLists}
              className="hover:bg-accent"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold">{sharedList.name}</h1>
              {sharedList.isShared && sharedList.createdBy && (
                <p className="text-sm text-muted-foreground">
                  Shared by {sharedList.createdBy}
                </p>
              )}
            </div>
          </div>
          
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="rounded-full"
              onClick={toggleEditMode}
            >
              {editMode ? "View Mode" : "Edit Mode"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="rounded-full flex items-center gap-2"
              onClick={handleCopyLink}
            >
              <Copy className="h-4 w-4" />
              Share Link
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6">
          <Card className="animate-scale-in">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Shared Grocery List</CardTitle>
                <CardDescription>
                  {sharedList.items.length} items
                </CardDescription>
              </div>
            </CardHeader>
            
            <CardContent className="space-y-4">
              {sharedList.items.length > 0 && (
                <div className="bg-primary/10 p-4 rounded-lg flex items-center justify-between">
                  <div>
                    <h3 className="font-medium">Total:</h3>
                    <p className="text-sm text-muted-foreground"></p>
                  </div>
                  <div className="flex flex-col items-end">
                    <div className="text-xl font-bold">
                      {currency}{formatCurrency(total)}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {formatUSD(convertCRCtoUSD(total))}
                    </div>
                  </div>
                </div>
              )}
            
              {sharedList.items.length > 0 ? (
                <div className="space-y-6 mt-6">
                  {/* Group items by store */}
                  {(() => {
                    // Initialize store groups for storing actual items
                    const storeGroups: Record<string, any[]> = {
                      'Walmart': [],
                      'MaxiPali': [],
                      'MasxMenos': [],
                      'PriceSmart': [],
                      'Automercado': [],
                      'Unknown': []
                    };
                    
                    // Group items by store using the getProductStore helper
                    sharedList.items.forEach(item => {
                      // Use the helper function to determine the store
                      let store = item.productData ? getProductStore(item.productData) : 'Unknown';
                      
                      // Ensure we're using one of our defined groups
                      if (!storeGroups[store]) {
                        store = 'Unknown';
                      }
                      
                      // Add to appropriate group
                      storeGroups[store].push(item);
                    });
                    
                    // Render each store group in order, only if they have items
                    return storeOrder
                      .filter(store => storeGroups[store].length > 0)
                      .map(store => (
                      <div key={store} className="space-y-3">
                        <div className="flex items-center space-x-2">
                          <div className={cn(
                            "h-6 w-6 rounded-full flex items-center justify-center text-white text-xs font-medium",
                            store === 'Walmart' ? "bg-blue-600" : 
                            store === 'MaxiPali' ? "bg-yellow-500" : 
                            store === 'MasxMenos' ? "bg-green-600" : 
                            store === 'PriceSmart' ? "bg-purple-600" : 
                            store === 'Automercado' ? "bg-pink-600" : 
                            "bg-gray-500"
                          )}>
                            {store === 'Walmart' ? 'W' : 
                             store === 'MaxiPali' ? 'MP' : 
                             store === 'MasxMenos' ? 'MxM' : 
                             store === 'PriceSmart' ? 'PS' :
                             store === 'Automercado' ? 'AM' :
                             'O'}
                          </div>
                          <span className="font-semibold text-sm">
                            {storeGroupNames[store]} ({storeGroups[store].length})
                          </span>
                        </div>
                        
                        <div className={cn(
                          "space-y-3 border-l-4 pl-4",
                          store === 'Walmart' ? "border-blue-600" : 
                          store === 'MaxiPali' ? "border-yellow-500" : 
                          store === 'MasxMenos' ? "border-green-600" : 
                          store === 'PriceSmart' ? "border-purple-600" : 
                          store === 'Automercado' ? "border-pink-600" : 
                          "border-gray-500"
                        )}>
                          {storeGroups[store].map(item => (
                            <GroceryListItem
                              key={item.id}
                              item={item}
                              onUpdateQuantity={(id, quantity) => 
                                editMode ? handleUpdateItem(id, { quantity }) : null
                              }
                              onToggleCheck={(id, checked) => 
                                editMode ? handleUpdateItem(id, { checked }) : null
                              }
                              onRemove={(id) => 
                                editMode ? handleRemoveItem(id) : null
                              }
                              readOnly={!editMode}
                            />
                          ))}
                        </div>
                      </div>
                    ));
                  })()}
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                    <ShoppingCart className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-medium mb-2">List is Empty</h3>
                  <p className="text-muted-foreground mb-4">
                    This shared list doesn't have any items yet.
                  </p>
                </div>
              )}
            </CardContent>
            
            <CardFooter className="flex flex-col gap-3">
              <div className="bg-muted rounded-lg p-3 w-full text-sm text-muted-foreground">
                <p>This is a shared view of the grocery list. Any changes made by the owner will be reflected here.</p>
              </div>
              
              <Button 
                variant="outline" 
                className="rounded-full w-full"
                onClick={handleBackToLists}
              >
                Back to My Lists
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default SharedList; 