/**
 * Database fix script - Remove password_hash column and add protective email indexes
 * Uses the same connection pool as the main server
 */

import { pool } from '../db';

export async function main() {
  const client = await pool.connect();
  
  try {
    console.log('=== DATABASE FIX: Business Password Column Removal ===\n');
    
    // Start transaction
    await client.query('BEGIN');
    console.log('✓ Transaction started');
    
    let changes: string[] = [];
    
    // Check if businesses_new table exists
    const tableExistsQuery = `
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'businesses_new'
      ) as table_exists
    `;
    const tableExistsResult = await client.query(tableExistsQuery);
    
    if (tableExistsResult.rows[0].table_exists) {
      console.log('✓ Table public.businesses_new exists');
      
      // Check if password_hash column exists
      const columnExistsQuery = `
        SELECT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_schema = 'public' 
            AND table_name = 'businesses_new' 
            AND column_name = 'password_hash'
        ) as column_exists
      `;
      const columnExistsResult = await client.query(columnExistsQuery);
      
      if (columnExistsResult.rows[0].column_exists) {
        console.log('✓ Column password_hash exists, dropping...');
        
        // Drop the password_hash column
        await client.query('ALTER TABLE public.businesses_new DROP COLUMN IF EXISTS password_hash');
        changes.push('Dropped password_hash column from public.businesses_new');
        console.log('✓ Successfully dropped password_hash column');
      } else {
        console.log('✓ Column password_hash does not exist (already clean)');
      }
    } else {
      console.log('✓ Table public.businesses_new does not exist');
    }
    
    // Create protective unique index on profiles.email (case-insensitive)
    console.log('✓ Creating protective email indexes...');
    
    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS profiles_email_lower_uq 
      ON public.profiles (lower(email))
    `);
    changes.push('Created unique index profiles_email_lower_uq (if not exists)');
    console.log('✓ Created profiles email index');
    
    // Create protective unique index on users.email (case-insensitive) if table exists
    await client.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.tables 
          WHERE table_schema='public' AND table_name='users'
        ) THEN
          CREATE UNIQUE INDEX IF NOT EXISTS users_email_lower_uq 
          ON public.users (lower(email));
        END IF;
      END$$
    `);
    changes.push('Created unique index users_email_lower_uq (if table and index not exist)');
    console.log('✓ Created users email index (if table exists)');
    
    // Commit transaction
    await client.query('COMMIT');
    console.log('✓ Transaction committed successfully');
    
    // Print summary
    console.log('\n=== CHANGES MADE ===');
    if (changes.length === 0) {
      console.log('✓ No changes were needed - database already in correct state');
    } else {
      for (const change of changes) {
        console.log(`✓ ${change}`);
      }
    }
    
    console.log('\n=== FIX COMPLETE ===');
    
  } catch (error) {
    // Rollback on error
    await client.query('ROLLBACK');
    console.error('❌ Database fix failed, transaction rolled back:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main()
    .then(() => {
      console.log('\n✅ Database fix completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Database fix failed:', error);
      process.exit(1);
    });
}