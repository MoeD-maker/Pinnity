import { db } from './server/db';
import { users, businesses } from './shared/schema';
import bcrypt from 'bcryptjs';

// Hash passwords for storage
function hashPassword(password: string): string {
  const salt = bcrypt.genSaltSync(10);
  return bcrypt.hashSync(password, salt);
}

async function createTestAccounts() {
  console.log("Creating test accounts...");
  
  try {
    // 1. Create customer account for Ziad
    const [ziadCustomer] = await db.insert(users)
      .values({
        username: "ziad_customer",
        email: "ziad@customer.com",
        password: hashPassword("Ziad123!"),
        firstName: "Ziad",
        lastName: "Customer",
        phone: "555-333-4444",
        address: "100 Customer St, Anytown, USA",
        userType: "individual"
      })
      .returning();
    
    console.log("Customer account created:", ziadCustomer.email);
    
    // 2. Create vendor account for Ziad
    // First create the user
    const [ziadVendor] = await db.insert(users)
      .values({
        username: "ziad_vendor",
        email: "ziad@vendor.com",
        password: hashPassword("Ziad123!"),
        firstName: "Ziad",
        lastName: "Vendor",
        phone: "555-555-6666",
        address: "200 Business Ave, Anytown, USA",
        userType: "business"
      })
      .returning();
    
    // Then create the business
    const [ziadBusiness] = await db.insert(businesses)
      .values({
        userId: ziadVendor.id,
        businessName: "Ziad's Shop",
        businessCategory: "retail",
        description: "Ziad's test vendor business",
        address: "200 Business Ave, Anytown, USA",
        latitude: 37.7851,
        longitude: -122.4087,
        phone: "555-555-6666",
        website: "www.ziadsshop.com",
        imageUrl: "https://images.unsplash.com/photo-1542744173-8e7e53415bb0?ixlib=rb-1.2.1&auto=format&fit=crop&w=1000&q=80",
        governmentId: "placeholder",
        proofOfAddress: "placeholder",
        proofOfBusiness: "placeholder",
        verificationStatus: "verified"
      })
      .returning();
    
    console.log("Vendor account created:", ziadVendor.email);
    console.log("Business created:", ziadBusiness.businessName);
    
    console.log("Test accounts created successfully!");
  } catch (error) {
    console.error("Error creating test accounts:", error);
  } finally {
    process.exit();
  }
}

createTestAccounts();