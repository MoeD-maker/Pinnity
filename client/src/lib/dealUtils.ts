import { apiRequest } from './api';

/**
 * Check if a user has redeemed a deal and can redeem it again
 */
export async function checkDealRedemptionStatus(userId: number, dealId: number) {
  try {
    console.log(`Checking redemption status for user ${userId} and deal ${dealId}`);
    
    // Use our new endpoint to check redemption status
    const response = await apiRequest(`/api/v1/user/${userId}/redemptions/${dealId}`, {
      method: 'GET'
    });
    
    console.log('Redemption status response:', response);
    
    // Define the expected response type
    interface RedemptionStatusResponse {
      hasRedeemed: boolean;
      remainingRedemptions: number | null;
      totalRedemptions: number;
    }
    
    // Type assertion to prevent unknown type errors
    const typedResponse = response as RedemptionStatusResponse;
    
    // Determine if user can redeem based on the max redemptions per user (if any)
    const deal = await apiRequest(`/api/v1/deals/${dealId}`, {
      method: 'GET'
    });
    
    console.log('Deal details for redemption check:', deal);
    
    const maxRedemptionsPerUser = deal?.maxRedemptionsPerUser || null;
    const totalRedemptionsLimit = deal?.totalRedemptionsLimit || null;
    const redemptionCount = deal?.redemptionCount || 0;
    
    const canRedeem = !typedResponse.hasRedeemed || 
      (maxRedemptionsPerUser !== null && 
       typedResponse.totalRedemptions < maxRedemptionsPerUser);
    
    const totalLimitReached = totalRedemptionsLimit !== null && 
      redemptionCount >= totalRedemptionsLimit;
    
    // Force refresh the hasRedeemed status to ensure UI updates properly
    const updatedStatus = {
      hasRedeemed: typedResponse.hasRedeemed,
      redemptionCount: typedResponse.totalRedemptions || 0,
      maxRedemptionsPerUser,
      canRedeem: canRedeem && !totalLimitReached && !isExpired(deal),
      totalLimitReached,
      success: true
    };
    
    console.log('Returning updated redemption status:', updatedStatus);
    return updatedStatus;
  } catch (error) {
    console.error('Error checking redemption status:', error);
    return {
      hasRedeemed: false,
      redemptionCount: 0,
      maxRedemptionsPerUser: null,
      canRedeem: true,
      totalLimitReached: false,
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