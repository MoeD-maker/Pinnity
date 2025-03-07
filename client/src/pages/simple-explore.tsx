import React, { useState, useEffect } from 'react';

export default function SimpleExplorePage() {
  const [deals, setDeals] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchDeals() {
      try {
        console.log('Fetching deals...');
        const response = await fetch('/api/deals');
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('Deals fetched:', data);
        setDeals(data);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching deals:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
        setLoading(false);
      }
    }

    fetchDeals();
  }, []);

  if (loading) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold mb-4">Simple Explore Page</h1>
        <p>Loading deals...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold mb-4 text-red-500">Error</h1>
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Simple Explore Page</h1>
      <p className="mb-4">Found {deals.length} deals</p>
      
      <div className="space-y-4">
        {deals.map((deal) => (
          <div key={deal.id} className="border p-4 rounded-md">
            <h2 className="text-xl font-semibold">{deal.title}</h2>
            <p className="text-gray-700">{deal.description}</p>
            <div className="mt-2 text-sm text-gray-500">
              Business: {deal.business.businessName}
            </div>
          </div>
        ))}
        
        {deals.length === 0 && (
          <p>No deals found. Check back later!</p>
        )}
      </div>
    </div>
  );
}