// Simple script to check if deals have proper location data
import fetch from 'node-fetch';

async function checkDealLocations() {
  try {
    console.log("Fetching deals...");
    const response = await fetch('http://localhost:5000/api/deals');
    const data = await response.json();
    
    // Log the structure type
    console.log("Response data structure type:", Array.isArray(data) ? "Array" : typeof data);
    
    // Convert to array format if needed
    const deals = Array.isArray(data) ? data : Object.values(data);
    
    console.log(`Found ${deals.length} deals`);
    
    let dealsWithLocation = 0;
    let dealsWithoutLocation = 0;
    
    deals.forEach((deal: any, index: number) => {
      const { business } = deal;
      if (business && business.latitude && business.longitude) {
        dealsWithLocation++;
        console.log(`Deal #${index + 1}: "${deal.title}" has location data (${business.latitude}, ${business.longitude})`);
      } else {
        dealsWithoutLocation++;
        console.log(`Deal #${index + 1}: "${deal.title}" is MISSING location data`);
      }
    });
    
    console.log("\nSummary:");
    console.log(`Deals with location data: ${dealsWithLocation}`);
    console.log(`Deals without location data: ${dealsWithoutLocation}`);
    
    if (dealsWithoutLocation > 0) {
      console.log("\nPossible issue: Some deals don't have location data (latitude/longitude), which is required for them to appear on the map.");
    }
    
  } catch (error) {
    console.error("Error checking deal locations:", error);
  }
}

checkDealLocations();