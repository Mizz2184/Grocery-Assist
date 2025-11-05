# Automercado Product Scraper Guide

## Overview
The Automercado scraper allows you to retrieve all products from Automercado's catalog using their Algolia search API. This is useful for building a complete product database, price tracking, or analytics.

## API Endpoint

### GET `/api/proxy/automercado/scrape-all`

Retrieves products from Automercado with pagination support.

#### Query Parameters
- `page` (optional, default: 0) - Page number (0-indexed)
- `hitsPerPage` (optional, default: 1000, max: 1000) - Number of products per page

#### Response Format
```json
{
  "hits": [...],
  "pagination": {
    "page": 0,
    "hitsPerPage": 1000,
    "totalHits": 2988,
    "totalPages": 200,
    "hasMore": true
  },
  "facets": {...},
  "processingTimeMS": 45
}
```

## Current Stats
- **Total Products**: 2,988
- **Total Pages**: 200 (at 15 products per page)
- **Categories**: 15 grocery categories
- **Store**: Store 06 (main location)

## Usage

### 1. Direct API Call

```bash
# Get first page (5 products)
curl "http://localhost:8080/api/proxy/automercado/scrape-all?page=0&hitsPerPage=5"

# Get page 2 with 100 products
curl "http://localhost:8080/api/proxy/automercado/scrape-all?page=1&hitsPerPage=100"

# Get maximum products per page (1000)
curl "http://localhost:8080/api/proxy/automercado/scrape-all?page=0&hitsPerPage=1000"
```

### 2. Using the Scraper Script

The included Node.js script automates the entire scraping process:

```bash
# Basic usage - scrape all products
node scripts/scrape-automercado.js

# Custom output file
node scripts/scrape-automercado.js --output my-products.json

# Limit to first 10 pages
node scripts/scrape-automercado.js --max-pages 10

# Custom hits per page
node scripts/scrape-automercado.js --hits-per-page 500
```

#### Script Features
- ✅ Automatic pagination
- ✅ Progress tracking
- ✅ Error handling with partial saves
- ✅ Statistics generation
- ✅ Rate limiting to avoid API overload

#### Example Output
```
🚀 Starting Automercado product scrape...

Configuration:
  - Output file: automercado-products.json
  - Hits per page: 1000
  - Max pages: all

📊 Total products available: 2,988
📄 Total pages: 3

✓ Page 1/3 - 1000 products (1,000 total) - 33.3%
✓ Page 2/3 - 1000 products (2,000 total) - 66.7%
✓ Page 3/3 - 988 products (2,988 total) - 100.0%

✅ Scraping complete!
   - Total products scraped: 2,988
   - Pages fetched: 3
   - Duration: 12.45s
   - Average: 240 products/second

💾 Saving to automercado-products.json...
✅ Successfully saved 2,988 products to automercado-products.json

📈 Statistics:
   Categories:
     - abarrotes: 1,245
     - bebidas-y-licores: 456
     - lacteos-y-embutidos: 389
     ...

   Prices (₡):
     - Products with price: 2,988
     - Min: ₡95
     - Max: ₡125,900
     - Average: ₡3,456.78
     - Median: ₡1,850
```

## Product Data Structure

Each product contains:

```json
{
  "objectID": "12345",
  "productNumber": "109929",
  "ecomDescription": "ARROZ BLANCO 99% TIO PELON paquete 1800 g",
  "supplier": "DISTRIBUIDORA Y LOGISTICA DISAL, S.A.",
  "imageUrl": "https://ik.imagekit.io/autoenlinea/imgjpg/109929.jpg",
  "categoryPageId": "abarrotes",
  "storeDetail": {
    "06": {
      "basePrice": 1895,
      "hasInvontory": 1,
      "amount": 1895,
      "hall": "Pasillo 11",
      "productAvailable": true
    }
  },
  "categories": [...],
  "unit": "paquete",
  "slug": "arroz-blanco-tio-pelon"
}
```

