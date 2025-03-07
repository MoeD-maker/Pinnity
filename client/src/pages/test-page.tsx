import React from 'react';
import { Link, useLocation } from 'wouter';

export default function TestPage() {
  const [location] = useLocation();
  
  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-4">Pinnity Navigation Test Page</h1>
      <p className="mb-4 text-gray-600">This is a test page to verify routing and navigation.</p>
      
      <div className="bg-gray-100 p-4 rounded-md mb-6">
        <h2 className="text-xl font-semibold mb-2">Current Location</h2>
        <code className="bg-white p-2 rounded block">{location}</code>
      </div>
      
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Navigation Links</h2>
        <div className="space-y-2">
          <div className="p-2 bg-blue-50 rounded">
            <h3 className="font-medium">Public Routes</h3>
            <ul className="ml-4 mt-2 space-y-1">
              <li><Link href="/"><a className="text-blue-600 hover:underline">Home (Dashboard)</a></Link></li>
              <li><Link href="/auth"><a className="text-blue-600 hover:underline">Auth Page</a></Link></li>
              <li><Link href="/test-page"><a className="text-blue-600 hover:underline">Test Page (Current)</a></Link></li>
              <li><Link href="/simple-explore"><a className="text-blue-600 hover:underline">Simple Explore</a></Link></li>
            </ul>
          </div>
          
          <div className="p-2 bg-green-50 rounded">
            <h3 className="font-medium">User Routes (Protected)</h3>
            <ul className="ml-4 mt-2 space-y-1">
              <li><Link href="/explore"><a className="text-blue-600 hover:underline">Explore</a></Link></li>
              <li><Link href="/map"><a className="text-blue-600 hover:underline">Map</a></Link></li>
              <li><Link href="/favorites"><a className="text-blue-600 hover:underline">Favorites</a></Link></li>
              <li><Link href="/profile"><a className="text-blue-600 hover:underline">Profile</a></Link></li>
            </ul>
          </div>
          
          <div className="p-2 bg-purple-50 rounded">
            <h3 className="font-medium">Admin Routes (Protected)</h3>
            <ul className="ml-4 mt-2 space-y-1">
              <li><Link href="/admin"><a className="text-blue-600 hover:underline">Admin Dashboard</a></Link></li>
              <li><Link href="/admin/vendors"><a className="text-blue-600 hover:underline">Admin Vendors</a></Link></li>
              <li><Link href="/admin/deals"><a className="text-blue-600 hover:underline">Admin Deals</a></Link></li>
            </ul>
          </div>
          
          <div className="p-2 bg-orange-50 rounded">
            <h3 className="font-medium">Vendor Routes (Protected)</h3>
            <ul className="ml-4 mt-2 space-y-1">
              <li><Link href="/vendor"><a className="text-blue-600 hover:underline">Vendor Dashboard</a></Link></li>
              <li><Link href="/vendor/deals/create"><a className="text-blue-600 hover:underline">Create Deal</a></Link></li>
              <li><Link href="/vendor/profile"><a className="text-blue-600 hover:underline">Vendor Profile</a></Link></li>
            </ul>
          </div>
        </div>
      </div>
      
      <div className="bg-yellow-50 p-4 rounded-md">
        <h2 className="text-xl font-semibold mb-2">Debugging Information</h2>
        <div className="space-y-2">
          <p><strong>Is Online:</strong> {navigator.onLine ? 'Yes' : 'No'}</p>
          <p><strong>User Agent:</strong> {navigator.userAgent}</p>
          <p><strong>Current URL:</strong> {window.location.href}</p>
          <p><strong>Referrer:</strong> {document.referrer || 'None'}</p>
          <p><strong>Service Worker Support:</strong> {'serviceWorker' in navigator ? 'Yes' : 'No'}</p>
        </div>
      </div>
    </div>
  );
}