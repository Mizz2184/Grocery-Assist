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
  Link as LinkIcon
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";
import { getUserGroceryLists, getOrCreateDefaultList, addCollaborator, removeCollaborator, sendCollaboratorInvite } from "@/lib/services/groceryListService";
import { supabase } from "@/lib/supabase";
import { convertCRCtoUSD } from "@/utils/currencyUtils";
import { getProductStore, storeOrder, storeNames, storeColors } from "@/utils/storeUtils";

// Current exchange rate (this would normally come from an API or context)
const CRC_TO_USD_RATE = 510;

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

  // Create refs for store groups to avoid dependency issues with useEffect
  const storeGroupsRef = useRef<Record<string, GroceryItem[]>>({});
  
  // Initialize store groups with all possible store values
  useEffect(() => {
    const groups: Record<string, GroceryItem[]> = {};
    storeOrder.forEach(store => {
      groups[store] = [];
    });
    storeGroupsRef.current = groups;
  }, []);
  
  // Access store groups via ref
  const storeGroups = storeGroupsRef.current;

  useEffect(() => {
    const fetchLists = async () => {
      setLoading(true);
      
      if (user) {
        try {
          console.log('Fetching grocery lists for user:', user.id);
          const userLists = await getUserGroceryLists(user.id);
          console.log('Lists fetched:', userLists.length);
          
          setLists(userLists);
          
          if (userLists.length > 0 && !activeList) {
            console.log('Setting active list to first list:', userLists[0].id);
            setActiveList(userLists[0]);
          } else if (userLists.length === 0) {
            // Create a default list if user has none
            console.log('No lists found, creating default list');
            try {
              const defaultList = await getOrCreateDefaultList(user.id);
              console.log('Default list created:', defaultList.id);
              setLists([defaultList]);
              setActiveList(defaultList);
            } catch (defaultListError) {
              console.error('Error creating default list:', defaultListError);
              toast({
                title: "Error",
                description: "Failed to create a default grocery list.",
                variant: "destructive",
              });
            }
          }
        } catch (error) {
          console.error('Error fetching grocery lists:', error);
          
          // Try to create a default list as a fallback
          try {
            console.log('Attempting to create a fallback default list');
            const defaultList = await getOrCreateDefaultList(user.id);
            setLists([defaultList]);
            setActiveList(defaultList);
            
            toast({
              title: "Using local storage",
              description: "Database connection issues detected. Your lists will be saved locally.",
            });
          } catch (fallbackError) {
            console.error('Fallback error:', fallbackError);
            toast({
              title: "Error",
              description: "Failed to load your grocery lists.",
              variant: "destructive",
            });
          }
        } finally {
          setLoading(false);
        }
      } else {
        setLoading(false);
      }
    };
    
    fetchLists();
  }, [user, toast]);

  const updateListItem = async (listId: string, itemId: string, updates: Partial<GroceryItem>) => {
    try {
      // Try to update in Supabase first
      const { error } = await supabase
        .from('grocery_items')
        .update({
          quantity: updates.quantity,
          checked: updates.checked
        })
        .eq('id', itemId);
        
      if (error) {
        console.error('Error updating list item in Supabase:', error);
        // Fall back to updating in localStorage
        updateLocalListItem(listId, itemId, updates);
      }
      
      // Update local state regardless of whether Supabase update succeeded
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
      console.error('Error in updateListItem:', error);
      // Fall back to updating in localStorage
      updateLocalListItem(listId, itemId, updates);
      
      // Still update the UI
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
      
      toast({
        title: "Update saved locally",
        description: "Changes will be synced when connection is restored.",
      });
    }
  };
  
  // Helper function to update item in localStorage
  const updateLocalListItem = (listId: string, itemId: string, updates: Partial<GroceryItem>) => {
    try {
      const localLists = JSON.parse(localStorage.getItem('grocery_lists') || '[]');
      const updatedLists = localLists.map((list: any) => {
        if (list.id === listId) {
          return {
            ...list,
            items: list.items.map((item: GroceryItem) => 
              item.id === itemId ? { ...item, ...updates } : item
            )
          };
        }
        return list;
      });
      
      localStorage.setItem('grocery_lists', JSON.stringify(updatedLists));
    } catch (error) {
      console.error('Error updating item in localStorage:', error);
    }
  };

  const removeListItem = async (listId: string, itemId: string) => {
    try {
      // Try to remove from Supabase first
      const { error } = await supabase
        .from('grocery_items')
        .delete()
        .eq('id', itemId);
        
      if (error) {
        console.error('Error removing list item from Supabase:', error);
        // Fall back to removing from localStorage
        removeLocalListItem(listId, itemId);
      }
      
      // Update local state regardless of whether Supabase delete succeeded
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

      // Also update localStorage
      removeLocalListItem(listId, itemId);
      
      toast({
        title: "Item removed",
        description: "The item has been removed from your list.",
      });
    } catch (error) {
      console.error('Error in removeListItem:', error);
      // Fall back to removing from localStorage
      removeLocalListItem(listId, itemId);
      
      // Still update the UI
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
      
      toast({
        title: "Item removed locally",
        description: "Changes will be synced when connection is restored.",
      });
    }
  };
  
  // Helper function to remove item from localStorage
  const removeLocalListItem = (listId: string, itemId: string) => {
    try {
      const localLists = JSON.parse(localStorage.getItem('grocery_lists') || '[]');
      const updatedLists = localLists.map((list: any) => {
        if (list.id === listId) {
          return {
            ...list,
            items: list.items.filter((item: GroceryItem) => item.id !== itemId)
          };
        }
        return list;
      });
      
      localStorage.setItem('grocery_lists', JSON.stringify(updatedLists));
    } catch (error) {
      console.error('Error removing item from localStorage:', error);
    }
  };

  const handleInviteCollaborator = async () => {
    if (!activeList || !collaboratorEmail.trim() || !user) {
      console.log('Missing required values:', { 
        hasActiveList: !!activeList, 
        email: collaboratorEmail.trim(), 
        hasUser: !!user 
      });
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
    
    // Don't allow inviting yourself
    if (user.email && normalizedEmail === user.email.toLowerCase()) {
      toast({
        title: "Invalid invitation",
        description: "You cannot invite yourself to your own list.",
        variant: "destructive",
      });
      return;
    }
    
    // Check if already a collaborator
    if (activeList.collaborators && activeList.collaborators.includes(normalizedEmail)) {
      toast({
        title: "Already a collaborator",
        description: `${normalizedEmail} is already invited to this list.`,
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
      
      console.log('Inviting collaborator:', { 
        userId: user.id, 
        listId: activeList.id, 
        email: normalizedEmail
      });
      
      // Call the service function to add collaborator
      const success = await addCollaborator(user.id, activeList.id, normalizedEmail);
      
      if (success) {
        // Update UI with the new collaborator
        const updatedCollaborators = [...(activeList.collaborators || []), normalizedEmail];
        updateUI(updatedCollaborators);
        
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
  
  // Helper function to update collaborators in localStorage
  const updateLocalCollaborators = (listId: string, collaborators: string[]) => {
    try {
      const localLists = JSON.parse(localStorage.getItem('grocery_lists') || '[]');
      const updatedLists = localLists.map((list: any) => {
        if (list.id === listId) {
          return {
            ...list,
            collaborators
          };
        }
        return list;
      });
      
      localStorage.setItem('grocery_lists', JSON.stringify(updatedLists));
    } catch (error) {
      console.error('Error updating collaborators in localStorage:', error);
    }
  };
  
  // Helper function to update UI
  const updateUI = (collaborators: string[]) => {
    // Update local state
    setLists(prevLists => 
      prevLists.map(list => {
        if (list.id === activeList?.id) {
          return {
            ...list,
            collaborators
          };
        }
        return list;
      })
    );
    
    setActiveList(prevList => {
      if (!prevList) return null;
      return {
        ...prevList,
        collaborators
      };
    });
  };

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

  // Handle navigation back to search results
  const handleBackToSearch = () => {
    // Just navigate to the home page
    // The search context will take care of restoring search results and scroll position
    navigate('/');
  };

  // Add this new function to handle removing a collaborator
  const handleRemoveCollaborator = async (email: string) => {
    if (!activeList || !user) {
      console.log('Cannot remove collaborator: missing activeList or user');
      toast({
        title: "Error",
        description: "Cannot remove collaborator at this time.",
        variant: "destructive",
      });
      return;
    }
    
    try {
      // Show immediate feedback
      toast({
        title: "Removing collaborator...",
        description: `Removing ${email} from this list.`,
      });
      
      console.log(`Removing collaborator: ${email} from list ${activeList.id}`);
      console.log('User ID:', user.id);
      console.log('Active list:', activeList);
      
      // First update the UI optimistically
      const updatedCollaborators = activeList.collaborators.filter(e => e !== email);
      
      // Update UI state immediately for responsive feel
      updateUI(updatedCollaborators);
      
      // Also update localStorage
      updateLocalCollaborators(activeList.id, updatedCollaborators);
      
      // Then try the service function
      const success = await removeCollaborator(user.id, activeList.id, email);
      console.log('Service function result:', success);
      
      if (success) {
        toast({
          title: "Collaborator removed",
          description: `${email} has been removed from this list.`,
        });
      } else {
        console.error('Error from removeCollaborator service');
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
  
  // Add a toggle function for the dropdown
  const toggleDropdown = (email: string) => {
    setOpenDropdowns(prev => ({
      ...prev,
      [email]: !prev[email]
    }));
  };
  
  // Close all dropdowns when clicking outside
  const closeAllDropdowns = useCallback(() => {
    setOpenDropdowns({});
  }, []);
  
  useEffect(() => {
    document.addEventListener('click', closeAllDropdowns);
    return () => {
      document.removeEventListener('click', closeAllDropdowns);
    };
  }, [closeAllDropdowns]);

  useEffect(() => {
    // Reset store groups
    for (const store of storeOrder) {
      storeGroups[store] = [];
    }
    
    // Group items by store
    if (activeList && activeList.items) {
      activeList.items.forEach(item => {
        let store = getProductStore(item.productData);
        
        // Ensure we're using one of our defined groups
        if (!storeOrder.includes(store)) {
          store = 'Unknown';
        }
        
        // Add to the appropriate store group
        storeGroups[store].push(item);
      });
    }
  }, [activeList]);

  if (loading) {
    return (
      <div className="page-container">
        <div className="max-w-4xl mx-auto">
          <div className="h-8 w-48 bg-muted animate-pulse rounded mb-8" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2">
              <Card className="animate-pulse bg-muted h-96" />
            </div>
            <div>
              <Card className="animate-pulse bg-muted h-64" />
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

  // Define store groups (for rendering section headers)
  const storeGroupNames: { [key: string]: string } = {
    'Walmart': 'Walmart',
    'MaxiPali': 'MaxiPali',
    'MasxMenos': 'MasxMenos',
    'PriceSmart': 'PriceSmart',
    'Automercado': 'Automercado',
    'Unknown': 'Other Stores'
  };
  
  // Define store colors for consistent UI
  const storeColors: Record<string, string> = {
    'Walmart': 'bg-blue-600 text-white border-blue-600',
    'MaxiPali': 'bg-yellow-500 text-white border-yellow-500',
    'MasxMenos': 'bg-green-600 text-white border-green-600',
    'PriceSmart': 'bg-purple-600 text-white border-purple-600',
    'Automercado': 'bg-pink-600 text-white border-pink-600',
    'Unknown': 'bg-gray-500 text-white border-gray-500'
  };

  return (
    <div className="page-container">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleBackToSearch}
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
              <Card className="animate-scale-in">
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>{activeList.name}</CardTitle>
                    <CardDescription>
                      {activeList.items.length} items
                    </CardDescription>
                  </div>
                  <Button 
                    variant="outline" 
                    className="rounded-full flex items-center gap-2"
                    onClick={handleShare}
                  >
                    <Share2 className="h-4 w-4" />
                    Share List
                  </Button>
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
                        {storeOrder
                          .filter(store => storeGroups[store] && storeGroups[store].length > 0)
                          .map(store => (
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
                                  {storeGroupNames[store]} ({storeGroups[store].length})
                                </span>
                              </div>
                              
                              <div className={cn(
                                "space-y-3 border-l-4 pl-4",
                                storeColors[store].split(' ')[2]
                              )}>
                                {storeGroups[store].map((item) => (
                                  <GroceryListItem
                                    key={item.id}
                                    item={item}
                                    onUpdateQuantity={(id, quantity) => 
                                      updateListItem(activeList.id, id, { quantity })
                                    }
                                    onToggleCheck={(id, checked) => 
                                      updateListItem(activeList.id, id, { checked })
                                    }
                                    onRemove={(id) => 
                                      removeListItem(activeList.id, id)
                                    }
                                    storeColor={storeColors[store]}
                                  />
                                ))}
                              </div>
                            </div>
                          ))}
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
                      onClick={handleShare}
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
