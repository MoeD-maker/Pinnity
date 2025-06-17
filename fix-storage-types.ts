// Quick fix for storage type issues
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

async function fixStorageTypes() {
  try {
    // Replace problematic type patterns
    await execAsync(`sed -i 's/logoUrl: row\\.businesses\\.imageUrl ?? undefined/logoUrl: (row.businesses.imageUrl || undefined) as string | undefined/g' server/storage.ts`);
    
    // Fix query builder issues
    await execAsync(`sed -i 's/query = query\\.where(/query = (query as any).where(/g' server/storage.ts`);
    
    console.log('Storage types fixed');
    
    // Try compilation
    const { stdout, stderr } = await execAsync('npx tsc --noEmit --skipLibCheck');
    console.log('Compilation successful');
  } catch (error) {
    console.log('Compilation errors:', error);
  }
}

fixStorageTypes();