## Filtered Categories

The scraper retrieves products from these categories:
- `abarrotes` - Groceries
- `bebes-y-ninos` - Babies & Kids
- `bebidas-y-licores` - Beverages & Liquor
- `carnes-y-pescado` - Meat & Fish
- `coleccionables` - Collectibles
- `comidas-preparadas` - Prepared Foods
- `congelados-y-refrigerados` - Frozen & Refrigerated
- `cuidado-personal-y-belleza` - Personal Care & Beauty
- `frutas-y-verduras` - Fruits & Vegetables
- `lacteos-y-embutidos` - Dairy & Deli
- `limpieza-y-articulos-desechables` - Cleaning & Disposables
- `mascotas` - Pets
- `panaderia-reposteria-y-tortillas` - Bakery & Tortillas
- `snack-y-golosina` - Snacks & Candy
- `tienda-y-hogar` - Store & Home

## Use Cases

### 1. Price Tracking
Monitor price changes over time by scraping daily and comparing:

```javascript
const today = await scrapeAll();
const yesterday = JSON.parse(fs.readFileSync('yesterday.json'));

const priceChanges = today.products.filter(p => {
  const old = yesterday.products.find(y => y.objectID === p.objectID);
  return old && old.storeDetail['06'].basePrice !== p.storeDetail['06'].basePrice;
});
```

### 2. Product Database
Build a searchable product database:

```javascript
const products = JSON.parse(fs.readFileSync('automercado-products.json'));
const db = products.products.map(p => ({
  id: p.objectID,
  name: p.ecomDescription,
  price: p.storeDetail['06'].basePrice,
  category: p.categoryPageId,
  image: p.imageUrl,
  brand: p.supplier
}));
```

### 3. Analytics
Analyze product distribution and pricing:

```javascript
const avgPriceByCategory = {};
products.products.forEach(p => {
  const cat = p.categoryPageId;
  const price = p.storeDetail['06'].basePrice;
  if (!avgPriceByCategory[cat]) {
    avgPriceByCategory[cat] = { sum: 0, count: 0 };
  }
  avgPriceByCategory[cat].sum += price;
  avgPriceByCategory[cat].count++;
});
```

## Rate Limiting

The scraper includes a 100ms delay between pages to avoid overwhelming the API. For production use, consider:
- Increasing delay to 500-1000ms
- Implementing exponential backoff on errors
- Caching results to reduce API calls
- Running during off-peak hours

## Error Handling

The script automatically:
- Saves partial results if interrupted
- Retries failed requests
- Logs detailed error information
- Continues from last successful page

## Performance Tips

1. **Maximize hits per page**: Use 1000 (max) to minimize API calls
2. **Parallel requests**: Don't - Algolia rate limits may block you
3. **Incremental updates**: Only scrape new/changed products
4. **Cache results**: Store locally and refresh periodically

## Troubleshooting

### No products returned
- Check if server is running on port 8080
- Verify Algolia API key is still valid
- Check network connectivity

### Timeout errors
- Increase timeout in script (default: 60s)
- Reduce hitsPerPage
- Check server logs for details

### Partial results
- Check `*-partial.json` file for recovered data
- Resume from last successful page
- Verify disk space for output file

## Advanced: Custom Filters

Modify the endpoint to add custom filters:

```javascript
// In server.js, add to facetFilters:
facetFilters: [
  [...categories],
  ['storeDetail.06.hasInvontory:1'],
  ['storeDetail.06.basePrice:0 TO 5000'] // Only products under ₡5000
]
```

## API Limits

- **Max hits per page**: 1,000
- **Max pages**: No limit (but ~200 pages total)
- **Timeout**: 30 seconds per request
- **Rate limit**: Not officially documented, use delays

## Next Steps

- Set up automated daily scraping with cron
- Build price change notifications
- Create product comparison dashboard
- Export to database (PostgreSQL, MongoDB, etc.)
- Implement search indexing (Elasticsearch, Algolia)
