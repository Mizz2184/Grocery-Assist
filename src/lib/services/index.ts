import { Product, ProductSearchParams, ProductSearchResponse } from "@/lib/types/store";

export const searchMaxiPaliProducts = async ({ 
  query, 
  page = 1,
  pageSize = 49
}: ProductSearchParams): Promise<ProductSearchResponse> => {
  try {
    console.log('Searching MaxiPali for:', query);
    
    // Use relative path that will be handled by Vite's proxy
    const searchResponse = await fetch('/api/proxy/maxipali/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query,
        page,
        pageSize
      })
    });

    if (!searchResponse.ok) {
      throw new Error(`MaxiPali search failed: ${searchResponse.status} ${searchResponse.statusText}`);
    }

    const data = await searchResponse.json();
    return {
      products: data.products || [],
      total: data.total || 0,
      page,
      pageSize,
      hasMore: (data.products || []).length === pageSize
    };
  } catch (error) {
    console.error('Error fetching MaxiPali products:', error);
    return {
      products: [],
      total: 0,
      page,
      pageSize,
      hasMore: false,
// Remove error property since it's not defined in ProductSearchResponse type
    };
  }
};