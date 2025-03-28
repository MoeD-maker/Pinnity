import { apiRequest } from './api';

/**
 * Check if a user has redeemed a deal and can redeem it again
 */
export async function checkDealRedemptionStatus(userId: number, dealId: number) {
  try {
    const response = await apiRequest(`/api/v1/user/${userId}/redemptions/check/${dealId}`, {
      method: 'GET'
    });
    
    // Define the expected response type
    interface RedemptionStatusResponse {
      hasRedeemed: boolean;
      redemptionCount: number;
      maxRedemptionsPerUser: number | null;
      canRedeem: boolean;
    }
    
    // Type assertion to prevent unknown type errors
    const typedResponse = response as RedemptionStatusResponse;
    
    return {
      hasRedeemed: typedResponse.hasRedeemed,
      redemptionCount: typedResponse.redemptionCount,
      maxRedemptionsPerUser: typedResponse.maxRedemptionsPerUser,
      canRedeem: typedResponse.canRedeem,
      success: true
    };
  } catch (error) {
    console.error('Error checking redemption status:', error);
    return {
      hasRedeemed: false,
      redemptionCount: 0,
      maxRedemptionsPerUser: null,
      canRedeem: true,
      success: false,
      error
    };
  }
}

/**
 * Check if a deal is expired
 */
export function isExpired(deal: { endDate: string | Date }): boolean {
  if (!deal?.endDate) return false;
  
  const endDate = typeof deal.endDate === 'string' 
    ? new Date(deal.endDate) 
    : deal.endDate;
    
  return endDate < new Date();
}

/**
 * Format a deal's date range for display
 */
export function formatDealDateRange(startDate: string | Date, endDate: string | Date): string {
  const start = typeof startDate === 'string' ? new Date(startDate) : startDate;
  const end = typeof endDate === 'string' ? new Date(endDate) : endDate;
  
  const startFormatted = start.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric',
    year: 'numeric'
  });
  
  const endFormatted = end.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric',
    year: 'numeric'
  });
  
  return `${startFormatted} - ${endFormatted}`;
}

/**
 * Check if a deal is already saved in a user's favorites
 */
export function isDealInFavorites(dealId: number, favorites: Array<any>): boolean {
  if (!favorites || !Array.isArray(favorites)) return false;
  
  return favorites.some(fav => {
    // Handle two different data structures
    const favDealId = fav.dealId || (fav.deal && fav.deal.id);
    return favDealId === dealId;
  });
}

/**
 * Format a discount for display
 */
export function formatDiscount(deal: { discount: string, dealType: string }): string {
  if (!deal) return '';
  
  switch (deal.dealType) {
    case 'percent_off':
      return `${deal.discount} off`;
    case 'fixed_price':
      return deal.discount;
    case 'buy_one_get_one':
      return 'BOGO';
    default:
      return deal.discount;
  }
}