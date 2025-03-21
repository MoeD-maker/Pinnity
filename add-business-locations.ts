import { db } from './server/db';
import { businesses } from './shared/schema';
import { eq } from 'drizzle-orm';

// Sample coordinates for different locations (for mapping purposes)
const SAMPLE_LOCATIONS = [
  { lat: 37.7749, lng: -122.4194 }, // San Francisco
  { lat: 37.7831, lng: -122.4039 }, // San Francisco - Downtown
  { lat: 37.8044, lng: -122.2711 }, // Oakland
  { lat: 37.7652, lng: -122.2416 }, // Alameda
  { lat: 37.8716, lng: -122.2727 }, // Berkeley
  { lat: 37.5485, lng: -121.9886 }, // Fremont
  { lat: 37.3382, lng: -121.8863 }, // San Jose
  { lat: 37.4852, lng: -122.2364 }, // Redwood City
  { lat: 37.6879, lng: -122.4702 }, // Pacifica
  { lat: 37.9735, lng: -122.5311 }, // San Rafael
];

async function addBusinessLocations() {
  console.log("Updating businesses with location data...");
  
  try {
    // Get all businesses
    const allBusinesses = await db.select().from(businesses);
    console.log(`Found ${allBusinesses.length} businesses`);
    
    let updatedCount = 0;
    
    // Update each business that doesn't have location data
    for (const business of allBusinesses) {
      if (!business.latitude || !business.longitude) {
        // Pick a random location from our sample data
        const randomIndex = Math.floor(Math.random() * SAMPLE_LOCATIONS.length);
        const location = SAMPLE_LOCATIONS[randomIndex];
        
        // Add small random offset to prevent all businesses from being at exact same point
        const latOffset = (Math.random() - 0.5) * 0.01;  // ±0.005 degrees (roughly 500m)
        const lngOffset = (Math.random() - 0.5) * 0.01;  // ±0.005 degrees
        
        // Update the business with location data
        await db.update(businesses)
          .set({
            latitude: location.lat + latOffset,
            longitude: location.lng + lngOffset
          })
          .where(eq(businesses.id, business.id));
        
        console.log(`Updated business: ${business.businessName}`);
        updatedCount++;
      }
    }
    
    console.log(`Updated ${updatedCount} businesses with location data`);
    console.log("Location data update complete!");
    
  } catch (error) {
    console.error("Error updating business locations:", error);
  } finally {
    process.exit();
  }
}

addBusinessLocations();