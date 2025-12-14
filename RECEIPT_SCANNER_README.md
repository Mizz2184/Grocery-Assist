# AI Receipt Scanner Feature

## Overview

The AI Receipt Scanner feature allows users to upload photos of grocery store receipts and automatically extract products with their barcodes. The system uses Google Gemini AI to analyze receipt images and match products to your database using barcode lookup.

## Features

- 📸 **Upload Receipt Images** - Take photos or upload existing receipt images
- 🤖 **AI-Powered Extraction** - Uses Google Gemini Vision to extract product names, barcodes, quantities, and prices
- 🔍 **Barcode Matching** - Matches extracted barcodes to products in your database
- ✅ **Smart Selection** - Auto-selects matched products for quick adding
- 📊 **Match Confidence** - Shows which products were successfully matched
- 🛒 **Bulk Add** - Add multiple products to your grocery list at once

## How It Works

1. **User uploads receipt** - Click "Scan Receipt" button on the Grocery List page
2. **AI analyzes image** - Google Gemini extracts:
   - Product names
   - 13-digit barcodes
   - Quantities
   - Prices (optional)
   - Store name (optional)
3. **Store API search** - System searches grocery store APIs by barcode:
   - **MaxiPali** - Direct catalog search + general search
   - **Walmart** - Barcode lookup API
   - **MasxMenos** - VTEX catalog search
   - Falls back through multiple API endpoints for best results
4. **Review & select** - User reviews matched products and selects which to add
5. **Add to list** - Selected products are added to the active grocery list with current prices from stores

## Setup Instructions

### 1. Get Google Gemini API Key

1. Visit [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Sign in with your Google account
3. Click "Create API Key"
4. Copy the generated API key

### 2. Add API Key to Environment

The API key should already be in your `.env` file:

```env
VITE_GEMINI_API_KEY=your_api_key_here
```

### 3. Store API Configuration

The receipt scanner automatically searches multiple grocery store APIs:

- **MaxiPali API** - Already configured in `server.js`
- **Walmart API** - Already configured in `server.js`
- **MasxMenos API** - Already configured in `server.js`
- **Automercado API** - Already configured in `server.js`

No additional configuration needed! The system will search all stores automatically.

## Usage

### From Grocery List Page

1. Navigate to the Grocery List page
2. Select or create a grocery list
3. Click the **"Scan Receipt"** button (camera icon)
4. Upload a receipt image:
   - Click to upload from device
   - Or use camera to take photo (mobile)
5. Wait for AI to scan (5-10 seconds)
6. Review matched products:
   - ✅ Green = Product found in database
   - ❌ Red = No match found
7. Select/deselect products to add
8. Click "Add X Products" button
9. Products are added to your list!

## Receipt Format Requirements

For best results, receipts should:

- ✅ Have clear, readable text
- ✅ Show product names and barcodes
- ✅ Be well-lit (no shadows)
- ✅ Be in focus (not blurry)
- ✅ Include 13-digit barcodes (starting with 7)
- ✅ Be under 10MB in size

### Supported Receipt Types

- Walmart receipts
- MaxiPali receipts
- MasxMenos receipts
- PriceSmart receipts
- Automercado receipts
- Most Costa Rican grocery store receipts

## Technical Details

### Files Created

1. **`src/lib/services/receiptScanService.ts`**
   - AI receipt scanning logic
   - Barcode extraction
   - Product matching by barcode

2. **`src/components/ReceiptScanner.tsx`**
   - Receipt upload UI
   - Image preview
   - Product review interface
   - Bulk add functionality

3. **`src/lib/types/store.ts`** (modified)
   - Added `barcode?: string` to Product interface

4. **`src/pages/GroceryList.tsx`** (modified)
   - Integrated ReceiptScanner component

### API Usage

The feature uses Google Gemini 1.5 Flash model:
- Model: `gemini-1.5-flash`
- Cost: ~$0.00015 per image (very affordable)
- Speed: 5-10 seconds per receipt
- Accuracy: High for clear receipts

### Barcode Matching Logic

```typescript
// Searches grocery store APIs by barcode
const searchResult = await searchProductByBarcode(scannedProduct.barcode);

// The searchProductByBarcode function:
// 1. Tries MaxiPali catalog API
// 2. Falls back to MaxiPali search API
// 3. Tries MaxiPali proxy endpoint
// 4. Falls back to Walmart API
// 5. Returns first successful match with current store prices
```

## Troubleshooting

### "No Products Found"

**Cause**: AI couldn't detect products in the image

**Solutions**:
- Ensure receipt is clear and well-lit
- Try taking photo in better lighting
- Make sure barcodes are visible
- Upload a higher quality image

### "No Match Found in Store APIs"

**Cause**: Product barcode not found in any grocery store API

**Solutions**:
- The barcode might be incorrect or not in the store's system
- Try manually searching for the product by name
- Some products may have regional barcodes not recognized by stores
- Check if the barcode was extracted correctly from the receipt

### "Scan Failed"

**Cause**: API error or invalid image

**Solutions**:
- Check your `VITE_GEMINI_API_KEY` is valid
- Ensure image is under 10MB
- Try a different image format (JPG, PNG)
- Check browser console for errors

### API Key Issues

**Error**: "Failed to scan receipt"

**Solutions**:
1. Verify API key in `.env` file
2. Restart development server: `npm run dev`
3. Check API key is active in Google AI Studio
4. Ensure no extra spaces in `.env` file

## Best Practices

### For Users

- 📸 Take photos in good lighting
- 🔍 Ensure barcodes are visible
- 📏 Capture entire receipt
- 🗑️ Review before adding (uncheck unwanted items)

### For Developers

- 💾 Cache API responses to reduce costs
- 🔒 Never commit API keys to git
- 📊 Monitor API usage in Google Cloud Console
- ⚡ Consider batch processing for multiple receipts

## Future Enhancements

Potential improvements:

- [ ] OCR fallback for receipts without barcodes
- [ ] Receipt history/archive
- [ ] Multi-receipt upload
- [ ] Automatic store detection
- [ ] Price comparison with current database prices
- [ ] Receipt expense tracking
- [ ] Export receipts to PDF

## Cost Estimation

Google Gemini API costs (as of 2024):

- **Input**: $0.00015 per image
- **Output**: $0.0006 per 1K characters

**Example**: 
- 100 receipts/month = ~$0.015/month
- Very affordable for most users!

## Support

For issues or questions:

1. Check this README
2. Review browser console for errors
3. Verify API key is valid
4. Check database has barcode column
5. Ensure products have barcodes in database

## Security Notes

- ⚠️ API keys should never be committed to git
- ⚠️ Use environment variables for all secrets
- ⚠️ Receipt images are sent to Google's servers
- ⚠️ No receipt data is stored permanently (unless you implement it)

## License

Same as main project license.
