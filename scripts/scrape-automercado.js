/**
 * Automercado Product Scraper
 * 
 * This script scrapes all products from Automercado using the bulk scrape endpoint.
 * It handles pagination automatically and saves all products to a JSON file.
 * 
 * Usage:
 *   node scripts/scrape-automercado.js
 * 
 * Options:
 *   --output <file>     Output file path (default: automercado-products.json)
 *   --hits-per-page <n> Number of products per page (default: 1000, max: 1000)
 *   --max-pages <n>     Maximum number of pages to scrape (default: all)
 */

const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');

// Configuration
const API_BASE_URL = 'http://localhost:8080';
const DEFAULT_OUTPUT_FILE = 'automercado-products.json';
const DEFAULT_HITS_PER_PAGE = 1000;

// Parse command line arguments
const args = process.argv.slice(2);
const getArg = (flag, defaultValue) => {
  const index = args.indexOf(flag);
  return index !== -1 && args[index + 1] ? args[index + 1] : defaultValue;
};

const outputFile = getArg('--output', DEFAULT_OUTPUT_FILE);
const hitsPerPage = parseInt(getArg('--hits-per-page', DEFAULT_HITS_PER_PAGE));
const maxPages = parseInt(getArg('--max-pages', '0')) || Infinity;

/**
 * Fetch a single page of products
 */
async function fetchPage(page, hitsPerPage) {
  try {
    console.log(`Fetching page ${page}...`);
    const response = await axios.get(`${API_BASE_URL}/api/proxy/automercado/scrape-all`, {
      params: {
        page,
        hitsPerPage
      },
      timeout: 60000 // 60 second timeout
    });

    return response.data;
  } catch (error) {
    console.error(`Error fetching page ${page}:`, error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
    throw error;
  }
}

/**
 * Scrape all products with pagination
 */
async function scrapeAllProducts() {
  console.log('🚀 Starting Automercado product scrape...\n');
  console.log(`Configuration:`);
  console.log(`  - Output file: ${outputFile}`);
  console.log(`  - Hits per page: ${hitsPerPage}`);
  console.log(`  - Max pages: ${maxPages === Infinity ? 'all' : maxPages}\n`);

  const allProducts = [];
  let currentPage = 0;
  let hasMore = true;
  let totalHits = 0;
  let totalPages = 0;

  const startTime = Date.now();

  try {
    while (hasMore && currentPage < maxPages) {
      const data = await fetchPage(currentPage, hitsPerPage);
      
      // Update totals from first page
      if (currentPage === 0) {
        totalHits = data.pagination.totalHits;
        totalPages = data.pagination.totalPages;
        console.log(`\n📊 Total products available: ${totalHits.toLocaleString()}`);
        console.log(`📄 Total pages: ${totalPages}\n`);
      }

      // Add products to collection
      allProducts.push(...data.hits);
      
      // Progress update
      const progress = ((currentPage + 1) / Math.min(totalPages, maxPages) * 100).toFixed(1);
      console.log(`✓ Page ${currentPage + 1}/${Math.min(totalPages, maxPages)} - ${data.hits.length} products (${allProducts.length.toLocaleString()} total) - ${progress}%`);

      // Check if there are more pages
      hasMore = data.pagination.hasMore;
      currentPage++;

      // Small delay to avoid overwhelming the API
      if (hasMore && currentPage < maxPages) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);

    console.log(`\n✅ Scraping complete!`);
    console.log(`   - Total products scraped: ${allProducts.length.toLocaleString()}`);
    console.log(`   - Pages fetched: ${currentPage}`);
    console.log(`   - Duration: ${duration}s`);
    console.log(`   - Average: ${(allProducts.length / duration).toFixed(0)} products/second\n`);

    // Save to file
    console.log(`💾 Saving to ${outputFile}...`);
    
    const outputData = {
      metadata: {
        scrapedAt: new Date().toISOString(),
        totalProducts: allProducts.length,
        pagesFetched: currentPage,
        hitsPerPage: hitsPerPage,
        durationSeconds: parseFloat(duration)
      },
      products: allProducts
    };

    await fs.writeFile(
      path.resolve(outputFile),
      JSON.stringify(outputData, null, 2),
      'utf8'
    );

    console.log(`✅ Successfully saved ${allProducts.length.toLocaleString()} products to ${outputFile}`);

    // Print some statistics
    printStatistics(allProducts);

  } catch (error) {
    console.error('\n❌ Error during scraping:', error.message);
    
    // Save partial results if any products were collected
    if (allProducts.length > 0) {
      const partialFile = outputFile.replace('.json', '-partial.json');
      console.log(`\n💾 Saving ${allProducts.length} partial results to ${partialFile}...`);
      
      const partialData = {
        metadata: {
          scrapedAt: new Date().toISOString(),
          totalProducts: allProducts.length,
          pagesFetched: currentPage,
          status: 'partial',
          error: error.message
        },
        products: allProducts
      };

      await fs.writeFile(
        path.resolve(partialFile),
        JSON.stringify(partialData, null, 2),
        'utf8'
      );
      console.log(`✅ Partial results saved to ${partialFile}`);
    }
    
    process.exit(1);
  }
}

/**
 * Print statistics about the scraped products
 */
function printStatistics(products) {
  console.log(`\n📈 Statistics:`);
  
  // Count by category
  const categories = {};
  products.forEach(p => {
    const cat = p.categoryPageId || 'unknown';
    categories[cat] = (categories[cat] || 0) + 1;
  });
  
  console.log(`\n   Categories:`);
  Object.entries(categories)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .forEach(([cat, count]) => {
      console.log(`     - ${cat}: ${count.toLocaleString()}`);
    });

  // Price statistics (store 06)
  const prices = products
    .map(p => parseFloat(p.storeDetail?.['06']?.basePrice))
    .filter(p => !isNaN(p) && p > 0);
  
  if (prices.length > 0) {
    prices.sort((a, b) => a - b);
    const avg = prices.reduce((a, b) => a + b, 0) / prices.length;
    const median = prices[Math.floor(prices.length / 2)];
    
    console.log(`\n   Prices (₡):`);
    console.log(`     - Products with price: ${prices.length.toLocaleString()}`);
    console.log(`     - Min: ₡${prices[0].toLocaleString()}`);
    console.log(`     - Max: ₡${prices[prices.length - 1].toLocaleString()}`);
    console.log(`     - Average: ₡${avg.toFixed(2).toLocaleString()}`);
    console.log(`     - Median: ₡${median.toLocaleString()}`);
  }
}

// Run the scraper
scrapeAllProducts().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
