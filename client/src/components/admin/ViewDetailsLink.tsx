import React from 'react';

interface ViewDetailsLinkProps {
  businessId: number;
  children: React.ReactNode;
}

// This component helps avoid nested anchor tags by using direct navigation
export default function ViewDetailsLink({ businessId, children }: ViewDetailsLinkProps) {
  const handleClick = () => {
    window.location.href = `/admin/vendors/${businessId}`;
  };

  return (
    <div className="cursor-pointer" onClick={handleClick}>
      {children}
    </div>
  );
}