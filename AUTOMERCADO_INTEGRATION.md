# Automercado Integration

## Overview
Successfully integrated Automercado as the 4th grocery store in the Grocery-Assist app, using their Algolia-powered search API.

## Changes Made

### 1. Frontend (src/pages/Index.tsx)
- ✅ Added Automercado logo to featured stores section
- ✅ Added Automercado to store filter dropdown
- ✅ Updated subtitle to include Automercado
- ✅ Integrated Automercado search in parallel with other stores
- ✅ Added Automercado product count tracking

### 2. Services (src/lib/services/index.ts)
- ✅ Created `searchAutomercadoProducts` function
- ✅ Transforms Algolia hits to Product format
- ✅ Handles Automercado-specific field mapping:
  - `ecomDescription` → product name
  - `storeDetail.06.basePrice` → price
  - `imageUrl` → product image
  - `supplier` → brand

### 3. Backend (server.js)
- ✅ Added `/api/proxy/automercado/search` endpoint
- ✅ Configured Algolia API integration:
  - Application ID: FU5XFX7KNL
  - API Key: 113941a18a90ae0f17d602acd16f91b2
  - Index: Product_CatalogueV2
- ✅ Implemented category filters for all grocery departments
- ✅ Store-specific filter (storeDetail.06 for main store)

### 4. Store Utilities (src/utils/storeUtils.ts)
- ✅ Automercado already defined in STORE constants
- ✅ Store color: pink-600
- ✅ Store detection logic already in place

## API Configuration

### Algolia Search Endpoint
```
POST https://fu5xfx7knl-dsn.algolia.net/1/indexes/*/queries
```

### Request Structure
```json
{
  "requests": [{
    "indexName": "Product_CatalogueV2",
    "page": 0,
    "hitsPerPage": 30,
    "query": "search term",
    "facetFilters": [
      ["categoryPageId:abarrotes", "categoryPageId:bebidas-y-licores", ...],
      ["storeDetail.06.hasInvontory:1"]
    ]
  }]
}
```

### Response Structure
```json
{
  "results": [{
    "hits": [{
      "objectID": "...",
      "ecomDescription": "Product Name",
      "imageUrl": "https://...",
      "supplier": "Brand Name",
      "storeDetail": {
        "06": {
          "basePrice": 1234,
          "hasInvontory": 1
        }
      }
    }]
  }]
}
```

## Testing Results

### Search Test
```bash
Query: "cafe" → Found 3 products
  • MEZCLA SALSA CAFÉ ESSENTIAL EVERYDAY PAQUETE 24 G - ₡735
  • SALSA PICANTE CAFE LE PIQUANT LA SELVA - ₡3355
  • ACCESORIO JUGUETE PELUCHE TAZA TIKI BARKTENDER CAF - ₡8900
```

## Features
- ✅ Real-time product search
- ✅ Price comparison across 4 stores
- ✅ Store-specific filtering
- ✅ Product images and details
- ✅ Proper price formatting (CRC)
- ✅ Inventory filtering (only in-stock items)

## Store Lineup
1. **Walmart** - VTEX Catalog API
2. **MaxiPali** - VTEX Catalog API  
3. **MasxMenos** - VTEX Catalog API
4. **Automercado** - Algolia Search API ✨ NEW

## Logo
- URL: https://automercado.cr/content/images/logoAM.svg
- Displays in featured stores carousel
- Shows in product badges

## Next Steps
- Consider adding barcode lookup for Automercado
- Add Automercado to price comparison function
- Test with various product categories
