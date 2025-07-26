import { ReactNode, SVGProps } from "react";

interface AuthLayoutProps {
  children: ReactNode;
}

// Use your actual PNG logo
const FullLogo = ({ className, ...props }: { className?: string } & React.ImgHTMLAttributes<HTMLImageElement>) => (
  <img src="/pinnity-logo-full.png" alt="Pinnity - Discover Local" className={className} {...props} />
);

// Standalone pin-heart icon for background
const PinIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 100 130" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
    <path d="M50 10C34.536 10 22 22.536 22 38C22 58 50 120 50 120S78 58 78 38C78 22.536 65.464 10 50 10Z" fill="#2F9A87"/>
    <circle cx="50" cy="38" r="18" fill="#1A1A1A"/>
    <path d="M50 45C46.2 42.8 42 40.2 42 36C42 33.2 44.2 31 47 31C48.4 31 49.6 31.6 50 32.6C50.4 31.6 51.6 31 53 31C55.8 31 58 33.2 58 36C58 40.2 53.8 42.8 50 45Z" fill="#FF9500"/>
  </svg>
);

// Bullet icon for list items
const BulletIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
    <circle cx="12" cy="12" r="8" fill="#FFC107"/>
    <path d="M12 8v4l3 3" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

export default function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="md:flex h-screen">
      {/* LEFT PANEL */}
      <div className="md:w-1/2 bg-white flex flex-col">
        {/* Header with ONLY full logo */}
        <header className="flex justify-center py-8">
          <FullLogo className="h-20 w-auto object-contain" />
        </header>
        
        {/* Form Container */}
        <div className="flex-grow px-6 md:px-12 pb-8 md:pb-12 flex flex-col">
          <div className="flex-grow flex flex-col">
            <div className="min-h-[600px] w-full flex flex-col">
              {children}
            </div>
          </div>
        </div>
      </div>

      {/* RIGHT PANEL */}
      <div className="hidden md:block md:w-1/2 relative bg-teal-800 p-12 flex items-center justify-center overflow-hidden">
        {/* BACKGROUND PIN */}
        <PinIcon
          className="absolute inset-0 m-auto h-32 w-auto opacity-10"
          aria-hidden="true"
        />

        {/* CONTENT ON TOP */}
        <div className="relative z-10 max-w-lg space-y-6">
          <h2 className="text-4xl font-bold text-white">Discover Local</h2>
          <p className="text-white/80">
            Join the Pinnity community to discover and connect with amazing local businesses and experiences in your area.
          </p>
          <ul className="space-y-4">
            <li className="flex items-start bg-teal-700 rounded-lg p-4">
              <BulletIcon className="h-6 text-amber-400 flex-shrink-0" />
              <div className="ml-3">
                <h3 className="font-semibold text-white">Explore Your Neighborhood</h3>
                <p className="text-white/80 text-sm">Find hidden gems and local favorites right around the corner.</p>
              </div>
            </li>
            <li className="flex items-start bg-teal-700 rounded-lg p-4">
              <BulletIcon className="h-6 text-amber-400 flex-shrink-0" />
              <div className="ml-3">
                <h3 className="font-semibold text-white">Support Local Businesses</h3>
                <p className="text-white/80 text-sm">Help your community thrive by supporting local entrepreneurs.</p>
              </div>
            </li>
            <li className="flex items-start bg-teal-700 rounded-lg p-4">
              <BulletIcon className="h-6 text-amber-400 flex-shrink-0" />
              <div className="ml-3">
                <h3 className="font-semibold text-white">Win-Win Discounts</h3>
                <p className="text-white/80 text-sm">Get exclusive deals directly from businesses, supporting them while you save.</p>
              </div>
            </li>
          </ul>
        </div>
      </div>

      {/* Mobile marketing section (below form on mobile) */}
      <div className="block md:hidden bg-teal-800 text-white p-6">
        <h3 className="text-lg font-semibold mb-4">Why Join Pinnity?</h3>
        <ul className="space-y-3">
          <li className="flex items-center">
            <BulletIcon className="h-5 w-auto mr-3" />
            <span className="text-sm">Discover local businesses and experiences</span>
          </li>
          <li className="flex items-center">
            <BulletIcon className="h-5 w-auto mr-3" />
            <span className="text-sm">Exclusive deals you won't find anywhere else</span>
          </li>
          <li className="flex items-center">
            <BulletIcon className="h-5 w-auto mr-3" />
            <span className="text-sm">Save on your favorite local spots</span>
          </li>
        </ul>
      </div>
    </div>
  );
}
