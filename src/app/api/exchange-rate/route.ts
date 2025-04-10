import { NextResponse } from 'next/server';

// Helper function to extract the exchange rate from Gemini's response
function extractExchangeRate(text: string): number | null {
  // Look for patterns like "1 US Dollar (USD) is approximately 511.85 Costa Rican Colónes (CRC)"
  const ratePattern = /(\d+\.?\d*)\s*Costa\s*Rican\s*Col[oó]n[eé]s/i;
  const match = text.match(ratePattern);
  
  if (match && match[1]) {
    return parseFloat(match[1]);
  }
  
  // Fallback pattern to try
  const fallbackPattern = /USD\s*[=:]\s*(\d+\.?\d*)\s*CRC/i;
  const fallbackMatch = text.match(fallbackPattern);
  
  if (fallbackMatch && fallbackMatch[1]) {
    return parseFloat(fallbackMatch[1]);
  }
  
  return null;
}

export async function GET() {
  try {
    // Get API key from environment variable
    const apiKey = process.env.GEMINI_API_KEY;
    
    if (!apiKey) {
      console.error('GEMINI_API_KEY environment variable not set');
      return NextResponse.json(
        { error: 'API key not configured' },
        { status: 500 }
      );
    }
    
    // Request body for Gemini API
    const requestBody = {
      contents: [
        {
          role: 'user',
          parts: [{ text: 'Get the currency exchange rate for Colones to USD' }]
        }
      ],
      generationConfig: {
        temperature: 0.1,
        topP: 0.8,
        maxOutputTokens: 1000
      }
    };
    
    // Call Gemini API
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      }
    );
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gemini API error:', errorText);
      return NextResponse.json(
        { error: 'Failed to fetch exchange rate from Gemini' },
        { status: 502 }
      );
    }
    
    const data = await response.json();
    
    // Extract the text from Gemini's response
    if (data.candidates && data.candidates.length > 0) {
      const text = data.candidates[0].content.parts[0].text;
      
      // Extract the exchange rate from the text
      const rate = extractExchangeRate(text);
      
      if (rate) {
        // Cache the response for 24 hours
        return NextResponse.json(
          { rate, source: 'Gemini API', timestamp: new Date().toISOString() },
          {
            status: 200,
            headers: {
              'Cache-Control': 'public, max-age=86400'
            }
          }
        );
      } else {
        console.error('Failed to extract exchange rate from Gemini response:', text);
        return NextResponse.json(
          { error: 'Could not extract exchange rate from AI response', fallbackRate: 511.85 },
          { status: 200 }
        );
      }
    } else {
      console.error('Unexpected Gemini API response structure:', data);
      return NextResponse.json(
        { error: 'Invalid response from Gemini API', fallbackRate: 511.85 },
        { status: 200 }
      );
    }
  } catch (error) {
    console.error('Error fetching exchange rate:', error);
    return NextResponse.json(
      { error: 'Internal server error', fallbackRate: 511.85 },
      { status: 500 }
    );
  }
} 