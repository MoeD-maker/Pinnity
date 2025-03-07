import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

export default function SimpleExplorePage() {
  // Fetch all deals
  const { data: deals = [], isLoading, error } = useQuery({
    queryKey: ['/api/deals'],
    queryFn: async () => {
      const response = await apiRequest('/api/deals');
      console.log("API Response:", response);
      return response;
    },
  });
  
  // Log error if any occurs
  if (error) {
    console.error("Error fetching deals:", error);
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold text-red-600">Error loading deals</h1>
        <p className="mt-2">{error.toString()}</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold">Loading deals...</h1>
      </div>
    );
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-6">Simple Explore Page</h1>
      <p className="mb-4">Total deals found: {deals.length}</p>
      
      <div className="space-y-4">
        {Array.isArray(deals) && deals.map((deal: any) => (
          <div key={deal.id} className="border p-4 rounded-lg">
            <h2 className="text-xl font-semibold">{deal.title}</h2>
            <p className="text-sm text-muted-foreground">{deal.business.businessName}</p>
            <p className="mt-2">{deal.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}