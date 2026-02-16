/**
 * OCR Service for Bill Recognition
 *
 * This service provides OCR functionality to extract bill information from images.
 * Currently supports local pattern matching. Can be extended with cloud OCR APIs.
 */

// Turkish bill patterns
const TURKISH_PATTERNS = {
  // Amount patterns (TL, ₺, TRY)
  amount: [
    /(?:toplam|tutar|ödenecek|borç|ödeme)\s*:?\s*(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{2})?)\s*(?:TL|₺|TRY)?/gi,
    /(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{2})?)\s*(?:TL|₺|TRY)/gi,
    /(?:TL|₺|TRY)\s*(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{2})?)/gi,
  ],
  // Due date patterns
  dueDate: [
    /(?:son\s*ödeme|vade|ödeme\s*tarihi)\s*:?\s*(\d{1,2}[\/\.\-]\d{1,2}[\/\.\-]\d{2,4})/gi,
    /(\d{1,2}[\/\.\-]\d{1,2}[\/\.\-]\d{2,4})\s*(?:son\s*ödeme|vade)/gi,
  ],
  // Bill type detection
  billType: {
    electricity: /elektrik|enerji|tedaş|enerjisa|bedaş|ayedaş/i,
    water: /su\s*fatura|iski|aski|muski|sular\s*idare/i,
    gas: /doğalgaz|igdaş|başkentgaz|esgaz|naturelgaz/i,
    internet: /internet|türk\s*telekom|superonline|turknet|vodafone|turkcell/i,
    phone: /telefon|gsm|hat\s*fatura|cep\s*telefon/i,
    rent: /kira|ev\s*kira|daire\s*kira/i,
    subscription: /netflix|spotify|youtube|amazon|disney|abonelik/i,
  },
};

// English bill patterns
const ENGLISH_PATTERNS = {
  amount: [
    /(?:total|amount|due|balance|pay)\s*:?\s*\$?\s*(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/gi,
    /\$\s*(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/gi,
  ],
  dueDate: [
    /(?:due\s*date|payment\s*due|pay\s*by)\s*:?\s*(\d{1,2}[\/\.\-]\d{1,2}[\/\.\-]\d{2,4})/gi,
    /(\d{1,2}[\/\.\-]\d{1,2}[\/\.\-]\d{2,4})\s*(?:due|payment)/gi,
  ],
  billType: {
    electricity: /electric|power|energy|utility/i,
    water: /water|sewer|drainage/i,
    gas: /gas|natural\s*gas|heating/i,
    internet: /internet|broadband|fiber|wifi/i,
    phone: /phone|mobile|cellular|telecom/i,
    rent: /rent|lease|housing/i,
    subscription: /netflix|spotify|youtube|amazon|disney|subscription/i,
  },
};

/**
 * Parse amount from text
 */
const parseAmount = (text, patterns) => {
  for (const pattern of patterns) {
    const match = pattern.exec(text);
    if (match && match[1]) {
      // Clean and convert to number
      let amount = match[1]
        .replace(/\./g, '') // Remove thousand separators (TR)
        .replace(/,/g, '.'); // Convert decimal comma to dot

      // Handle case where comma might be thousand separator (EN)
      if (amount.includes('.') && amount.split('.')[1].length === 3) {
        amount = amount.replace(/\./g, '');
      }

      const parsed = parseFloat(amount);
      if (!isNaN(parsed) && parsed > 0) {
        return parsed;
      }
    }
  }
  return null;
};

/**
 * Parse due date from text
 */
const parseDueDate = (text, patterns) => {
  for (const pattern of patterns) {
    const match = pattern.exec(text);
    if (match && match[1]) {
      const dateStr = match[1];
      // Try to parse the date
      const parts = dateStr.split(/[\/\.\-]/);
      if (parts.length === 3) {
        let day = parseInt(parts[0]);
        let month = parseInt(parts[1]);
        let year = parseInt(parts[2]);

        // Handle 2-digit year
        if (year < 100) {
          year += 2000;
        }

        // Validate
        if (day > 0 && day <= 31 && month > 0 && month <= 12 && year > 2000) {
          const date = new Date(year, month - 1, day);
          return date.toISOString().split('T')[0];
        }
      }
    }
  }
  return null;
};

/**
 * Detect bill type from text
 */
const detectBillType = (text, typePatterns) => {
  for (const [type, pattern] of Object.entries(typePatterns)) {
    if (pattern.test(text)) {
      return type;
    }
  }
  return 'other';
};

/**
 * Main OCR parsing function
 * Extracts bill information from OCR text
 */
export const parseBillFromText = (text, language = 'tr') => {
  const patterns = language === 'tr' ? TURKISH_PATTERNS : ENGLISH_PATTERNS;

  const result = {
    amount: parseAmount(text, patterns.amount),
    dueDate: parseDueDate(text, patterns.dueDate),
    type: detectBillType(text, patterns.billType),
    confidence: 0,
    rawText: text,
  };

  // Calculate confidence score
  let confidencePoints = 0;
  if (result.amount) confidencePoints += 40;
  if (result.dueDate) confidencePoints += 40;
  if (result.type !== 'other') confidencePoints += 20;
  result.confidence = confidencePoints;

  return result;
};

/**
 * Process image with OCR
 *
 * Currently returns a placeholder. To enable real OCR:
 * 1. Google Cloud Vision API
 * 2. Azure Computer Vision
 * 3. AWS Textract
 * 4. Tesseract.js (client-side, heavier)
 *
 * For production, implement one of these APIs.
 */
export const processImageWithOCR = async (imageUri, language = 'tr') => {
  // Placeholder implementation
  // In production, send image to OCR API and get text

  console.log('OCR processing image:', imageUri);

  // Simulated response - in real implementation this would call an OCR API
  return {
    success: false,
    message: 'OCR API not configured. Please enter bill details manually.',
    data: null,
  };

  /*
  // Example implementation with Google Cloud Vision:

  try {
    const base64Image = await FileSystem.readAsStringAsync(imageUri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    const response = await fetch(
      `https://vision.googleapis.com/v1/images:annotate?key=${GOOGLE_CLOUD_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requests: [{
            image: { content: base64Image },
            features: [{ type: 'TEXT_DETECTION' }],
          }],
        }),
      }
    );

    const result = await response.json();
    const text = result.responses[0]?.fullTextAnnotation?.text || '';

    return {
      success: true,
      message: 'OCR completed',
      data: parseBillFromText(text, language),
    };
  } catch (error) {
    console.error('OCR Error:', error);
    return {
      success: false,
      message: 'OCR failed: ' + error.message,
      data: null,
    };
  }
  */
};

/**
 * Manual text input parser
 * Use this when user types or pastes bill text
 */
export const parseManualInput = (text, language = 'tr') => {
  if (!text || text.trim().length === 0) {
    return {
      success: false,
      message: 'No text provided',
      data: null,
    };
  }

  const parsed = parseBillFromText(text, language);

  return {
    success: parsed.confidence > 0,
    message: parsed.confidence > 0
      ? `Found ${parsed.confidence}% of bill information`
      : 'Could not extract bill information',
    data: parsed,
  };
};

export default {
  parseBillFromText,
  processImageWithOCR,
  parseManualInput,
};
