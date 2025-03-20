
import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { getProductById, Product as ProductType } from "@/utils/productData";
import { PriceComparison } from "@/components/PriceComparison";
import { stores } from "@/utils/storeData";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  ArrowLeft, 
  Plus, 
  Check, 
  Share2, 
  Store 
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";
import { mockGroceryLists } from "@/utils/productData";
import { useAuth } from "@/hooks/useAuth";

const Product = () => {
  const { id } = useParams<{ id: string }>();
  const [product, setProduct] = useState<ProductType | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [isInList, setIsInList] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    const fetchProduct = () => {
      if (!id) return;

      // Simulate API call delay
      setTimeout(() => {
        const productData = getProductById(id);
        setProduct(productData || null);
        
        // Check if product is in user's list
        if (user && productData) {
          const inList = mockGroceryLists.some(list => 
            list.createdBy === user.id &&
            list.items.some(item => item.productId === productData.id)
          );
          setIsInList(inList);
        }
        
        setLoading(false);
      }, 800);
    };

    fetchProduct();
  }, [id, user]);

  const handleAddToList = () => {
    if (!user) {
      toast({
        title: "Sign in required",
        description: "Please sign in to add items to your grocery list.",
        variant: "destructive",
      });
      navigate("/profile");
      return;
    }

    setIsAdding(true);
    
    // Mock API delay
    setTimeout(() => {
      toast({
        title: "Added to list",
        description: `${product?.name} has been added to your list.`,
      });
      
      setIsAdding(false);
      setIsInList(true);
    }, 600);
  };

  const handleShare = () => {
    if (navigator.share && product) {
      navigator.share({
        title: `${product.name} - Price Comparison`,
        text: `Check out the prices for ${product.name} on Cost Comrade!`,
        url: window.location.href,
      }).catch(err => {
        console.error('Error sharing:', err);
      });
    } else {
      // Fallback for browsers that don't support navigator.share
      navigator.clipboard.writeText(window.location.href).then(() => {
        toast({
          title: "Link copied",
          description: "The product link has been copied to your clipboard.",
        });
      });
    }
  };

  if (loading) {
    return (
      <div className="page-container">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center gap-2 mb-6">
            <Button 
              variant="ghost" 
              size="icon" 
              className="rounded-full"
              disabled
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="h-6 w-32 bg-muted animate-pulse rounded" />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="aspect-square bg-muted animate-pulse rounded-lg" />
            <div className="space-y-4">
              <div className="h-8 w-3/4 bg-muted animate-pulse rounded" />
              <div className="h-6 w-1/3 bg-muted animate-pulse rounded" />
              <div className="h-16 bg-muted animate-pulse rounded mt-6" />
              <div className="h-32 bg-muted animate-pulse rounded mt-6" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="page-container">
        <div className="max-w-5xl mx-auto text-center py-12">
          <h1 className="text-2xl font-medium mb-4">Product Not Found</h1>
          <p className="text-muted-foreground mb-6">
            The product you're looking for doesn't exist or has been removed.
          </p>
          <Link to="/">
            <Button>Return to Home</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center gap-2 mb-6">
          <Link to="/">
            <Button variant="ghost" size="icon" className="rounded-full">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <span className="text-muted-foreground">Back to search</span>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="relative overflow-hidden rounded-lg bg-muted/30 aspect-square">
            <img 
              src={product.image} 
              alt={product.name} 
              className="w-full h-full object-cover animate-scale-in"
            />
          </div>
          
          <div className="space-y-6 animate-fade-in">
            <div>
              <div className="flex items-start justify-between gap-4">
                <h1 className="text-3xl font-medium">{product.name}</h1>
                <Button
                  variant="ghost"
                  size="icon"
                  className="rounded-full"
                  onClick={handleShare}
                >
                  <Share2 className="w-5 h-5" />
                </Button>
              </div>
              <p className="text-lg text-muted-foreground">{product.brand}</p>
              <div className="flex items-center gap-2 mt-2">
                <Badge variant="secondary" className="font-normal">
                  {product.category}
                </Badge>
                <Badge variant="outline" className="font-normal">
                  Barcode: {product.barcode}
                </Badge>
              </div>
            </div>
            
            <Button
              className={cn(
                "w-full rounded-full h-12 gap-2",
                isInList && "bg-green-600 hover:bg-green-700"
              )}
              disabled={isAdding || isInList}
              onClick={handleAddToList}
            >
              {isInList ? (
                <>
                  <Check className="h-5 w-5" />
                  Added to List
                </>
              ) : isAdding ? (
                <>
                  <span className="h-5 w-5 rounded-full border-2 border-current border-t-transparent animate-spin" />
                  Adding to List...
                </>
              ) : (
                <>
                  <Plus className="h-5 w-5" />
                  Add to Grocery List
                </>
              )}
            </Button>
            
            <PriceComparison prices={product.prices} detailed />
            
            <div className="pt-4">
              <h3 className="text-lg font-medium mb-3">Available Stores</h3>
              <div className="grid grid-cols-2 gap-3">
                {product.prices.map((price) => {
                  const storeId = price.storeId;
                  const store = stores.find(s => s.id === storeId);
                  if (!store) return null;
                  
                  return (
                    <a 
                      key={storeId}
                      href={store.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 p-3 rounded-lg glass-card glass-hover"
                      style={{ borderLeft: `3px solid ${store.color}` }}
                    >
                      <div 
                        className="w-8 h-8 rounded-full flex items-center justify-center"
                        style={{ backgroundColor: store.color }}
                      >
                        <Store className="w-4 h-4 text-white" />
                      </div>
                      <span className="font-medium">{store.name}</span>
                    </a>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Product;
