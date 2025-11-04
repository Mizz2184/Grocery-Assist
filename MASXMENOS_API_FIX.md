# MasxMenos API Fix

## Problem
The MasxMenos API was not returning any products. The search endpoint was returning empty results.

## Root Cause
The implementation was using a **persisted GraphQL query** approach with a hardcoded `sha256Hash`. This hash was either:
1. Outdated/invalid
2. Not matching the current MasxMenos GraphQL schema

When the API received the persisted query request, it returned:
```json
{
  "errors": [{
    "message": "PersistedQueryNotFound",
    "extensions": {
      "code": "PERSISTED_QUERY_NOT_FOUND"
    }
  }]
}
```

## Solution
Replaced the complex GraphQL persisted query approach with the **VTEX Catalog API**, which is:
- Simpler and more reliable
- Uses standard REST endpoints
- Doesn't require persisted query hashes
- Returns the same product data

### Changes Made in `server.js`

**Before:**
- Used GraphQL endpoint: `https://www.masxmenos.cr/_v/segment/graphql/v1`
- Required persisted query hash and complex extensions
- Made GET requests with base64-encoded variables

**After:**
- Uses VTEX Catalog API: `https://www.masxmenos.cr/api/catalog_system/pub/products/search`
- Simple query parameters: `ft` (full text search), `_from`, `_to`
- Transforms response to match expected GraphQL format for frontend compatibility

### API Endpoint
```
GET https://www.masxmenos.cr/api/catalog_system/pub/products/search?ft=<query>&_from=<start>&_to=<end>
```

### Example Request
```bash
curl 'https://www.masxmenos.cr/api/catalog_system/pub/products/search?ft=arroz&_from=0&_to=9'
```

## Testing
Verified the fix works with multiple search queries:
- "arroz" - Returns rice products
- "leche" - Returns milk products
- Products include proper pricing, images, and metadata

## Impact
- ✅ MasxMenos products now display correctly in the app
- ✅ Price comparison feature works across all stores
- ✅ Search functionality restored
- ✅ No breaking changes to frontend code (response format maintained)
