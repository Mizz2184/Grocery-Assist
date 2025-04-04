import { useState, useEffect, useCallback, useRef } from "react";
import { 
  GroceryList as GroceryListType, 
  GroceryListItem as GroceryItem,
  getProductById
} from "@/utils/productData";
import { useAuth } from "@/hooks/useAuth";
import { useSearch } from "@/context/SearchContext";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardDescription, 
  CardContent 
} from "@/components/ui/card";
import { GroceryListItem } from "@/components/GroceryListItem";
import { 
  Share2, 
  UserPlus, 
  ShoppingCart, 
  MoreHorizontal, 
  Check, 
  RefreshCw, 
  Settings,
  Plus,
  Search,
  ArrowLeft,
  Clipboard,
  Link as LinkIcon,
  MoreVertical,
  Trash,
  PlusCircle,
  Share,
  CheckCircle,
  Users,
  Pencil,
  Eye,
  Trash2
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";
import { 
  getUserGroceryLists,
  getOrCreateDefaultList, 
  createGroceryList, 
  addCollaborator, 
  removeCollaborator,
  sendCollaboratorInvite,
  updateListItem,
  deleteGroceryList,
  syncGroceryListToDatabase,
  deleteGroceryListItem
} from '@/lib/services/groceryListService';
import { supabase } from "@/lib/supabase";
import { convertCRCtoUSD } from "@/utils/currencyUtils";
import { getProductStore, storeOrder, storeNames, storeColors } from "@/utils/storeUtils";
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { ShareGroceryList } from "@/components/ShareGroceryList";

// Current exchange rate (this would normally come from an API or context)
const CRC_TO_USD_RATE = 501;

// Helper function to get price from any product structure
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

const GroceryList = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { query, searchResults } = useSearch();
  const navigate = useNavigate();
  const [lists, setLists] = useState<GroceryListType[]>([]);
  const [activeList, setActiveList] = useState<GroceryListType | null>(null);
  const [loading, setLoading] = useState(true);
  const [collaboratorEmail, setCollaboratorEmail] = useState("");
  const [addingCollaborator, setAddingCollaborator] = useState(false);
  const [openDropdowns, setOpenDropdowns] = useState<Record<string, boolean>>({});

  // Define store groups for rendering section headers
  const storeGroupNames: { [key: string]: string } = {
    'Walmart': 'Walmart',
    'MaxiPali': 'MaxiPali',
    'MasxMenos': 'MasxMenos',
    'PriceSmart': 'PriceSmart',
    'Automercado': 'Automercado',
    'Unknown': 'Other Stores'
  };

  // Formatting functions
  const formatCurrency = (amount: number) => {
    return amount.toLocaleString('es-CR', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });
  };

  const formatUSD = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  // Share list function
  const handleShare = () => {
    if (!activeList) return;
    
    const shareUrl = `${window.location.origin}/shared-list/${activeList.id}`;
    
    navigator.clipboard.writeText(shareUrl).then(() => {
      toast({
        title: "Link copied",
        description: "The list sharing link has been copied to your clipboard. Share it with people you've invited.",
      });
    });
  };

  // Invite collaborator function
  const handleInviteCollaborator = async () => {
    if (!activeList || !collaboratorEmail.trim() || !user) {
      toast({
        title: "Missing information",
        description: "Please enter a valid email address to invite.",
        variant: "destructive",
      });
      return;
    }
    
    // Normalize and validate the email
    const normalizedEmail = collaboratorEmail.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(normalizedEmail)) {
      toast({
        title: "Invalid email format",
        description: "Please enter a valid email address.",
        variant: "destructive",
      });
      return;
    }
    
    // Check if email is already a collaborator
    if (activeList.collaborators && 
        activeList.collaborators.some(email => email.toLowerCase() === normalizedEmail)) {
      toast({
        title: "Already a collaborator",
        description: `${normalizedEmail} is already a collaborator on this list.`,
        variant: "destructive",
      });
      return;
    }
    
    setAddingCollaborator(true);
    
    try {
      // Show initial feedback
      toast({
        title: "Sending invitation...",
        description: `Inviting ${normalizedEmail} to collaborate on "${activeList.name}"`,
      });
      
      // Call the service function to add collaborator
      const success = await addCollaborator(user.id, activeList.id, normalizedEmail);
      
      if (success) {
        // Update UI with the new collaborator
        const updatedCollaborators = [...(activeList.collaborators || []), normalizedEmail];
        
        // Update lists state to include the new collaborator
        setLists(prevLists => 
          prevLists.map(list => {
            if (list.id === activeList.id) {
              return {
                ...list,
                collaborators: updatedCollaborators
              };
            }
            return list;
          })
        );
        
        // Update active list
        setActiveList(prevList => {
          if (!prevList) return null;
          return {
            ...prevList,
            collaborators: updatedCollaborators
          };
        });
        
        toast({
          title: "Invitation sent",
          description: `${normalizedEmail} has been invited to collaborate on "${activeList.name}".`,
        });
        
        // Clear input field
        setCollaboratorEmail("");
      } else {
        toast({
          title: "Invitation failed",
          description: "We couldn't add this collaborator. Please try again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error inviting collaborator:', error);
      toast({
        title: "Error",
        description: "Failed to invite collaborator. Please try again.",
        variant: "destructive",
      });
    } finally {
      setAddingCollaborator(false);
    }
  };

  // Remove collaborator function
  const handleRemoveCollaborator = async (email: string) => {
    if (!activeList || !user) {
      toast({
        title: "Error",
        description: "Cannot remove collaborator at this time.",
        variant: "destructive",
      });
      return;
    }
    
    // Normalize email for comparison
    const normalizedEmail = email.trim().toLowerCase();
    
    // Check if email is actually a collaborator
    const isCollaborator = activeList.collaborators && 
      activeList.collaborators.some(e => typeof e === 'string' && e.toLowerCase() === normalizedEmail);
      
    if (!isCollaborator) {
      toast({
        title: "Not a collaborator",
        description: `${normalizedEmail} is not a collaborator on this list.`,
        variant: "destructive",
      });
      return;
    }
    
    try {
      // Show immediate feedback
      toast({
        title: "Removing collaborator...",
        description: `Removing ${normalizedEmail} from this list.`,
      });
      
      // Update the state immediately for responsive UI
      const updatedCollaborators = activeList.collaborators.filter(e => 
        typeof e !== 'string' || e.toLowerCase() !== normalizedEmail
      );
      
      // Update lists
      setLists(prevLists => 
        prevLists.map(list => {
          if (list.id === activeList.id) {
            return {
              ...list,
              collaborators: updatedCollaborators
            };
          }
          return list;
        })
      );
      
      // Update active list
      setActiveList(prevList => {
        if (!prevList) return null;
        return {
          ...prevList,
          collaborators: updatedCollaborators
        };
      });
      
      // Call the service function
      const success = await removeCollaborator(user.id, activeList.id, normalizedEmail);
      
      if (success) {
        toast({
          title: "Collaborator removed",
          description: `${normalizedEmail} has been removed from this list.`,
        });
      } else {
        toast({
          title: "Warning",
          description: "Collaborator removed locally, but server sync may have failed.",
        });
      }
    } catch (error) {
      console.error('Error removing collaborator:', error);
      toast({
        title: "Error",
        description: "Failed to remove collaborator. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Simple fetch without complex dependencies
  const fetchLists = async () => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to access your grocery lists.",
        variant: "destructive"
      });
      navigate("/profile");
      return;
    }
    
    setLoading(true);
    try {
      console.log('Fetching grocery lists for user:', user.id);
      const lists = await getUserGroceryLists(user.id);
      
      console.log(`Fetched ${lists.length} grocery lists`);
      
      // Update state
      setLists(lists);
      
      // Set active list to the first list
      if (lists.length > 0) {
        setActiveList(lists[0]);
      } else {
        setActiveList(null);
      }
    } catch (error) {
      console.error('Error fetching grocery lists:', error);
      toast({
        title: "Error Loading Lists",
        description: "Could not load your grocery lists. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Fetch once on mount
  useEffect(() => {
    fetchLists();
    
    return () => {
      // Cleanup
      setLists([]);
      setActiveList(null);
    };
  }, [user, toast, navigate]);

  // Update a list item
  const handleUpdateListItem = async (listId: string, itemId: string, updates: Partial<GroceryItem>) => {
    try {
      if (!user) {
        toast({
          title: "Authentication Required",
          description: "Please sign in to update items.",
          variant: "destructive"
        });
        return;
      }
      
      // Call our service function with user ID
      const { success, item } = await updateListItem(listId, itemId, user.id, updates);
      
      if (!success) {
        throw new Error('Failed to update item');
      }
      
      // Update local state
      setLists(prevLists => 
        prevLists.map(list => {
          if (list.id === listId) {
            return {
              ...list,
              items: list.items.map(item => 
                item.id === itemId ? { ...item, ...updates } : item
              )
            };
          }
          return list;
        })
      );
      
      if (activeList?.id === listId) {
        setActiveList(prevList => {
          if (!prevList) return null;
          return {
            ...prevList,
            items: prevList.items.map(item => 
              item.id === itemId ? { ...item, ...updates } : item
            )
          };
        });
      }
    } catch (error) {
      console.error('Error updating list item:', error);
      toast({
        title: "Update Failed",
        description: "Could not update the item. Please try again.",
        variant: "destructive"
      });
    }
  };

  // Remove an item from the list
  const handleRemoveListItem = async (listId: string, itemId: string) => {
    try {
      if (!user) {
        toast({
          title: "Authentication Required",
          description: "Please sign in to remove items.",
          variant: "destructive"
        });
        return;
      }
      
      // Update local state immediately for responsive UI
      setLists(prevLists => 
        prevLists.map(list => {
          if (list.id === listId) {
            return {
              ...list,
              items: list.items.filter(item => item.id !== itemId)
            };
          }
          return list;
        })
      );
      
      if (activeList?.id === listId) {
        setActiveList(prevList => {
          if (!prevList) return null;
          return {
            ...prevList,
            items: prevList.items.filter(item => item.id !== itemId)
          };
        });
      }
      
      // Use the service function
      const success = await deleteGroceryListItem(itemId);
        
      if (!success) {
        console.error('Error removing list item from database');
        toast({
          title: "Sync Issue",
          description: "Item removed locally but not synced to cloud.",
          variant: "destructive"
        });
      } else {
        toast({
          title: "Item Removed",
          description: "The item has been removed from your list."
        });
      }
    } catch (error) {
      console.error('Error removing list item:', error);
      toast({
        title: "Remove Failed",
        description: "Could not remove the item. Please try again.",
        variant: "destructive"
      });
    }
  };

  // Helper function to group items by store
  const getItemsByStore = (items: GroceryItem[]) => {
    const result: Record<string, GroceryItem[]> = {};
    
    // Initialize all store groups
    storeOrder.forEach(store => {
      result[store] = [];
    });
    
    // Add Unknown store
    result['Unknown'] = [];
    
    // Group items by store
    items.forEach(item => {
      try {
        const store = getProductStore(item.productData);
        if (storeOrder.includes(store)) {
          result[store].push(item);
        } else {
          result['Unknown'].push(item);
        }
      } catch (err) {
        result['Unknown'].push(item);
      }
    });
    
    return result;
  };

  // Calculate total price
  const calculateTotalPrice = () => {
    if (!activeList) return { total: 0, currency: '₡' };
    
    let total = 0;
    let currency = '₡';
    
    activeList.items.forEach(item => {
      if (item.productData) {
        // Use the helper function to properly extract price regardless of product structure
        const itemPrice = getProductPrice(item.productData);
        total += itemPrice * item.quantity;
      } else {
        // Fall back to getProductById as a backup
        const product = getProductById(item.productId);
        if (product) {
          const lowestPrice = product.prices.reduce((min, price) => 
            price.price < min.price ? price : min, product.prices[0]);
            
          total += lowestPrice.price * item.quantity;
          currency = lowestPrice.currency;
        }
      }
    });
    
    return { total, currency };
  };

  // Handle deleting a grocery list
  const handleDeleteList = async () => {
    if (!activeList || !user) return;
    
    try {
      // Confirm deletion with user
      if (!window.confirm(`Are you sure you want to delete "${activeList.name}" list?`)) {
        return;
      }
      
      const success = await deleteGroceryList(activeList.id);
      
      if (success) {
        toast({
          title: "List Deleted",
          description: `"${activeList.name}" has been deleted.`,
        });
        
        // Remove from local state
        setLists(prevLists => prevLists.filter(list => list.id !== activeList.id));
        setActiveList(null);
        
        // Refresh lists to get a new active list if available
        fetchLists();
      } else {
        toast({
          title: "Delete Failed",
          description: "Could not delete the list. Please try again.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error deleting list:', error);
      toast({
        title: "Delete Failed",
        description: "An error occurred while deleting the list.",
        variant: "destructive"
      });
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="page-container">
        <div className="max-w-4xl mx-auto">
          <Skeleton className="h-12 w-48 mb-6" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <Skeleton className="h-[400px] w-full rounded-xl" />
            </div>
            <Skeleton className="h-[300px] w-full rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  // Authentication check
  if (!user) {
    return (
      <div className="page-container">
        <div className="flex flex-col items-center justify-center py-16 text-center max-w-md mx-auto gap-6">
          <div className="rounded-full bg-muted p-4">
            <ShoppingCart className="w-12 h-12 text-muted-foreground" />
          </div>
          <h1 className="text-3xl font-bold">Sign in to view your grocery lists</h1>
          <p className="text-muted-foreground">
            Create an account or sign in to start creating grocery lists, track prices and collaborate
            with your family.
          </p>
          <Link to="/profile">
            <Button className="rounded-full h-12 px-8">Sign in</Button>
          </Link>
        </div>
      </div>
    );
  }

  // No lists
  if (lists.length === 0) {
    return (
      <div className="page-container">
        <div className="flex flex-col items-center justify-center py-16 text-center max-w-md mx-auto gap-6">
          <div className="rounded-full bg-muted p-4">
            <ShoppingCart className="w-12 h-12 text-muted-foreground" />
          </div>
          <h1 className="text-3xl font-bold">No grocery lists</h1>
          <p className="text-muted-foreground">
            You haven't created any grocery lists yet. Create your first list to start tracking products
            and prices.
          </p>
          <Button
            className="rounded-full h-12 px-8"
            onClick={async () => {
              try {
                const defaultList = await getOrCreateDefaultList(user.id);
                setLists([defaultList]);
                setActiveList(defaultList);
              } catch (error) {
                console.error('Error creating default list:', error);
                toast({
                  title: "Error",
                  description: "Failed to create a grocery list.",
                  variant: "destructive",
                });
              }
            }}
          >
            Create your first list
          </Button>
        </div>
      </div>
    );
  }

  const { total, currency } = calculateTotalPrice();

  // Get grouped items by store if we have an active list
  const groupedItems = activeList ? getItemsByStore(activeList.items) : {};

  return (
    <div className="page-container">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/')}
              className="hover:bg-accent"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-3xl font-bold">Grocery List</h1>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {activeList && (
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>{activeList.name}</CardTitle>
                    <CardDescription>
                      {activeList.items.length} items
                    </CardDescription>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <ShareGroceryList 
                      listId={activeList.id} 
                      userId={user?.id || ''} 
                      listName={activeList.name} 
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      className="rounded-full flex items-center gap-2"
                      onClick={handleDeleteList}
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete
                    </Button>
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-4">
                  {activeList.items.length > 0 && (
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
                  
                  {activeList.items.length > 0 ? (
                    <div className="space-y-6 mt-6">
                      {/* Display grocery items by store */}
                      <div className="mt-4 space-y-6">
                        {storeOrder.map(store => {
                          const items = groupedItems[store] || [];
                          if (items.length === 0) return null;
                          
                          return (
                            <div key={store} className="space-y-4">
                              <div className="flex items-center space-x-2">
                                <div className={cn(
                                  "h-6 w-6 rounded-full flex items-center justify-center text-xs font-medium",
                                  storeColors[store].split(' ')[0],
                                  storeColors[store].split(' ')[1]
                                )}>
                                  {store === 'Walmart' ? 'W' : 
                                   store === 'MaxiPali' ? 'MP' : 
                                   store === 'MasxMenos' ? 'MxM' : 
                                   store === 'PriceSmart' ? 'PS' :
                                   store === 'Automercado' ? 'AM' :
                                   'O'}
                                </div>
                                <span className="font-semibold text-sm">
                                  {storeGroupNames[store]} ({items.length})
                                </span>
                              </div>
                              
                              <div className={cn(
                                "space-y-3 border-l-4 pl-4",
                                storeColors[store].split(' ')[2]
                              )}>
                                {items.map((item) => (
                                  <GroceryListItem
                                    key={item.id}
                                    item={item}
                                    onUpdateQuantity={(id, quantity) => 
                                      handleUpdateListItem(activeList.id, id, { quantity })
                                    }
                                    onToggleCheck={(id, checked) => 
                                      handleUpdateListItem(activeList.id, id, { checked })
                                    }
                                    onRemove={(id) => 
                                      handleRemoveListItem(activeList.id, id)
                                    }
                                    storeColor={storeColors[store]}
                                  />
                                ))}
                              </div>
                            </div>
                          );
                        })}
                        
                        {/* Show Unknown store items */}
                        {(() => {
                          const items = groupedItems['Unknown'] || [];
                          if (items.length === 0) return null;
                          
                          return (
                            <div key="Unknown" className="space-y-4">
                              <div className="flex items-center space-x-2">
                                <div className={cn(
                                  "h-6 w-6 rounded-full flex items-center justify-center text-xs font-medium",
                                  storeColors['Unknown'].split(' ')[0],
                                  storeColors['Unknown'].split(' ')[1]
                                )}>
                                  O
                                </div>
                                <span className="font-semibold text-sm">
                                  {storeGroupNames['Unknown']} ({items.length})
                                </span>
                              </div>
                              
                              <div className={cn(
                                "space-y-3 border-l-4 pl-4",
                                storeColors['Unknown'].split(' ')[2]
                              )}>
                                {items.map((item) => (
                                  <GroceryListItem
                                    key={item.id}
                                    item={item}
                                    onUpdateQuantity={(id, quantity) => 
                                      handleUpdateListItem(activeList.id, id, { quantity })
                                    }
                                    onToggleCheck={(id, checked) => 
                                      handleUpdateListItem(activeList.id, id, { checked })
                                    }
                                    onRemove={(id) => 
                                      handleRemoveListItem(activeList.id, id)
                                    }
                                    storeColor={storeColors['Unknown']}
                                  />
                                ))}
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                        <ShoppingCart className="w-8 h-8 text-muted-foreground" />
                      </div>
                      <h3 className="text-lg font-medium mb-2">List is Empty</h3>
                      <p className="text-muted-foreground mb-4">
                        Add items to your grocery list by searching for products.
                      </p>
                      <Link to="/">
                        <Button variant="outline" className="rounded-full">
                          Search Products
                        </Button>
                      </Link>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
          
          <div className="space-y-6">
            <Card className="animate-fade-in">
              <CardHeader>
                <CardTitle>Collaborators</CardTitle>
                <CardDescription>
                  Invite others to collaborate on this list
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-col gap-2">
                  <p className="text-sm text-muted-foreground">
                    Share this list with others by inviting them via email. They'll receive an invitation to join this grocery list.
                  </p>
                  <div className="flex items-center gap-2">
                    <Input 
                      placeholder="Enter email address"
                      value={collaboratorEmail}
                      onChange={(e) => setCollaboratorEmail(e.target.value)} 
                      disabled={addingCollaborator}
                    />
                    <Button 
                      className="rounded-full flex-shrink-0" 
                      disabled={!collaboratorEmail || addingCollaborator}
                      onClick={handleInviteCollaborator}
                    >
                      {addingCollaborator ? (
                        <RefreshCw className="h-4 w-4 animate-spin" />
                      ) : (
                        <UserPlus className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
                
                <div className="mt-4">
                  <p className="text-sm text-muted-foreground mb-2">
                    You can also share a direct link to this list:
                  </p>
                  <div className="flex items-center gap-2">
                    <Input 
                      value={`${window.location.origin}/shared-list/${activeList?.id}`}
                      readOnly
                      className="text-xs"
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      className="flex-shrink-0"
                      onClick={() => {
                        navigator.clipboard.writeText(`${window.location.origin}/shared-list/${activeList?.id}`);
                        toast({
                          title: "Link Copied",
                          description: "The sharing link has been copied to your clipboard.",
                        });
                      }}
                      title="Copy to clipboard"
                    >
                      <Clipboard className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                
                {activeList?.collaborators.length ? (
                  <div className="space-y-2 mt-4">
                    <h4 className="text-sm font-medium">Current Collaborators</h4>
                    {activeList.collaborators.map((email, index) => (
                      <div 
                        key={index} 
                        className="flex items-center justify-between p-2 bg-muted rounded-lg"
                      >
                        <div className="flex items-center gap-2">
                          <UserPlus className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">{email}</span>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 rounded-full text-destructive hover:bg-destructive/10"
                          onClick={() => handleRemoveCollaborator(email)}
                          title="Remove collaborator"
                        >
                          <svg 
                            xmlns="http://www.w3.org/2000/svg" 
                            width="16" 
                            height="16" 
                            viewBox="0 0 24 24" 
                            fill="none" 
                            stroke="currentColor" 
                            strokeWidth="2" 
                            strokeLinecap="round" 
                            strokeLinejoin="round"
                          >
                            <path d="M18 6 6 18" />
                            <path d="m6 6 12 12" />
                          </svg>
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground mt-4">
                    No collaborators yet. Invite someone to share this list.
                  </p>
                )}
              </CardContent>
            </Card>
            
            <Card className="animate-fade-in animate-delay-100">
              <CardHeader>
                <CardTitle>Progress</CardTitle>
                <CardDescription>
                  Track your shopping progress
                </CardDescription>
              </CardHeader>
              <CardContent>
                {activeList && activeList.items.length > 0 ? (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>
                          {activeList.items.filter(i => i.checked).length} of {activeList.items.length} items
                        </span>
                        <span className="font-medium">
                          {Math.round((activeList.items.filter(i => i.checked).length / activeList.items.length) * 100)}%
                        </span>
                      </div>
                      <div className="h-2 bg-secondary rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-primary transition-all duration-500"
                          style={{ 
                            width: `${(activeList.items.filter(i => i.checked).length / activeList.items.length) * 100}%` 
                          }}
                        />
                      </div>
                    </div>
                    
                    <div className="bg-muted p-3 rounded-lg flex items-center justify-between">
                      <div className="text-sm">
                        <span className="font-medium">Checked items</span>
                        <p className="text-muted-foreground text-xs">
                          {activeList.items.filter(i => i.checked).length} items
                        </p>
                      </div>
                      <div className="h-8 w-8 rounded-full bg-secondary flex items-center justify-center">
                        <Check className="h-4 w-4" />
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Add items to your list to track progress.
                  </p>
                )}
              </CardContent>
            </Card>
            
            <Card className="animate-fade-in animate-delay-200">
              <CardHeader>
                <CardTitle>Currency Information</CardTitle>
                <CardDescription>
                  Current exchange rate details
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="bg-muted p-3 rounded-lg space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Exchange Rate:</span>
                    <span className="text-sm">1 USD = {CRC_TO_USD_RATE} CRC</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    All prices are shown in both Costa Rican Colón (CRC) and US Dollars (USD) for your convenience.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GroceryList;
