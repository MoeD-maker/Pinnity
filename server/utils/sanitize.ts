import { Deal, Business, User } from "@shared/schema";

/**
 * Sanitizes deal objects to ensure consistent structure and handle undefined values
 */
export function sanitizeDeal(deal: any): any {
  if (!deal) return null;
  
  // Extract base business data if available
  const business = deal.business || {};
  
  // Production mode: Only return deals with complete business data
  if (!business.businessName || business.businessName.trim() === '') {
    return null; // Exclude deals without proper business data
  }
  
  // Create business info with fallbacks for undefined values
  const businessInfo = {
    id: business.id || 0,
    businessName: business.businessName,
    verificationStatus: business.verificationStatus || "pending",
    imageUrl: business.imageUrl || null,
    logoUrl: business.imageUrl || null, // For backward compatibility
  };

  // Return a clean deal object with fallbacks for missing properties
  return {
    id: deal.id || 0,
    title: deal.title || "Untitled Deal",
    description: deal.description || "",
    status: deal.status || "pending",
    category: deal.category || "Uncategorized",
    imageUrl: deal.imageUrl || null,
    startDate: deal.startDate || new Date().toISOString(),
    endDate: deal.endDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    terms: deal.terms || "",
    discount: deal.discount || "",
    dealType: deal.dealType || "other",
    featured: !!deal.featured,
    redemptionCode: deal.redemptionCode || "",
    createdAt: deal.createdAt || new Date().toISOString(),
    viewCount: deal.viewCount || 0,
    saveCount: deal.saveCount || 0,
    redemptionCount: deal.redemptionCount || 0,
    business: businessInfo,
  };
}

/**
 * Sanitizes multiple deal objects
 */
export function sanitizeDeals(deals: any[]): any[] {
  if (!Array.isArray(deals)) {
    console.error("sanitizeDeals received non-array:", deals);
    return [];
  }
  
  return deals.map(deal => sanitizeDeal(deal)).filter(deal => deal !== null);
}

/**
 * Sanitizes business objects to ensure consistent structure and handle undefined values
 */
export function sanitizeBusiness(business: any): any {
  if (!business) return null;
  
  // Extract user data if available
  const user = business.user || {};

  // Create user info with fallbacks for undefined values
  const userInfo = {
    id: user.id || 0,
    firstName: user.firstName || "",
    lastName: user.lastName || "",
    email: user.email || "",
    userType: user.userType || "business",
  };

  // Return a clean business object with fallbacks for missing properties
  return {
    id: business.id || 0,
    userId: business.userId || 0,
    businessName: business.businessName || "Untitled Business",
    businessCategory: business.businessCategory || "other",
    verificationStatus: business.verificationStatus || "pending",
    description: business.description || "",
    address: business.address || "",
    latitude: business.latitude || 0,
    longitude: business.longitude || 0,
    phone: business.phone || "",
    website: business.website || "",
    imageUrl: business.imageUrl || null,
    logoUrl: business.imageUrl || null, // For backward compatibility
    user: userInfo,
  };
}

/**
 * Sanitizes multiple business objects
 */
export function sanitizeBusinesses(businesses: any[]): any[] {
  if (!Array.isArray(businesses)) {
    console.error("sanitizeBusinesses received non-array:", businesses);
    return [];
  }
  
  return businesses.map(business => sanitizeBusiness(business));
}

/**
 * Convert object with numeric keys to array
 * Fixes issue where APIs return objects like {0: item1, 1: item2} instead of arrays
 */
export function ensureArray<T>(data: any): T[] {
  if (Array.isArray(data)) {
    return data;
  }
  
  if (typeof data === 'object' && data !== null) {
    // Check if this is an object with numeric keys (like {0: item1, 1: item2})
    const numericKeys = Object.keys(data).every(key => !isNaN(Number(key)));
    if (numericKeys) {
      return Object.values(data);
    }
  }
  
  console.error("ensureArray received invalid data:", data);
  return [];
}

/**
 * Force convert a deal object to a proper array
 * This is specifically designed to handle the deal format issues in the admin dashboard
 */
export function forceDealArray(deals: any): any[] {
  console.log('Force converting deal object to array...');
  
  // If already array, return it
  if (Array.isArray(deals)) {
    console.log(`Already an array with ${deals.length} items`);
    return deals;
  }
  
  // If null or undefined, return empty array
  if (deals === null || deals === undefined) {
    console.log('Null or undefined value, returning empty array');
    return [];
  }
  
  // If it's an object with numeric keys, convert to array
  if (typeof deals === 'object') {
    console.log('Converting object to array...');
    
    try {
      // Try JSON method first (most reliable)
      const jsonString = JSON.stringify(deals);
      const parsed = JSON.parse(jsonString);
      
      if (Array.isArray(parsed)) {
        console.log(`Successfully converted to array via JSON with ${parsed.length} items`);
        return parsed;
      }
      
      // Try Object.values
      const valueArray = Object.values(deals);
      console.log(`Converted to array via Object.values with ${valueArray.length} items`);
      return valueArray;
    } catch (error) {
      console.error('Error during forced conversion:', error);
      
      // Fall back to manual extraction
      const keys = Object.keys(deals);
      const result = [];
      
      for (const key of keys) {
        if (!isNaN(Number(key))) {
          result.push(deals[key]);
        }
      }
      
      console.log(`Manually extracted ${result.length} items from object`);
      return result;
    }
  }
  
  // Unknown type, return as single-element array
  console.log('Unknown type, wrapping in array');
  return [deals];
}