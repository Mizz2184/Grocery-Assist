import { useNavigate } from "react-router-dom";
import { ProductCard } from "@/components/ProductCard";
import { Product } from "@/lib/types/store";
import { useSearchNavigation } from "@/hooks/useSearchNavigation";

interface ProductCardWithNavigationProps {
  product: Product;
  isInList?: boolean;
  onAddToList?: (productId: string) => Promise<void>;
  index?: number;
}

export const ProductCardWithNavigation = ({
  product,
  isInList = false,
  onAddToList,
  index = 0
}: ProductCardWithNavigationProps) => {
  const { navigatePreservingSearch } = useSearchNavigation();
  
  const handleCardClick = () => {
    // Navigate to product detail while preserving search state
    navigatePreservingSearch(`/product/${product.id}`);
  };
  
  return (
    <div className="cursor-pointer" onClick={handleCardClick}>
      <ProductCard
        product={product}
        isInList={isInList}
        onAddToList={onAddToList}
        index={index}
      />
    </div>
  );
}; 