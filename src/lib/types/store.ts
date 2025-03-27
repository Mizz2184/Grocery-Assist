export interface Product {
  id: string;
  name: string;
  price: number;
  description?: string;
  imageUrl?: string;
  brand?: string;
  category?: string;
  store: 'MaxiPali' | 'Automercado' | 'MasxMenos' | 'PriceSmart' | 'Unknown';
  url?: string;
  sku?: string;
  inStock?: boolean;
  barcode?: string;
  ean?: string;
  source?: string;
  pricePerUnit?: number;
  unitType?: string;
}

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