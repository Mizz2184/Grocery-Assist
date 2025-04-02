export type StoreType = 'Walmart' | 'MaxiPali' | 'MasxMenos' | 'PriceSmart' | 'Automercado' | 'Unknown' | string;

export type Product = {
  id: string;
  name: string;
  description?: string;
  brand?: string;
  price?: number;
  regularPrice?: number;
  salePrice?: number;
  image?: string;
  imageUrl?: string;
  largeImage?: string;
  thumbnailImage?: string;
  store?: StoreType;
  category?: string;
  url?: string;
  barcode?: string;
  prices?: ProductPrice[];
  productType?: string;
  productStatus?: 'available' | 'unavailable';
  attributes?: { [key: string]: any };
};

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