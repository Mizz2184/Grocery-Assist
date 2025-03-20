import express from 'express';
import cors from 'cors';
import axios from 'axios';

const app = express();

app.use(cors());
app.use(express.json());

app.post('/api/proxy/maxipali/search', async (req, res) => {
  try {
    const { query, page, pageSize } = req.body;
    console.log('Received search request:', { query, page, pageSize });

    // Search products directly without session token
    const searchResponse = await axios.get(`https://www.maxipali.co.cr/api/catalog_system/pub/products/search/${encodeURIComponent(query)}`, {
      params: {
        _from: (page - 1) * pageSize,
        _to: (page * pageSize) - 1
      },
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
        'Origin': 'https://www.maxipali.co.cr',
        'Referer': 'https://www.maxipali.co.cr/',
      },
      timeout: 30000 // 30 second timeout
    });

    // Transform response to match our format
    const transformedData = {
      products: (searchResponse.data || []).map(p => ({
        id: p.productId,
        name: p.productName,
        brand: p.brand,
        price: p.items[0]?.sellers[0]?.commertialOffer?.Price || 0,
        imageUrl: p.items[0]?.images[0]?.imageUrl || '',
        store: 'MaxiPali'
      })),
      total: searchResponse.data?.length || 0,
      page,
      pageSize
    };

    console.log(`Found ${transformedData.products.length} products`);
    res.json(transformedData);
  } catch (error) {
    console.error('Search error:', {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status,
      stack: error.stack
    });
    
    res.status(500).json({ 
      error: 'Failed to fetch products',
      details: error.message,
      status: error.response?.status || 500,
      serverMessage: error.response?.data?.message || 'Unknown error'
    });
  }
});

app.get('/api/proxy/maxipali/barcode/:barcode', async (req, res) => {
  try {
    const { barcode } = req.params;
    console.log('Received barcode lookup request:', barcode);

    // Get session token first
    const sessionResponse = await axios.get('https://www.maxipali.co.cr/api/vtexid/pub/authentication/start', {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
        'Origin': 'https://www.maxipali.co.cr',
        'Referer': 'https://www.maxipali.co.cr/',
      }
    });

    console.log('Session response:', sessionResponse.data);

    // Try direct product search first
    try {
      const directSearchResponse = await axios.get(`https://www.maxipali.co.cr/api/catalog_system/pub/products/search`, {
        params: {
          'ft': barcode
        },
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
          'Origin': 'https://www.maxipali.co.cr',
          'Referer': 'https://www.maxipali.co.cr/',
        }
      });

      if (directSearchResponse.data.length > 0) {
        const product = directSearchResponse.data[0];
        return res.json({
          id: product.productId,
          name: product.productName,
          brand: product.brand,
          price: product.items[0]?.sellers[0]?.commertialOffer?.Price || 0,
          imageUrl: product.items[0]?.images[0]?.imageUrl || '',
          store: 'MaxiPali',
          ean: barcode
        });
      }
    } catch (directSearchError) {
      console.error('Direct search failed:', directSearchError.message);
    }

    // If direct search fails, try alternative search
    const altSearchResponse = await axios.get(`https://www.maxipali.co.cr/api/io/_v/api/intelligent-search/product_search/productSearch`, {
      params: {
        term: barcode,
        count: 1,
        page: 0
      },
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
        'Origin': 'https://www.maxipali.co.cr',
        'Referer': 'https://www.maxipali.co.cr/',
      }
    });

    if (!altSearchResponse.data?.products?.length) {
      return res.status(404).json({
        error: 'Product not found',
        details: `No product found with barcode: ${barcode}`
      });
    }

    const product = altSearchResponse.data.products[0];
    const transformedData = {
      id: product.productId,
      name: product.productName,
      brand: product.brand,
      price: product.price,
      imageUrl: product.items[0]?.images[0]?.imageUrl || '',
      store: 'MaxiPali',
      ean: barcode
    };

    res.json(transformedData);
  } catch (error) {
    console.error('Barcode lookup error:', {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status,
      stack: error.stack
    });
    
    res.status(500).json({ 
      error: 'Failed to lookup product',
      details: error.message,
      status: error.response?.status
    });
  }
});

const startServer = async (startPort = 3001) => {
  let currentPort = startPort;
  
  while (currentPort < startPort + 10) {
    try {
      await new Promise((resolve, reject) => {
        const server = app.listen(currentPort, () => {
          console.log(`Server running on port ${currentPort}`);
          resolve();
        }).on('error', (err) => {
          if (err.code === 'EADDRINUSE') {
            console.log(`Port ${currentPort} is busy, trying ${currentPort + 1}...`);
            currentPort++;
            reject(err);
          } else {
            reject(err);
          }
        });
      });
      break; // Successfully started server
    } catch (err) {
      if (currentPort === startPort + 9) {
        console.error('Could not find an available port');
        process.exit(1);
      }
      // Continue to next port
    }
  }
};

startServer();