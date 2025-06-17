// Temporary file to fix storage types
import { Deal, Business } from "@shared/schema";

// Type-safe logoUrl mapping
export const mapBusinessWithLogo = (row: any): Deal & { business: Business & { logoUrl?: string } } => ({
  ...row.deals,
  business: {
    ...row.businesses,
    logoUrl: row.businesses.imageUrl || undefined
  }
});