import { useState, useEffect } from "react";
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
  ArrowLeft
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";
import { getUserGroceryLists, getOrCreateDefaultList } from "@/lib/services/groceryListService";
import { supabase } from "@/lib/supabase";
import { convertCRCtoUSD } from "@/utils/currencyUtils";

// Current exchange rate (this would normally come from an API or context)
const CRC_TO_USD_RATE = 510;

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

  useEffect(() => {
    const fetchLists = async () => {
      setLoading(true);
      
      if (user) {
        try {
          const userLists = await getUserGroceryLists(user.id);
          
          setLists(userLists);
          
          if (userLists.length > 0 && !activeList) {
            setActiveList(userLists[0]);
          } else if (userLists.length === 0) {
            // Create a default list if user has none
            const defaultList = await getOrCreateDefaultList(user.id);
            setLists([defaultList]);
            setActiveList(defaultList);
          }
        } catch (error) {
          console.error('Error fetching grocery lists:', error);
          toast({
            title: "Error",
            description: "Failed to load your grocery lists.",
            variant: "destructive",
          });
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
    if (!activeList || !collaboratorEmail.trim()) return;
    
    setAddingCollaborator(true);
    
    try {
      // Try to update in Supabase first
      // Get current collaborators
      const { data, error: fetchError } = await supabase
        .from('grocery_lists')
        .select('collaborators')
        .eq('id', activeList.id)
        .single();
        
      if (fetchError) {
        console.log('Falling back to localStorage for collaborator update');
        // Update in localStorage instead
        const updatedCollaborators = [...(activeList.collaborators || []), collaboratorEmail];
        updateLocalCollaborators(activeList.id, updatedCollaborators);
        updateUI(updatedCollaborators);
      } else {
        // Update collaborators in Supabase
        const collaborators = [...(data.collaborators || []), collaboratorEmail];
        
        const { error: updateError } = await supabase
          .from('grocery_lists')
          .update({ collaborators })
          .eq('id', activeList.id);
          
        if (updateError) {
          console.log('Supabase update failed, falling back to localStorage');
          // Update in localStorage instead
          updateLocalCollaborators(activeList.id, collaborators);
        }
        
        // Update UI regardless
        updateUI(collaborators);
      }
      
      toast({
        title: "Invitation sent",
        description: `${collaboratorEmail} has been invited to collaborate on this list.`,
      });
      
      setCollaboratorEmail("");
    } catch (error) {
      console.error('Error inviting collaborator:', error);
      
      // Fallback to localStorage
      const updatedCollaborators = [...(activeList.collaborators || []), collaboratorEmail];
      updateLocalCollaborators(activeList.id, updatedCollaborators);
      updateUI(updatedCollaborators);
      
      toast({
        title: "Invitation saved locally",
        description: "Invitation will be sent when connection is restored.",
      });
      
      setCollaboratorEmail("");
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
    
    navigator.clipboard.writeText(`https://grocery-assist.vercel.app/share-list/${activeList.id}`).then(() => {
      toast({
        title: "Link copied",
        description: "The list sharing link has been copied to your clipboard.",
      });
    });
  };

  const calculateTotalPrice = () => {
    if (!activeList) return { total: 0, currency: '₡' };
    
    let total = 0;
    let currency = '₡';
    
    activeList.items.forEach(item => {
      if (item.productData) {
        // Use the productData directly if available
        total += (item.productData.price || 0) * item.quantity;
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

  return (
    <div className="page-container">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between gap-4 mb-6">
          <h1 className="text-2xl font-semibold">Your Grocery Lists</h1>
          
          {/* Back to search button - show only if there are search results */}
          {query && searchResults.length > 0 && (
            <Button 
              variant="outline" 
              className="gap-2 rounded-full"
              onClick={handleBackToSearch}
            >
              <ArrowLeft className="h-4 w-4" />
              Back to search results
            </Button>
          )}
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
                  
                  <div className="flex items-center gap-2">
                    <Button 
                      variant="outline" 
                      size="icon" 
                      className="rounded-full"
                      onClick={handleShare}
                    >
                      <Share2 className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="outline" 
                      size="icon" 
                      className="rounded-full"
                    >
                      <Settings className="h-4 w-4" />
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
                      {/* Group items by store */}
                      {(() => {
                        // Group items by store
                        const storeGroups: Record<string, GroceryItem[]> = {};
                        
                        // Debug store values
                        console.log('Grocery items store values:', activeList.items.map(item => 
                          ({id: item.id, store: item.productData?.store, name: item.productData?.name})
                        ));
                        
                        // Sort items into groups by store
                        activeList.items.forEach(item => {
                          // Make sure we're using the exact store name to group items
                          let store = item.productData?.store || 'Other';
                          
                          // Ensure proper store name is used for grouping
                          if (store.includes('MaxiPali') || store === 'MaxiPali') {
                            store = 'MaxiPali';
                          } else if (store.includes('MasxMenos') || store === 'MasxMenos') {
                            store = 'MasxMenos';
                          }
                          
                          if (!storeGroups[store]) {
                            storeGroups[store] = [];
                          }
                          storeGroups[store].push(item);
                        });
                        
                        console.log('Final store groups:', Object.keys(storeGroups));
                        
                        // Render each store group
                        return Object.entries(storeGroups).map(([store, items]) => (
                          <div key={store} className="space-y-3">
                            <div className="flex items-center gap-2 mb-2">
                              <div className={cn(
                                "h-6 w-6 rounded-full flex items-center justify-center text-white text-xs font-medium",
                                store === 'MaxiPali' ? "bg-yellow-500" : 
                                store === 'MasxMenos' ? "bg-green-600" : "bg-gray-500"
                              )}>
                                {store.charAt(0)}
                              </div>
                              <h3 className="font-medium">{store}</h3>
                              <div className="text-xs text-muted-foreground">
                                ({items.length} {items.length === 1 ? 'item' : 'items'})
                              </div>
                            </div>
                            
                            <div className={cn(
                              "space-y-3 border-l-4 pl-4",
                              store === 'MaxiPali' ? "border-yellow-500" : 
                              store === 'MasxMenos' ? "border-green-600" : "border-gray-500"
                            )}>
                              {items.map(item => (
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
                <div className="flex items-center gap-2">
                  <Input 
                    placeholder="Email address"
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
                
                {activeList?.collaborators.length ? (
                  <div className="space-y-2 mt-4">
                    <h4 className="text-sm font-medium">Current Collaborators</h4>
                    {activeList.collaborators.map((email, index) => (
                      <div 
                        key={index} 
                        className="flex items-center justify-between p-2 bg-muted rounded-lg"
                      >
                        <span className="text-sm">{email}</span>
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground mt-2">
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
