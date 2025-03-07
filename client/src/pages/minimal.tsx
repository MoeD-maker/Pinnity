import React from 'react';

export default function MinimalPage() {
  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-6">Minimal Test Page</h1>
      <p className="mb-4">This is a minimal React component to test rendering in the Replit environment.</p>
      <div className="p-4 bg-green-100 rounded-md">
        <p>If you can see this, the React application is working correctly!</p>
        <ul className="list-disc pl-5 mt-2">
          <li>Current URL: {window.location.href}</li>
          <li>Path: {window.location.pathname}</li>
          <li>Time: {new Date().toLocaleTimeString()}</li>
        </ul>
      </div>
    </div>
  );
}