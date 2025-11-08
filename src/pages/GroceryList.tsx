import { useState, useEffect, useCallback, useRef } from "react";
import { 
  GroceryList as GroceryListType, 
  GroceryListItem as GroceryItemType,
  getProductById
} from "@/utils/productData";
import { useAuth } from "@/hooks/useAuth";
import { useSearch } from "@/hooks/useSearch";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardDescription, 
  CardContent,
  CardFooter 
} from "@/components/ui/card";
import { GroceryListItem as GroceryListItemComponent } from "@/components/GroceryListItem";
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
  Trash2,
  User,
  Copy,
  Terminal
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
  deleteGroceryListItem,
  addProductToGroceryList,
  renameGroceryList
} from '@/lib/services/groceryListService';
import { supabase } from "@/lib/supabase";
import { convertCRCtoUSD } from "@/utils/currencyUtils";
import { getProductStore, storeOrder, storeNames, storeColors } from "@/utils/storeUtils";
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { ShareGroceryList } from "@/components/ShareGroceryList";
import { Product } from "@/lib/types/store";
import type { GroceryList, GroceryListItem } from "@/types/groceryList";
import { useGroceryList } from "@/hooks/useGroceryList";

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
  const { activeList, setActiveList } = useGroceryList();
  const [loading, setLoading] = useState(true);
  const [collaboratorEmail, setCollaboratorEmail] = useState("");
  const [addingCollaborator, setAddingCollaborator] = useState(false);
  const [openDropdowns, setOpenDropdowns] = useState<Record<string, boolean>>({});
  const [listType, setListType] = useState<'owned' | 'shared'>('owned');
  const [isAddingProduct, setIsAddingProduct] = useState(false);
  const [editingListName, setEditingListName] = useState(false);
  const [newListName, setNewListName] = useState("");
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);

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

  // Share list function - now opens the dialog
  const handleShare = () => {
    if (!activeList) {
      toast({ title: "No active list selected", variant: "destructive" });
      return;
    }
    console.log("Opening share dialog for list:", activeList.name); // Add log
    setIsShareDialogOpen(true); // Set state to open dialog
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
        if (activeList) {
          setActiveList({
            ...activeList,
            collaborators: updatedCollaborators
          });
        }
        
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
      if (activeList) {
        setActiveList({
          ...activeList,
          collaborators: updatedCollaborators
        });
      }
      
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
      
      // Get current active list if it exists
      const currentActiveListId = activeList?.id;
      
      if (currentActiveListId) {
        // Try to find the same list in the fetched lists
        const sameList = lists.find(list => list.id === currentActiveListId);
        if (sameList) {
          // If the same list was found, keep it as active
          setActiveList(sameList);
          console.log('Maintained previously selected list:', sameList.name);
          return;
        }
      }
      
      // If no active list or active list wasn't found, default to first list
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
      // Don't reset the active list when unmounting
    };
  }, [user, toast, navigate]);

  // Debug effect to monitor the activeList state
  useEffect(() => {
    console.log('activeList changed:', activeList?.id, activeList?.name);
  }, [activeList]);

  // Update a list item
  const handleUpdateListItem = async (listId: string, itemId: string, updates: Partial<GroceryItemType>) => {
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
        setActiveList({
          ...activeList,
          items: activeList.items.map(item => 
            item.id === itemId ? { ...item, ...updates } : item
          )
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
        setActiveList({
          ...activeList,
          items: activeList.items.filter(item => item.id !== itemId)
        });
      }
      
      // Use the service function with listId and userId for notifications
      const success = await deleteGroceryListItem(itemId, listId, user?.id);
        
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
  const getItemsByStore = (items: GroceryItemType[]) => {
    const result: Record<string, GroceryItemType[]> = {};
    
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
      
      const success = await deleteGroceryList(activeList.id, user.id);
      
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

  const handleCreateList = async () => {
    if (!user) return;
    
    try {
      // Create a new list with a default name
      const newList = await createGroceryList(user.id, `My Grocery List ${ownedLists.length + 1}`);
      
      // Add to local state
      setLists(prevLists => [...prevLists, newList]);
      
      // Set as active list
      setActiveList(newList);
      
      // Switch to owned lists view
      setListType('owned');
      
      toast({
        title: "Success",
        description: "New grocery list created. You can now add products to it.",
      });
    } catch (error) {
      console.error('Error creating list:', error);
      toast({
        title: "Error",
        description: "Failed to create a grocery list. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Separate lists into owned and shared with proper filtering
  const ownedLists = lists.filter(list => list.createdBy === user?.id);
  const sharedLists = lists.filter(list => {
    // A list is shared if:
    // 1. User is not the creator
    // 2. User is in the collaborators list
    return list.createdBy !== user?.id && 
           list.collaborators?.includes(user?.email || '');
  });

  const handleAddProduct = async (product: Product) => {
    if (!user) {
      toast({
        title: "Error",
        description: "Please sign in to add products to a list",
        variant: "destructive",
      });
      return;
    }

    try {
      if (!activeList) {
        // Create a new default list
        const newList = await createGroceryList(user.id, "My Grocery List");
        if (!newList) {
          throw new Error("Failed to create a new list");
        }
        setActiveList(newList);
        setLists(prevLists => [...prevLists, newList]);
        
        // Add the product to the new list
        const result = await addProductToGroceryList(
          newList.id,
          user.id,
          product,
          1
        );
        
        if (!result.success) {
          throw new Error(result.message || 'Failed to add product');
        }
        
        if (result.list) {
          setActiveList(result.list);
          setLists(prevLists => 
            prevLists.map(list => 
              list.id === result.list?.id ? result.list : list
            )
          );
        }
        
        toast({
          title: "Product Added",
          description: `${product.name} has been added to your new list.`,
        });
        return;
      }

      // Check if user has permission to add to this list
      const canAddToList = activeList.createdBy === user.id || 
                          (activeList.collaborators && 
                           activeList.collaborators.includes(user.email || ''));
      
      if (!canAddToList) {
        toast({
          title: "Permission Denied",
          description: "You don't have permission to add items to this list",
          variant: "destructive",
        });
        return;
      }
      
      setIsAddingProduct(true);
      
      // Add the product to the active list
      const result = await addProductToGroceryList(
        activeList.id,
        user.id,
        product,
        1
      );
      
      if (!result.success) {
        throw new Error(result.message || 'Failed to add product');
      }
      
      if (result.list) {
        setActiveList(result.list);
        setLists(prevLists => 
          prevLists.map(list => 
            list.id === result.list?.id ? result.list : list
          )
        );
      }
      
      toast({
        title: "Product Added",
        description: `${product.name} has been added to ${activeList.name}${activeList.createdBy !== user.id ? ' (Shared List)' : ''}.`,
      });
    } catch (error) {
      console.error('Error adding product:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to add product to list",
        variant: "destructive",
      });
    } finally {
      setIsAddingProduct(false);
    }
  };

  // Helper function to group items by store
  const groupItemsByStore = (items: Array<GroceryListItem>) => {
    return items.reduce((groups, item) => {
      const store = getProductStore(item.productData);
      if (!groups[store]) {
        groups[store] = [];
      }
      groups[store].push(item);
      return groups;
    }, {} as Record<string, Array<GroceryListItem>>);
  };

  // Add new function to handle list name editing
  const handleRenameList = async () => {
    if (!activeList || !user || !newListName.trim()) return;
    
    try {
      const success = await renameGroceryList(activeList.id, user.id, newListName.trim());
      
      if (success) {
        // Update local state
        setLists(prevLists => 
          prevLists.map(list => 
            list.id === activeList.id 
              ? { ...list, name: newListName.trim() } 
              : list
          )
        );
        
        // Update active list for rename
        if (activeList) {
          setActiveList({
            ...activeList,
            name: newListName.trim()
          });
        }
        
        toast({
          title: "List renamed",
          description: `List has been renamed to "${newListName.trim()}"`,
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to rename list. Please try again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error renaming list:', error);
      toast({
        title: "Error",
        description: "An error occurred while renaming the list.",
        variant: "destructive",
      });
    } finally {
      setEditingListName(false);
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

  const { total, currency } = calculateTotalPrice();
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
            <h1 className="text-3xl font-bold">Grocery Lists</h1>
          </div>
        </div>

        <div className="flex gap-2 mb-6">
          <Button
            variant={listType === 'owned' ? 'default' : 'outline'}
            onClick={() => setListType('owned')}
            className="flex items-center gap-2"
          >
            <ShoppingCart className="h-4 w-4" />
            My Lists ({ownedLists.length})
          </Button>
          <Button
            variant={listType === 'shared' ? 'default' : 'outline'}
            onClick={() => setListType('shared')}
            className="flex items-center gap-2"
          >
            <Share2 className="h-4 w-4" />
            Shared with Me ({sharedLists.length})
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {activeList && (
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    {editingListName && activeList.createdBy === user?.id ? (
                      <div className="flex items-center gap-2">
                        <Input
                          value={newListName}
                          onChange={(e) => setNewListName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              handleRenameList();
                            } else if (e.key === 'Escape') {
                              setEditingListName(false);
                            }
                          }}
                          placeholder="Enter list name"
                          className="w-48"
                          autoFocus
                        />
                        <Button size="sm" onClick={handleRenameList}>
                          Save
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={() => setEditingListName(false)}
                        >
                          Cancel
                        </Button>
                      </div>
                    ) : (
                      <CardTitle className="flex items-center gap-2">
                        <span 
                          className={cn(
                            "cursor-default",
                            activeList.createdBy === user?.id && "hover:cursor-pointer hover:underline"
                          )}
                          onClick={() => {
                            if (activeList.createdBy === user?.id) {
                              setNewListName(activeList.name);
                              setEditingListName(true);
                            }
                          }}
                        >
                          {activeList.name}
                        </span>
                        {activeList.createdBy === user?.id && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-4 w-4 p-0"
                            onClick={() => {
                              setNewListName(activeList.name);
                              setEditingListName(true);
                            }}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                        )}
                        {activeList.createdBy !== user?.id && (
                          <Badge variant="secondary" className="ml-2">Shared</Badge>
                        )}
                      </CardTitle>
                    )}
                    <CardDescription>
                      {activeList.items.length} items
                      {activeList.createdBy !== user?.id && (
                        <span className="block text-xs">
                          Shared by {activeList.createdBy}
                        </span>
                      )}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {activeList.createdBy === user?.id && (
                      <ShareGroceryList 
                        listId={activeList.id} 
                        userId={user?.id || ''} 
                        listName={activeList.name}
                        collaborators={activeList.collaborators || []}
                      />
                    )}
                    {(activeList.createdBy === user?.id || activeList.hasEditPermission) && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex items-center gap-2 shrink-0"
                        onClick={handleDeleteList}
                      >
                        <Trash2 className="h-4 w-4" />
                        Delete
                      </Button>
                    )}
                  </div>
                </CardHeader>
                {/* Total price information */}
                <div className="flex justify-between items-center border-t border-b py-3 px-4 mb-4">
                  <div className="text-sm text-muted-foreground">
                    {activeList.items.length} {activeList.items.length === 1 ? 'item' : 'items'}
                  </div>
                  
                  <div className="flex flex-col items-end">
                    <div className="font-semibold text-lg">
                      ₡{formatCurrency(calculateTotalPrice().total)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {formatUSD(convertCRCtoUSD(calculateTotalPrice().total))}
                    </div>
                  </div>
                </div>
                <CardContent>
                  {/* List items */}
                  <div className="space-y-6">
                    {Object.entries(groupedItems).map(([store, items]) => {
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
                              <GroceryListItemComponent
                                key={`${store}-${item.id}`}
                                item={item}
                                onUpdateQuantity={(quantity) => 
                                  handleUpdateListItem(activeList.id, item.id, { quantity })
                                }
                                onCheckItem={(checked) => 
                                  handleUpdateListItem(activeList.id, item.id, { checked })
                                }
                                onDeleteItem={() => 
                                  handleRemoveListItem(activeList.id, item.id)
                                }
                                storeColor={storeColors[store]}
                              />
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
          <div className="space-y-4">
            {listType === 'owned' && (
              <Button
                className="w-full"
                onClick={handleCreateList}
              >
                <Plus className="h-4 w-4 mr-2" />
                Create New List
              </Button>
            )}
            <div className="space-y-2">
              {(listType === 'owned' ? ownedLists : sharedLists).map(list => (
                <Button
                  key={`${listType}-${list.id}-${list.createdBy}`}
                  variant={activeList?.id === list.id ? 'default' : 'outline'}
                  className="w-full justify-start"
                  onClick={() => setActiveList(list)}
                >
                  <div className="flex items-center gap-2 w-full">
                    {listType === 'shared' ? (
                      <Share2 className="h-4 w-4 flex-shrink-0" />
                    ) : (
                      <ShoppingCart className="h-4 w-4 flex-shrink-0" />
                    )}
                    <span className="truncate">{list.name}</span>
                    <span className="text-xs text-muted-foreground ml-auto">
                      {list.items.length} items
                    </span>
                  </div>
                </Button>
              ))}
              {(listType === 'owned' ? ownedLists : sharedLists).length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  {listType === 'owned' ? (
                    <p>You haven't created any lists yet</p>
                  ) : (
                    <p>No lists have been shared with you</p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Share List Dialog */}
        <Dialog open={isShareDialogOpen} onOpenChange={setIsShareDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Share List: {activeList?.name}</DialogTitle>
              <DialogDescription>
                Choose how you want to share this grocery list. Anyone with the link can view.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-3">
              {(['sms', 'email', 'whatsapp', 'copy'] as const).map((method) => {
                const shareUrl = activeList ? `${window.location.origin}/shared-list/${activeList.id}` : '';
                let href = '#';
                let target = '_blank';
                let icon = <LinkIcon className="h-4 w-4 mr-2" />;
                let label = 'Copy Link';

                if (method === 'sms') {
                  href = `sms:?&body=${encodeURIComponent(`Check out my grocery list: ${shareUrl}`)}`;
                  target = '_self';
                  label = 'Send via SMS';
                  // Assuming you have an icon for SMS, e.g., MessageSquare
                  // icon = <MessageSquare className="h-4 w-4 mr-2" />;
                } else if (method === 'email') {
                  href = `mailto:?subject=${encodeURIComponent(`Grocery List: ${activeList?.name}`)}&body=${encodeURIComponent(`Here's the grocery list we're working on:
${shareUrl}`)}`;
                  target = '_self';
                  label = 'Send via Email';
                  // Assuming you have an icon for Email, e.g., Mail
                  // icon = <Mail className="h-4 w-4 mr-2" />;
                } else if (method === 'whatsapp') {
                  href = `https://wa.me/?text=${encodeURIComponent(`Check out our grocery list: ${shareUrl}`)}`;
                  label = 'Share on WhatsApp';
                  // Assuming you have a WhatsApp icon
                  // icon = <WhatsAppIcon className="h-4 w-4 mr-2" />;
                } else { // copy
                  // href is not used, onClick handles it
                }

                return (
                  <Button
                    key={method}
                    variant="outline"
                    className="w-full justify-start"
                    onClick={(e) => {
                      if (method === 'copy') {
                        e.preventDefault();
                        navigator.clipboard.writeText(shareUrl).then(() => {
                          toast({ title: "Link Copied!" });
                          setIsShareDialogOpen(false); // Close dialog after copying
                        });
                      } else {
                        // For links, let the default behavior happen, but close dialog
                        setIsShareDialogOpen(false);
                        // No need to preventDefault for actual links
                      }
                    }}
                    // Use anchor tag for sms, email, whatsapp for better mobile handling
                    {...(method !== 'copy' ? { asChild: true } : {})}
                  >
                    {method !== 'copy' ? (
                      <a href={href} target={target} className="flex items-center w-full">
                        {icon} {label}
                      </a>
                    ) : (
                      <>
                        {icon} {label}
                      </>
                    )}
                  </Button>
                );
              })}
            </div>
            <DialogFooter className="sm:justify-end">
              <Button type="button" variant="secondary" onClick={() => setIsShareDialogOpen(false)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default GroceryList;