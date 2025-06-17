const fs = require('fs');

// Read the storage file
let content = fs.readFileSync('server/storage.ts', 'utf8');

// Fix all logoUrl type issues
content = content.replace(
  /logoUrl: \(row\.businesses\.imageUrl as string \| null\) \|\| undefined/g,
  'logoUrl: row.businesses.imageUrl ?? undefined'
);

// Fix query builder type issues by casting to any
content = content.replace(
  /query = query\.orderBy\(desc\(deals\.createdAt\)\)\.limit\(limit\);/g,
  'query = (query as any).orderBy(desc(deals.createdAt)).limit(limit);'
);

// Write back to file
fs.writeFileSync('server/storage.ts', content);

console.log('Storage type fixes applied');