/**
 * Migrate existing users and businesses to the new unified system
 */
import { db } from './server/db';
import { supabaseAdmin } from './server/supabaseAdmin';

async function migrateExistingData() {
  console.log('🔄 Migrating existing data to unified system...');

  try {
    // Step 1: Get all existing users from old table
    const oldUsersQuery = `
      SELECT id, email, first_name, last_name, phone, address, 
             user_type, phone_verified, created_at
      FROM users 
      ORDER BY created_at DESC
    `;
    
    const oldUsersResult = await db.execute(oldUsersQuery);
    const oldUsers = oldUsersResult.rows;
    
    console.log(`📊 Found ${oldUsers.length} users in old table`);
    
    // Step 2: Get existing Supabase users
    const { data: supabaseUsers, error: supabaseError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (supabaseError) {
      console.error('❌ Failed to fetch Supabase users:', supabaseError);
      return;
    }
    
    console.log(`📊 Found ${supabaseUsers.users.length} users in Supabase Auth`);
    
    // Step 3: Migrate users to profiles table
    let migratedCount = 0;
    let skippedCount = 0;
    
    for (const user of oldUsers) {
      try {
        // Check if user already exists in profiles
        const existingProfileQuery = `SELECT id FROM profiles WHERE lower(email) = lower($1)`;
        const existingProfile = await db.execute(existingProfileQuery, [user.email]);
        
        if (existingProfile.rows.length > 0) {
          console.log(`⏭️  Skipping ${user.email} - already exists in profiles`);
          skippedCount++;
          continue;
        }
        
        // Find corresponding Supabase user
        const supabaseUser = supabaseUsers.users.find(su => su.email === user.email);
        
        // Insert into profiles table
        const insertProfileQuery = `
          INSERT INTO profiles (
            supabase_user_id, email, first_name, last_name, 
            phone, address, user_type, phone_verified, created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          RETURNING id
        `;
        
        const profileResult = await db.execute(insertProfileQuery, [
          supabaseUser?.id || null,
          user.email,
          user.first_name,
          user.last_name,
          user.phone,
          user.address,
          user.user_type,
          user.phone_verified,
          user.created_at
        ]);
        
        const newProfileId = profileResult.rows[0].id;
        
        console.log(`✅ Migrated ${user.email} to profiles (ID: ${newProfileId})`);
        migratedCount++;
        
        // If user has business, migrate it too
        if (user.user_type === 'business') {
          const businessQuery = `
            SELECT id, business_name, business_category, verification_status,
                   government_id, proof_of_address, proof_of_business,
                   created_at
            FROM businesses 
            WHERE user_id = $1
          `;
          
          const businessResult = await db.execute(businessQuery, [user.id]);
          
          if (businessResult.rows.length > 0) {
            const business = businessResult.rows[0];
            
            // Insert into businesses_new table
            const insertBusinessQuery = `
              INSERT INTO businesses_new (
                profile_id, business_name, business_category, verification_status,
                government_id, proof_of_address, proof_of_business,
                created_at
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
              RETURNING id
            `;
            
            const newBusinessResult = await db.execute(insertBusinessQuery, [
              newProfileId,
              business.business_name,
              business.business_category,
              business.verification_status,
              business.government_id,
              business.proof_of_address,
              business.proof_of_business,
              business.created_at
            ]);
            
            console.log(`✅ Migrated business ${business.business_name} (ID: ${newBusinessResult.rows[0].id})`);
          }
        }
        
      } catch (error) {
        console.error(`❌ Failed to migrate ${user.email}:`, error);
      }
    }
    
    console.log(`\n✅ Migration completed!`);
    console.log(`   Migrated: ${migratedCount} users`);
    console.log(`   Skipped: ${skippedCount} users`);
    
    // Step 4: Verify migration
    const profilesCountQuery = `SELECT COUNT(*) as count FROM profiles`;
    const profilesCount = await db.execute(profilesCountQuery);
    console.log(`   Total profiles: ${profilesCount.rows[0].count}`);
    
    const businessesCountQuery = `SELECT COUNT(*) as count FROM businesses_new`;
    const businessesCount = await db.execute(businessesCountQuery);
    console.log(`   Total businesses: ${businessesCount.rows[0].count}`);
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
  }
}

// Run the migration
migrateExistingData();