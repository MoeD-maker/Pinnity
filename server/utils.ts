/**
 * Server utility functions
 */

/**
 * Ensures that a value is returned as an array. Useful for API responses that need to be consistent.
 * If the value is already an array, it's returned as is.
 * If the value is an object but not an array, it's converted to an array.
 * If the value is null or undefined, an empty array is returned.
 */
export function ensureArray<T>(value: any): T[] {
  // If it's already an array, return it
  if (Array.isArray(value)) {
    return value;
  }
  
  // If it's null or undefined, return an empty array
  if (value === null || value === undefined) {
    return [];
  }
  
  // If it's an object with numbered keys (like {0: {...}, 1: {...}}), convert to array
  if (typeof value === 'object') {
    try {
      // Check if it's shaped like an object with numeric keys (common API format issue)
      const keys = Object.keys(value);
      const isNumericKeysObject = keys.length > 0 && keys.every(key => !isNaN(Number(key)));
      
      if (isNumericKeysObject) {
        // First attempt: Convert using ordered keys
        try {
          const orderedKeys = keys.sort((a, b) => parseInt(a) - parseInt(b));
          return orderedKeys.map(key => value[key]);
        } catch (err) {
          console.error('Error in first array conversion attempt:', err);
          
          // Second attempt: Use Object.values
          try {
            return Object.values(value);
          } catch (err2) {
            console.error('Error in second array conversion attempt:', err2);
            
            // Third attempt: Force conversion using JSON
            try {
              // Create a proper array JSON and parse it back
              const jsonStr = JSON.stringify(value);
              const jsonObj = JSON.parse(jsonStr);
              if (typeof jsonObj === 'object' && !Array.isArray(jsonObj)) {
                return Object.values(jsonObj);
              }
              return [value as T];
            } catch (err3) {
              console.error('All conversion attempts failed:', err3);
              return [value as T];
            }
          }
        }
      }
      
      // If it's a special API wrapper format
      if (value._isArray === true && Array.isArray(value.data)) {
        console.log('Found special _isArray format, returning data array');
        return value.data;
      }
      
      // It's an object but not numeric keyed, wrap it in an array
      return [value];
    } catch (error) {
      console.error('Error in ensureArray:', error);
      return [value as T];
    }
  }
  
  // For primitive values, wrap in an array
  return [value as T];
}

/**
 * Sanitizes a deal object to be safe for frontend consumption
 * Removes sensitive fields and ensures all required fields exist
 */
export function sanitizeDeal(deal: any): any {
  if (!deal) return null;
  
  // Create a new object with only the fields we want to send to frontend
  return {
    id: deal.id,
    title: deal.title,
    description: deal.description,
    businessId: deal.businessId,
    category: deal.category,
    imageUrl: deal.imageUrl,
    startDate: deal.startDate,
    endDate: deal.endDate,
    terms: deal.terms,
    status: deal.status,
    dealType: deal.dealType,
    discount: deal.discount,
    createdAt: deal.createdAt,
    updatedAt: deal.updatedAt,
    featured: deal.featured || false,
    approvalDate: deal.approvalDate,
    maxRedemptionsPerUser: deal.maxRedemptionsPerUser,
    totalRedemptionsLimit: deal.totalRedemptionsLimit,
    viewCount: deal.viewCount || 0,
    saveCount: deal.saveCount || 0,
    redemptionCount: deal.redemptionCount || 0,
    isRecurring: deal.isRecurring || false,
    recurringDays: deal.recurringDays || [],
    business: deal.business ? {
      id: deal.business.id,
      businessName: deal.business.businessName,
      businessCategory: deal.business.businessCategory,
      logoUrl: deal.business.logoUrl || deal.business.imageUrl,
      address: deal.business.address,
      verificationStatus: deal.business.verificationStatus || 'pending',
    } : null
  };
}

/**
 * Batch sanitize an array of deal objects
 */
export function sanitizeDeals(deals: any[]): any[] {
  return deals.map(deal => sanitizeDeal(deal));
}