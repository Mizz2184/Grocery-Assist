// MaxiPali and Mas x Menos (VTEX) types
export interface VTEXProductResponse {
  data: {
    productSearch: {
      products: Array<{
        productId: string;
        productName: string;
        brand: string;
        items: Array<{
          itemId: string;
          name: string;
          nameComplete: string;
          images: Array<{
            imageUrl: string;
          }>;
          sellers: Array<{
            commertialOffer: {
              Price: number;
              ListPrice: number;
              AvailableQuantity: number;
            };
          }>;
        }>;
      }>;
      pagination: {
        count: number;
        current: number;
        perPage: number;
        total: number;
      };
    };
  };
}

// Automercado (Algolia) types
export interface AlgoliaProductResponse {
  results: Array<{
    hits: Array<{
      objectID: string;
      name: string;
      price: number;
      description: string;
      image: string;
      brand: string;
      category: string;
      sku: string;
      inventory: number;
    }>;
    nbHits: number;
    page: number;
    hitsPerPage: number;
  }>;
}

// PriceSmart types
export interface PriceSmartProductResponse {
  products: Array<{
    itemNumber: number;
    description: string;
    price: number;
    longDescription: string;
    imageUrl: string;
    brand: string;
    category: string;
    inStock: boolean;
  }>;
  total: number;
  currentPage: number;
  limit: number;
} 