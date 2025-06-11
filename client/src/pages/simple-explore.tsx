import React, { useState, useEffect } from 'react';
import { Link } from 'wouter';

export default function SimpleExplorePage() {
  const [deals, setDeals] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchDeals() {
      try {
        setIsLoading(true);
        const response = await fetch('/api/v1/deals');
        
        if (!response.ok) {
          throw new Error(`API Error: ${response.status}`);
        }
        
        const data = await response.json();
        setDeals(data);
        setError(null);
      } catch (err) {
        console.error("Error fetching deals:", err);
        setError(err instanceof Error ? err.message : 'Unknown error occurred');
      } finally {
        setIsLoading(false);
      }
    }
    
    fetchDeals();
  }, []);
  
  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Simple Explore</h1>
        <Link href="/test-page">
          <a className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors">
            Go to Test Page
          </a>
        </Link>
      </div>
      
      {isLoading ? (
        <div className="flex justify-center p-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      ) : error ? (
        <div className="p-4 bg-red-50 border border-red-200 rounded-md">
          <h2 className="text-lg font-semibold text-red-600 mb-2">Error Loading Deals</h2>
          <p className="text-red-500">{error}</p>
          <p className="mt-4 text-gray-600">
            This is a simplified page for testing navigation and API access.
            The error above shows if there's any issue with the backend API.
          </p>
        </div>
      ) : deals.length === 0 ? (
        <div className="p-8 text-center bg-gray-50 rounded-lg">
          <h2 className="text-xl font-semibold mb-2">No Deals Found</h2>
          <p className="text-gray-600">This could be because the server is still starting up or no deals exist yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {deals.map((deal: any) => (
            <div key={deal.id} className="border rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow">
              <div className="p-4">
                <h2 className="text-xl font-semibold mb-2 truncate">{deal.title}</h2>
                <p className="text-gray-600 mb-3 line-clamp-2">{deal.description}</p>
                <div className="flex justify-between items-center">
                  <span className="text-sm bg-blue-100 text-blue-800 px-2 py-1 rounded">
                    {deal.category}
                  </span>
                  {deal.business?.businessName && (
                    <p className="text-sm text-gray-500">
                      {deal.business.businessName}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      
      <div className="mt-8 pt-6 border-t">
        <h2 className="text-xl font-semibold mb-4">Navigation Links</h2>
        <div className="flex flex-wrap gap-4">
          <Link href="/">
            <a className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300 transition-colors">
              Home
            </a>
          </Link>
          <Link href="/auth">
            <a className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300 transition-colors">
              Login/Register
            </a>
          </Link>
          <Link href="/test-page">
            <a className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300 transition-colors">
              Test Page
            </a>
          </Link>
        </div>
      </div>
    </div>
  );
}