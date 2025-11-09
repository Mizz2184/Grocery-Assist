import { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { ArrowLeft, Plus, Minus, ShoppingCart, Check, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { storeColors, STORE } from "@/utils/storeUtils";
import { useTranslation } from "@/context/TranslationContext";
import { Product as ProductType } from "@/lib/types/store";
import { addProductToGroceryList, getUserGroceryLists } from "@/lib/services/groceryListService";
import { useGroceryList } from "@/hooks/useGroceryList";
import { 
  searchMaxiPaliProducts, 
  searchMasxMenosProducts, 
  searchWalmartProducts, 
  searchAutomercadoProducts 
} from "@/lib/services";

const formatPrice = (price: number) => {
  return new Intl.NumberFormat('es-CR', {
    style: 'currency',
    currency: 'CRC',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(price);
};

const ProductDetail = () => {
  const { productId } = useParams<{ productId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const { translateTitle, translateText, translateUI } = useTranslation();
  const [product, setProduct] = useState<ProductType | null>(null);
  const [relatedProducts, setRelatedProducts] = useState<ProductType[]>([]);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [isAdding, setIsAdding] = useState(false);
  const [isInList, setIsInList] = useState(false);

  // Parse product ID (format: "store|id")
  const [store, id] = productId?.split('|') || [];

  useEffect(() => {
    const fetchProduct = async () => {
      if (!store || !id) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        
        // First, check if product was passed through navigation state
        const stateProduct = (location.state as any)?.product;
        if (stateProduct && stateProduct.id === id) {
          setProduct(stateProduct);
          
          // Still fetch related products
          const brandSearch = stateProduct.brand || stateProduct.name.split(' ')[0];
          let related: ProductType[] = [];
          
          switch (store.toLowerCase()) {
            case 'walmart':
              const walmartRelated = await searchWalmartProducts({ query: brandSearch });
              related = walmartRelated.products;
              break;
            case 'maxipali':
            case 'maxi pali':
              const maxipaliRelated = await searchMaxiPaliProducts({ query: brandSearch });
              related = maxipaliRelated.products;
              break;
            case 'masxmenos':
            case 'mas x menos':
              const masxmenosRelated = await searchMasxMenosProducts({ query: brandSearch });
              related = masxmenosRelated.products;
              break;
            case 'automercado':
              const automercadoRelated = await searchAutomercadoProducts({ query: brandSearch });
              related = automercadoRelated.products;
              break;
          }
          
          setRelatedProducts(related.filter(p => p.id !== id).slice(0, 6));
          setLoading(false);
          return;
        }
        
        // If no product in state, search by product name (use id as query since it might be the name)
        let searchResults: ProductType[] = [];
        
        switch (store.toLowerCase()) {
          case 'walmart':
            const walmartResponse = await searchWalmartProducts({ query: id });
            searchResults = walmartResponse.products;
            break;
          case 'maxipali':
          case 'maxi pali':
            const maxipaliResponse = await searchMaxiPaliProducts({ query: id });
            searchResults = maxipaliResponse.products;
            break;
          case 'masxmenos':
          case 'mas x menos':
            const masxmenosResponse = await searchMasxMenosProducts({ query: id });
            searchResults = masxmenosResponse.products;
            break;
          case 'automercado':
            const automercadoResponse = await searchAutomercadoProducts({ query: id });
            searchResults = automercadoResponse.products;
            break;
          default:
            // Try all stores
            const [walmart, maxipali, masxmenos, automercado] = await Promise.all([
              searchWalmartProducts({ query: id }),
              searchMaxiPaliProducts({ query: id }),
              searchMasxMenosProducts({ query: id }),
              searchAutomercadoProducts({ query: id })
            ]);
            searchResults = [...walmart.products, ...maxipali.products, ...masxmenos.products, ...automercado.products];
        }

        // Find the exact product
        const foundProduct = searchResults.find(p => p.id === id);
        
        if (foundProduct) {
          setProduct(foundProduct);
          
          // Search for related products (same brand or similar name)
          const brandSearch = foundProduct.brand || foundProduct.name.split(' ')[0];
          let related: ProductType[] = [];
          
          switch (store.toLowerCase()) {
            case 'walmart':
              const walmartRelated = await searchWalmartProducts({ query: brandSearch });
              related = walmartRelated.products;
              break;
            case 'maxipali':
            case 'maxi pali':
              const maxipaliRelated = await searchMaxiPaliProducts({ query: brandSearch });
              related = maxipaliRelated.products;
              break;
            case 'masxmenos':
            case 'mas x menos':
              const masxmenosRelated = await searchMasxMenosProducts({ query: brandSearch });
              related = masxmenosRelated.products;
              break;
            case 'automercado':
              const automercadoRelated = await searchAutomercadoProducts({ query: brandSearch });
              related = automercadoRelated.products;
              break;
          }
          
          // Filter out current product and limit to 6
          setRelatedProducts(related.filter(p => p.id !== id).slice(0, 6));
        }
      } catch (error) {
        console.error('Error fetching product:', error);
        toast({
          title: "Error",
          description: "Failed to load product details",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();
  }, [productId, store, id, toast]);

  // Check if product is in list
  useEffect(() => {
    const checkIfInList = async () => {
      if (!user || !product) return;
      
      try {
        const lists = await getUserGroceryLists(user.id);
        const inList = lists.some(list => 
          list.items.some(item => item.productId === product.id)
        );
        setIsInList(inList);
      } catch (error) {
        console.error('Error checking if product in list:', error);
      }
    };

    checkIfInList();
  }, [user, product]);

  const handleAddToList = async () => {
    if (!user) {
      toast({
        title: "Error",
        description: "Please log in to add products to your list",
        variant: "destructive",
      });
      return;
    }

    if (!product) return;

    const currentActiveList = useGroceryList.getState().activeList;
    
    if (!currentActiveList) {
      toast({
        title: "No List Selected",
        description: "Please select or create a grocery list first",
        variant: "destructive",
      });
      navigate('/grocery-list');
      return;
    }

    try {
      setIsAdding(true);

      const productToAdd = {
        ...product,
        quantity,
        store: product.store || STORE.UNKNOWN
      };

      const result = await addProductToGroceryList(
        currentActiveList.id,
        user.id,
        productToAdd
      );

      if (result.success) {
        setIsInList(true);
        toast({
          title: "Added to List",
          description: `${product.name} has been added to ${currentActiveList.name}`,
        });
      } else {
        toast({
          title: "Error",
          description: result.message || "Failed to add product to list",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error adding product to list:', error);
      toast({
        title: "Error",
        description: "An error occurred while adding the product to your list",
        variant: "destructive",
      });
    } finally {
      setIsAdding(false);
    }
  };

  const handleBack = () => {
    // Go back to search results with preserved query
    if (location.state?.from) {
      navigate(location.state.from);
    } else {
      navigate('/');
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse">
          <div className="h-8 w-32 bg-muted rounded mb-6"></div>
          <div className="grid md:grid-cols-2 gap-8">
            <div className="aspect-square bg-muted rounded-lg"></div>
            <div className="space-y-4">
              <div className="h-8 bg-muted rounded w-3/4"></div>
              <div className="h-4 bg-muted rounded w-1/2"></div>
              <div className="h-24 bg-muted rounded"></div>
              <div className="h-12 bg-muted rounded"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Button
          variant="ghost"
          onClick={handleBack}
          className="mb-6"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          {translateUI("Volver")}
        </Button>
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-muted-foreground">
              {translateUI("Producto no encontrado")}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* Back Button */}
      <Button
        variant="ghost"
        onClick={handleBack}
        className="mb-6 hover:bg-accent"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        {translateUI("Volver a resultados")}
      </Button>

      {/* Product Details */}
      <div className="grid md:grid-cols-2 gap-8 mb-12">
        {/* Product Image */}
        <div className="relative">
          <div className="aspect-square w-full overflow-hidden rounded-lg bg-muted border">
            <img
              src={product.imageUrl || 'https://placehold.co/600?text=No+Image'}
              alt={translateTitle(product.name)}
              className="w-full h-full object-contain"
            />
          </div>
          {product.store && (
            <Badge
              variant="secondary"
              className={cn(
                "absolute top-4 left-4 py-1 px-3 text-sm font-medium",
                storeColors[product.store as keyof typeof storeColors] || storeColors[STORE.UNKNOWN]
              )}
            >
              {product.store}
            </Badge>
          )}
        </div>

        {/* Product Info */}
        <div className="flex flex-col">
          <div className="flex-grow">
            <h1 className="text-3xl font-bold mb-2">
              {translateTitle(product.name)}
            </h1>
            
            {product.brand && (
              <p className="text-lg text-muted-foreground mb-4">
                {translateText(product.brand)}
              </p>
            )}

            <div className="text-4xl font-bold text-primary mb-6">
              {formatPrice(product.price)}
            </div>

            {/* Description */}
            {product.description && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-2">
                  {translateUI("Descripción")}
                </h3>
                <p className="text-muted-foreground leading-relaxed">
                  {translateText(product.description)}
                </p>
              </div>
            )}

            {/* Additional Info */}
            <div className="space-y-2 mb-6">
              {(product as any).category && (
                <div className="flex items-center gap-2">
                  <span className="font-medium">{translateUI("Categoría")}:</span>
                  <span className="text-muted-foreground">{translateText((product as any).category)}</span>
                </div>
              )}
              {(product as any).barcode && (
                <div className="flex items-center gap-2">
                  <span className="font-medium">{translateUI("Código de barras")}:</span>
                  <span className="text-muted-foreground font-mono">{(product as any).barcode}</span>
                </div>
              )}
            </div>
          </div>

          {/* Quantity Selector and Add Button */}
          <div className="border-t pt-6 mt-6">
            <div className="flex items-center gap-4 mb-4">
              <span className="font-medium">{translateUI("Cantidad")}:</span>
              <div className="flex items-center gap-2 border rounded-lg">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-10 w-10"
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  disabled={quantity <= 1}
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <span className="text-lg font-semibold px-4 min-w-[48px] text-center">
                  {quantity}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-10 w-10"
                  onClick={() => setQuantity(quantity + 1)}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <Button
              size="lg"
              className="w-full"
              onClick={handleAddToList}
              disabled={isAdding || isInList}
            >
              {isAdding ? (
                <span className="animate-spin h-5 w-5 border-2 border-current border-t-transparent rounded-full"></span>
              ) : isInList ? (
                <>
                  <ShoppingCart className="mr-2 h-5 w-5" />
                  {translateUI("En la Lista")}
                </>
              ) : (
                <>
                  <Plus className="mr-2 h-5 w-5" />
                  {translateUI("Agregar a la Lista")}
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Related Products / Flavors */}
      {relatedProducts.length > 0 && (
        <div>
          <h2 className="text-2xl font-bold mb-6">
            {translateUI("Productos relacionados")}
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {relatedProducts.map((relatedProduct) => (
              <Card
                key={relatedProduct.id}
                className="cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => {
                  const navId = `${relatedProduct.store || 'unknown'}|${relatedProduct.id}`;
                  navigate(`/product/${navId}`, { 
                    state: { 
                      from: location.pathname,
                      product: relatedProduct 
                    } 
                  });
                }}
              >
                <CardContent className="p-3">
                  <div className="aspect-square w-full overflow-hidden rounded-md mb-2 bg-muted">
                    <img
                      src={relatedProduct.imageUrl || 'https://placehold.co/200?text=No+Image'}
                      alt={translateTitle(relatedProduct.name)}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <h3 className="font-medium text-sm line-clamp-2 mb-1">
                    {translateTitle(relatedProduct.name)}
                  </h3>
                  <p className="text-sm font-semibold text-primary">
                    {formatPrice(relatedProduct.price)}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductDetail;
