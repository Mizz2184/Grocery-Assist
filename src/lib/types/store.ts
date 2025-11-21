import { STORE } from "@/utils/storeUtils";

export type StoreType = 'Walmart' | 'MaxiPali' | 'MasxMenos' | 'PriceSmart' | 'Automercado' | 'Unknown' | string;

export interface Product {
  id: string;
  name: string;
  brand?: string;
  description?: string;
  imageUrl?: string;
  price: number;
  currency: string;
  store?: StoreType;
  url?: string;
  productType?: string;
  attributes?: {
    [key: string]: any;
  };
  unit?: string;
  quantity?: number;
  regularPrice?: number;  // Original price before discount
  salePrice?: number;     // Discounted price (same as price when on sale)
  isOnSale?: boolean;     // Whether the product is currently on sale
}

export type ProductPrice = {
  storeId: string;
  price: number;
  currency: string;
  date: string;
  regularPrice?: number;
  salePrice?: number;
  isOnSale?: boolean;
};

export type SearchFilters = {
  store?: string;
  minPrice?: number;
  maxPrice?: number;
  inStock?: boolean;
  onSale?: boolean;
  category?: string;
  brand?: string;
  sortBy?: 'price' | 'relevance' | 'name';
  sortOrder?: 'asc' | 'desc';
};

export interface ProductSearchParams {
  query?: string;
  category?: string;
  page?: number;
  pageSize?: number;
}

export interface ProductSearchResponse {
  products: Product[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
} 