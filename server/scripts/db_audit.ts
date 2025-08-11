/**
 * Database audit script - READ-ONLY analysis of database structure and data
 * Uses the same connection pool as the main server
 */

import { pool } from '../db';

export async function main() {
  try {
    console.log('=== DATABASE AUDIT REPORT ===\n');
    
    // 1. Print DB host connection info
    const hostQuery = 'SELECT inet_server_addr() as server_ip, current_database() as db_name, version() as version';
    const hostResult = await pool.query(hostQuery);
    const hostInfo = hostResult.rows[0];
    
    console.log('1) DATABASE CONNECTION INFO:');
    console.log(`   Database: ${hostInfo.db_name}`);
    console.log(`   Server IP: ${hostInfo.server_ip || 'localhost/unix socket'}`);
    console.log(`   Version: ${hostInfo.version}\n`);
    
    // 2. List all non-system tables
    const tablesQuery = `
      SELECT table_schema, table_name 
      FROM information_schema.tables 
      WHERE table_type = 'BASE TABLE' 
        AND table_schema NOT IN ('pg_catalog', 'information_schema')
      ORDER BY table_schema, table_name
    `;
    const tablesResult = await pool.query(tablesQuery);
    
    console.log('2) ALL NON-SYSTEM TABLES:');
    for (const table of tablesResult.rows) {
      console.log(`   ${table.table_schema}.${table.table_name}`);
    }
    console.log();
    
    // 3. List business/profile related tables
    const businessTablesQuery = `
      SELECT table_schema, table_name 
      FROM information_schema.tables 
      WHERE table_type = 'BASE TABLE' 
        AND table_schema NOT IN ('pg_catalog', 'information_schema')
        AND (table_name ILIKE '%business%' OR table_name ILIKE '%profile%')
      ORDER BY table_schema, table_name
    `;
    const businessTablesResult = await pool.query(businessTablesQuery);
    
    console.log('3) BUSINESS/PROFILE RELATED TABLES:');
    for (const table of businessTablesResult.rows) {
      console.log(`   ${table.table_schema}.${table.table_name}`);
    }
    console.log();
    
    // 4. List password columns across ALL tables
    const passwordColumnsQuery = `
      SELECT table_schema, table_name, column_name, data_type
      FROM information_schema.columns 
      WHERE table_schema NOT IN ('pg_catalog', 'information_schema')
        AND (column_name = 'password' OR column_name = 'password_hash')
      ORDER BY table_schema, table_name, column_name
    `;
    const passwordColumnsResult = await pool.query(passwordColumnsQuery);
    
    console.log('4) PASSWORD COLUMNS:');
    if (passwordColumnsResult.rows.length === 0) {
      console.log('   ✅ No password columns found');
    } else {
      for (const col of passwordColumnsResult.rows) {
        console.log(`   ${col.table_schema}.${col.table_name}.${col.column_name} (${col.data_type})`);
      }
    }
    console.log();
    
    // 5. Check profiles table email data
    const profilesExistsQuery = `
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'profiles' 
          AND table_schema NOT IN ('pg_catalog', 'information_schema')
      ) as table_exists
    `;
    const profilesExistsResult = await pool.query(profilesExistsQuery);
    
    if (profilesExistsResult.rows[0].table_exists) {
      console.log('5) PROFILES TABLE ANALYSIS:');
      
      // Check if email column exists
      const emailColumnQuery = `
        SELECT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'profiles' 
            AND column_name = 'email'
            AND table_schema NOT IN ('pg_catalog', 'information_schema')
        ) as email_exists
      `;
      const emailColumnResult = await pool.query(emailColumnQuery);
      console.log(`   Has email column: ${emailColumnResult.rows[0].email_exists ? 'YES' : 'NO'}`);
      
      if (emailColumnResult.rows[0].email_exists) {
        // Count mixed-case emails
        const mixedCaseQuery = `
          SELECT COUNT(*) as mixed_case_count
          FROM profiles 
          WHERE email <> lower(email)
        `;
        const mixedCaseResult = await pool.query(mixedCaseQuery);
        console.log(`   Mixed-case emails: ${mixedCaseResult.rows[0].mixed_case_count}`);
      }
    } else {
      console.log('5) PROFILES TABLE: Does not exist');
    }
    console.log();
    
    // 6. Check users table email data
    const usersExistsQuery = `
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'users' 
          AND table_schema NOT IN ('pg_catalog', 'information_schema')
      ) as table_exists
    `;
    const usersExistsResult = await pool.query(usersExistsQuery);
    
    if (usersExistsResult.rows[0].table_exists) {
      console.log('6) USERS TABLE ANALYSIS:');
      
      // Check if email column exists
      const emailColumnQuery = `
        SELECT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'users' 
            AND column_name = 'email'
            AND table_schema NOT IN ('pg_catalog', 'information_schema')
        ) as email_exists
      `;
      const emailColumnResult = await pool.query(emailColumnQuery);
      console.log(`   Has email column: ${emailColumnResult.rows[0].email_exists ? 'YES' : 'NO'}`);
      
      if (emailColumnResult.rows[0].email_exists) {
        // Count mixed-case emails
        const mixedCaseQuery = `
          SELECT COUNT(*) as mixed_case_count
          FROM users 
          WHERE email <> lower(email)
        `;
        const mixedCaseResult = await pool.query(mixedCaseQuery);
        console.log(`   Mixed-case emails: ${mixedCaseResult.rows[0].mixed_case_count}`);
      }
    } else {
      console.log('6) USERS TABLE: Does not exist');
    }
    
    console.log('\n=== AUDIT COMPLETE ===');
    
  } catch (error) {
    console.error('❌ Database audit failed:', error);
    throw error;
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main()
    .then(() => {
      console.log('\n✅ Audit completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Audit failed:', error);
      process.exit(1);
    });
}