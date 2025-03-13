import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from 'ws';
import bcrypt from 'bcryptjs';
import * as schema from './shared/schema';

// Required for Neon database (using WebSockets)
neonConfig.webSocketConstructor = ws;

// Check for DATABASE_URL environment variable
if (!process.env.DATABASE_URL) {
  console.error('ERROR: DATABASE_URL environment variable is not set');
  process.exit(1);
}

// Hash passwords for storage
function hashPassword(password: string): string {
  const salt = bcrypt.genSaltSync(10);
  return bcrypt.hashSync(password, salt);
}

async function main() {
  console.log('Connecting to database...');
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle(pool, { schema });

  console.log('Starting data seeding...');
  
  try {
    // Check if we already have data
    const existingUsers = await db.select().from(schema.users);
    
    if (existingUsers.length > 0) {
      console.log('Database already has data, skipping seed.');
      return;
    }
    
    await db.transaction(async (tx) => {
      console.log('Seeding users...');
      
      // 1. Customer test account
      const [customerUser] = await tx.insert(schema.users)
        .values({
          firstName: "Customer",
          lastName: "User",
          email: "customer@test.com",
          password: hashPassword("Customer123!"),
          username: "customer1",
          userType: "individual",
          phone: "555-123-4567",
          address: "100 User Ave, Anytown, USA"
        })
        .returning();
      
      // 2. Admin test account
      const [adminUser] = await tx.insert(schema.users)
        .values({
          firstName: "Admin",
          lastName: "User",
          email: "admin@test.com",
          password: hashPassword("Admin123!"),
          username: "admin2",
          userType: "admin",
          phone: "555-987-6543",
          address: "200 Admin Blvd, Anytown, USA"
        })
        .returning();
      
      // 3. Vendor test account
      const [vendorUser] = await tx.insert(schema.users)
        .values({
          firstName: "Vendor",
          lastName: "User",
          email: "vendor@test.com",
          password: hashPassword("Vendor123!"),
          username: "vendor3",
          userType: "business",
          phone: "555-456-7890",
          address: "300 Business St, Anytown, USA"
        })
        .returning();
      
      // Vendor's business
      const [vendorBusiness] = await tx.insert(schema.businesses)
        .values({
          userId: vendorUser.id,
          businessName: "Test Vendor Business",
          businessCategory: "retail",
          description: "A test vendor business for demonstration purposes",
          address: "300 Business St, Anytown, USA",
          latitude: 37.7841,
          longitude: -122.4077,
          phone: "555-456-7890",
          website: "www.testvendor.com",
          imageUrl: "https://images.unsplash.com/photo-1556740738-b6a63e27c4df?ixlib=rb-1.2.1&auto=format&fit=crop&w=1000&q=80",
          governmentId: "placeholder",
          proofOfAddress: "placeholder",
          proofOfBusiness: "placeholder",
          verificationStatus: "verified"
        })
        .returning();
      
      // More sample users
      const [johnUser] = await tx.insert(schema.users)
        .values({
          firstName: "John",
          lastName: "Doe",
          email: "john@example.com",
          password: hashPassword("Password123!"),
          username: "johndoe",
          userType: "individual",
          phone: "123-456-7890",
          address: "123 Main St, Anytown, USA"
        })
        .returning();
      
      // Coffee shop user
      const [cafeUser] = await tx.insert(schema.users)
        .values({
          firstName: "Cafe",
          lastName: "Owner",
          email: "cafe@example.com",
          password: hashPassword("Password123!"),
          username: "cafeowner",
          userType: "business",
          phone: "123-456-7891",
          address: "456 Oak St, Anytown, USA"
        })
        .returning();
      
      // Coffee shop business
      const [cafeBusiness] = await tx.insert(schema.businesses)
        .values({
          userId: cafeUser.id,
          businessName: "Morning Brew Café",
          businessCategory: "restaurant",
          description: "A cozy café serving fresh coffee and pastries",
          address: "456 Oak St, Anytown, USA",
          latitude: 37.7749,
          longitude: -122.4194,
          phone: "555-123-4567",
          website: "www.morningbrewcafe.com",
          imageUrl: "https://images.unsplash.com/photo-1554118811-1e0d58224f24?ixlib=rb-1.2.1&ixid=MnwxMjA3fDB8MHxzZWFyY2h8M3x8Y2FmZXxlbnwwfHwwfHw%3D&w=1000&q=80",
          governmentId: "placeholder",
          proofOfAddress: "placeholder",
          proofOfBusiness: "placeholder",
          verificationStatus: "verified"
        })
        .returning();
      
      console.log('Seeding deals...');
      
      // Coffee deal
      const [coffeeDeal] = await tx.insert(schema.deals)
        .values({
          businessId: cafeBusiness.id,
          title: "50% Off Your First Coffee",
          description: "New customers get 50% off any coffee drink!",
          category: "Food & Drink",
          imageUrl: "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80",
          startDate: new Date("2023-01-01"),
          endDate: new Date("2023-12-31"),
          terms: "Valid for first-time customers only. Cannot be combined with other offers.",
          discount: "50%",
          dealType: "percent_off",
          featured: true,
          redemptionCode: "COFFEE50",
          status: "active"
        })
        .returning();
      
      // BOGO deal
      const [bogoDeal] = await tx.insert(schema.deals)
        .values({
          businessId: vendorBusiness.id,
          title: "Buy One Get One Free",
          description: "Purchase any item and get a second of equal or lesser value for free!",
          category: "Retail",
          imageUrl: "https://images.unsplash.com/photo-1555529669-e69e7aa0ba9a?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80",
          startDate: new Date("2023-02-01"),
          endDate: new Date("2023-12-31"),
          terms: "Limit one per customer. Not valid with other promotions.",
          discount: "BOGO",
          dealType: "bogo",
          featured: false,
          redemptionCode: "BOGO2023",
          status: "active"
        })
        .returning();
      
      // Add favorites
      await tx.insert(schema.userFavorites)
        .values({
          userId: customerUser.id,
          dealId: coffeeDeal.id,
          createdAt: new Date()
        });
      
      console.log('Seed completed successfully!');
    });
  } catch (error) {
    console.error('Seeding failed:', error);
    process.exit(1);
  }

  await pool.end();
}

main();