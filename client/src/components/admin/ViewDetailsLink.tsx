import React from 'react';
import { useLocation } from 'wouter';

interface ViewDetailsLinkProps {
  href: string;
  children: React.ReactNode;
  className?: string;
}

// This component helps avoid nested anchor tags by using direct navigation
export default function ViewDetailsLink({ href, children, className = '' }: ViewDetailsLinkProps) {
  const [, navigate] = useLocation();
  
  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    navigate(href);
  };

  return (
    <div className={`cursor-pointer ${className}`} onClick={handleClick}>
      {children}
    </div>
  );
}