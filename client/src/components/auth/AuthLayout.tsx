import { ReactNode } from "react";

interface AuthLayoutProps {
  children: ReactNode;
}

export default function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="md:flex min-h-screen">
      {/* Left Panel - Form */}
      <div className="w-full md:w-1/2 xl:w-2/5 h-full flex flex-col bg-white">
        {/* Header with Pin Icon - Above the form */}
        <header className="flex flex-col items-center py-8 bg-white">
          <img src="/logo-icon.svg" alt="" className="h-24 w-auto mb-3" aria-hidden="true" />
          <h1 className="text-3xl font-semibold text-gray-800">Pinnity</h1>
          <p className="mt-1 text-teal-700 italic">Discover Local</p>
        </header>
        
        {/* Form Container */}
        <div className="flex-grow px-6 md:px-12 pb-8 md:pb-12 flex flex-col">
          {/* Auth Container */}
          <div className="flex-grow flex flex-col">
            <div className="min-h-[600px] w-full flex flex-col">
              {children}
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel - Marketing with centered background pin */}
      <aside className="hidden md:block relative flex-1 bg-teal-800 p-12 flex flex-col justify-center overflow-hidden">
        {/* BACKGROUND PIN */}
        <img
          src="/logo-icon.svg"
          alt=""
          className="absolute inset-0 m-auto h-40 w-auto opacity-10"
          aria-hidden="true"
        />

        {/* CONTENT (on top of pin) */}
        <div className="relative z-10 space-y-8 max-w-lg">
          <h2 className="text-4xl font-bold text-white">Discover Local</h2>
          <p className="mt-2 text-white/80">
            Join the Pinnity community to discover and connect with amazing local businesses and experiences in your area.
          </p>
          <ul className="mt-6 space-y-4">
            <li className="flex items-start bg-teal-700 rounded-lg p-4">
              <span className="flex-shrink-0 text-amber-400">
                <img src="/logo-icon.svg" alt="" className="h-6 w-auto" />
              </span>
              <div className="ml-3">
                <h3 className="font-semibold text-white">Explore Your Neighborhood</h3>
                <p className="text-white/80 text-sm">Find hidden gems and local favorites right around the corner.</p>
              </div>
            </li>
            <li className="flex items-start bg-teal-700 rounded-lg p-4">
              <span className="flex-shrink-0 text-amber-400">
                <img src="/logo-icon.svg" alt="" className="h-6 w-auto" />
              </span>
              <div className="ml-3">
                <h3 className="font-semibold text-white">Support Local Businesses</h3>
                <p className="text-white/80 text-sm">Help your community thrive by supporting local entrepreneurs.</p>
              </div>
            </li>
            <li className="flex items-start bg-teal-700 rounded-lg p-4">
              <span className="flex-shrink-0 text-amber-400">
                <img src="/logo-icon.svg" alt="" className="h-6 w-auto" />
              </span>
              <div className="ml-3">
                <h3 className="font-semibold text-white">Win-Win Discounts</h3>
                <p className="text-white/80 text-sm">Get exclusive deals directly from businesses, supporting them while you save.</p>
              </div>
            </li>
          </ul>
        </div>
      </aside>

      {/* Mobile marketing section (below form on mobile) */}
      <div className="block md:hidden bg-teal-800 text-white p-6">
        <h3 className="text-lg font-semibold mb-4">Why Join Pinnity?</h3>
        <ul className="space-y-3">
          <li className="flex items-center">
            <img src="/logo-icon.svg" alt="" className="h-5 w-auto mr-3 text-amber-400" />
            <span className="text-sm">Discover local businesses and experiences</span>
          </li>
          <li className="flex items-center">
            <img src="/logo-icon.svg" alt="" className="h-5 w-auto mr-3 text-amber-400" />
            <span className="text-sm">Exclusive deals you won't find anywhere else</span>
          </li>
          <li className="flex items-center">
            <img src="/logo-icon.svg" alt="" className="h-5 w-auto mr-3 text-amber-400" />
            <span className="text-sm">Save on your favorite local spots</span>
          </li>
        </ul>
      </div>
    </div>
  );
}
