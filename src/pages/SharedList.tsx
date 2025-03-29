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
  CardContent 
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui/use-toast";
import { 
  ShoppingCart, 
  ArrowLeft, 
  Check, 
  Share2
} from "lucide-react";
import { GroceryList as GroceryListType } from "@/utils/productData";
import { getSharedGroceryListById } from "@/lib/services/groceryListService";
import { convertCRCtoUSD } from "@/utils/currencyUtils";

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

const getProductStore = (product: any): string => {
  if (!product) return 'Unknown';
  
  // Use type assertion to avoid TypeScript errors
  const anyProduct = product as any;
  
  // Direct store property
  if (anyProduct.store) {
    // Normalize store names
    const storeName = String(anyProduct.store).trim();
    if (storeName.includes('MaxiPali') || storeName.toLowerCase() === 'maxipali') return 'MaxiPali';
    if (storeName.includes('MasxMenos') || storeName.toLowerCase() === 'masxmenos') return 'MasxMenos';
    return storeName;
  }
  
  // If product has prices array (mock product structure)
  if (anyProduct.prices && Array.isArray(anyProduct.prices) && anyProduct.prices.length > 0) {
    const storeId = String(anyProduct.prices[0].storeId || '').toLowerCase();
    if (storeId === 'maxipali') return 'MaxiPali';
    if (storeId === 'masxmenos') return 'MasxMenos';
  }
  
  return 'Other';
};

const SharedList = () => {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { listId } = useParams<{ listId: string }>();
  
  const [sharedList, setSharedList] = useState<GroceryListType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    const fetchSharedList = async () => {
      if (!user || !listId) {
        setLoading(false);
        return;
      }
      
      try {
        const list = await getSharedGroceryListById(user.id, listId);
        
        if (!list) {
          setError("You don't have access to this list or it doesn't exist.");
          toast({
            title: "Access denied",
            description: "You don't have access to this list or it doesn't exist.",
            variant: "destructive",
          });
        } else {
          setSharedList(list);
        }
      } catch (error) {
        console.error('Error fetching shared list:', error);
        setError("Failed to load the shared list. Please try again.");
        toast({
          title: "Error",
          description: "Failed to load the shared list. Please try again.",
          variant: "destructive",
        });
      } finally {
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

  const calculateTotalPrice = () => {
    if (!sharedList) return { total: 0, currency: '₡' };
    
    let total = 0;
    let currency = '₡';
    
    sharedList.items.forEach(item => {
      if (item.productData) {
        // Use the helper function to properly extract price regardless of product structure
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

  const formatUSD = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  if (authLoading || loading) {
    return (
      <div className="page-container">
        <div className="max-w-4xl mx-auto">
          <div className="h-8 w-48 bg-muted animate-pulse rounded mb-8" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-3">
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
    return (
      <div className="page-container">
        <div className="flex flex-col items-center justify-center py-16 text-center max-w-md mx-auto gap-6">
          <div className="rounded-full bg-muted p-4">
            <ShoppingCart className="w-12 h-12 text-muted-foreground" />
          </div>
          <h1 className="text-3xl font-bold">Access Denied</h1>
          <p className="text-muted-foreground">
            {error}
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
              {sharedList.isShared && (
                <p className="text-sm text-muted-foreground">
                  Shared by {sharedList.createdBy}
                </p>
              )}
            </div>
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
                    // Define the proper store names and their order
                    const storeOrder = ['MaxiPali', 'MasxMenos', 'Other'];
                    const storeGroups: Record<string, any[]> = {
                      'MaxiPali': [],
                      'MasxMenos': [],
                      'Other': []
                    };
                    
                    // Group items by store using the getProductStore helper
                    sharedList.items.forEach(item => {
                      // Use the helper function to determine the store
                      let store = item.productData ? getProductStore(item.productData) : 'Other';
                      
                      // Add to appropriate group
                      storeGroups[store].push(item);
                    });
                    
                    // Render each store group in order, only if they have items
                    return storeOrder
                      .filter(store => storeGroups[store].length > 0)
                      .map(store => (
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
                            ({storeGroups[store].length} {storeGroups[store].length === 1 ? 'item' : 'items'})
                          </div>
                        </div>
                        
                        <div className={cn(
                          "space-y-3 border-l-4 pl-4",
                          store === 'MaxiPali' ? "border-yellow-500" : 
                          store === 'MasxMenos' ? "border-green-600" : "border-gray-500"
                        )}>
                          {storeGroups[store].map(item => (
                            <GroceryListItem
                              key={item.id}
                              item={item}
                              onUpdateQuantity={(id, quantity) => {
                                // View-only - don't update
                              }}
                              onToggleCheck={(id, checked) => {
                                // View-only - don't update
                              }}
                              onRemove={(id) => {
                                // View-only - don't remove
                              }}
                              readOnly={true}
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
          </Card>
        </div>
      </div>
    </div>
  );
};

export default SharedList; 