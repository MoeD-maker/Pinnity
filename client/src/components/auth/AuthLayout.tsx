import { ReactNode } from "react";
import { MapPin, Tag, Star } from "lucide-react";

interface AuthLayoutProps {
  children: ReactNode;
}

export default function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="flex flex-col md:flex-row min-h-screen">
      {/* Left Panel - Form */}
      <div className="w-full md:w-1/2 xl:w-2/5 h-full px-6 py-8 md:px-12 md:py-12 flex flex-col">
        {/* Logo */}
        <div className="mb-8">
          <div className="flex items-center">
            <MapPin className="h-10 w-10 text-[#00796B]" />
            <h1 className="ml-2 text-2xl font-bold text-gray-700">Pinnity</h1>
          </div>
          <p className="text-sm text-gray-400 mt-1">Discover Local</p>
        </div>
        
        {/* Mobile brand reinforcement */}
        <div className="md:hidden mt-2 mb-8 bg-[#00796B] text-white p-4 rounded-lg">
          <h3 className="font-medium">Why Join Pinnity?</h3>
          <ul className="mt-2 text-sm">
            <li className="flex items-center mt-2">
              <MapPin className="h-4 w-4 mr-2 text-[#FF9800]" />
              <span>Discover local businesses and experiences</span>
            </li>
            <li className="flex items-center mt-2">
              <Tag className="h-4 w-4 mr-2 text-[#FF9800]" />
              <span>Exclusive deals you won't find anywhere else</span>
            </li>
            <li className="flex items-center mt-2">
              <Star className="h-4 w-4 mr-2 text-[#FF9800]" />
              <span>Save on your favorite local spots</span>
            </li>
          </ul>
        </div>

        {/* Auth Container */}
        <div className="flex-grow flex flex-col">
          <div className="min-h-[600px] w-full flex flex-col">
            {children}
          </div>
          
          {/* Removed trust badges (mobile only) as requested */}
        </div>
      </div>

      {/* Right Panel - Brand Image (only on desktop) */}
      <div className="hidden md:block md:w-1/2 xl:w-3/5 bg-[#00796B]">
        <div className="h-full flex flex-col justify-between p-8 bg-gradient-to-br from-[#00796B] to-[#004D40]">
          <div className="max-w-lg mx-auto text-center mt-8">
            <div className="mb-6">
              <img src="/pinnity-logo.jpg" alt="Pinnity" className="h-32 w-auto mx-auto" />
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">Discover Local</h1>
            <p className="text-[#B2DFDB] text-lg">
              Join the Pinnity community to discover and connect with amazing local businesses and experiences in your area.
            </p>
            <div className="mt-8 space-y-4">
              <div className="flex items-center text-left bg-white bg-opacity-10 p-4 rounded-lg">
                <div className="shrink-0 mr-4">
                  <MapPin className="h-8 w-8 text-[#FF9800]" />
                </div>
                <div>
                  <h3 className="font-medium text-white">Explore Your Neighborhood</h3>
                  <p className="text-sm text-[#B2DFDB]">Find hidden gems and local favorites right around the corner.</p>
                </div>
              </div>
              <div className="flex items-center text-left bg-white bg-opacity-10 p-4 rounded-lg">
                <div className="shrink-0 mr-4">
                  <svg className="w-8 h-8 text-[#FF9800]" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm.31-8.86c-1.77-.45-2.34-.94-2.34-1.67 0-.84.79-1.43 2.1-1.43 1.38 0 1.9.66 1.94 1.64h1.71c-.05-1.34-.87-2.57-2.49-2.97V5H10.9v1.69c-1.51.32-2.72 1.3-2.72 2.81 0 1.79 1.49 2.69 3.66 3.21 1.95.46 2.34 1.15 2.34 1.87 0 .53-.39 1.39-2.1 1.39-1.6 0-2.23-.72-2.32-1.64H8.04c.1 1.7 1.36 2.66 2.86 2.97V19h2.34v-1.67c1.52-.29 2.72-1.16 2.73-2.77-.01-2.2-1.9-2.96-3.66-3.42z"></path>
                  </svg>
                </div>
                <div>
                  <h3 className="font-medium text-white">Support Local Businesses</h3>
                  <p className="text-sm text-[#B2DFDB]">Help your community thrive by supporting local entrepreneurs.</p>
                </div>
              </div>
              <div className="flex items-center text-left bg-white bg-opacity-10 p-4 rounded-lg">
                <div className="shrink-0 mr-4">
                  <svg className="w-8 h-8 text-[#FF9800]" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M21.41 11.58l-9-9C12.05 2.22 11.55 2 11 2H4c-1.1 0-2 .9-2 2v7c0 .55.22 1.05.59 1.42l9 9c.36.36.86.58 1.41.58.55 0 1.05-.22 1.41-.59l7-7c.37-.36.59-.86.59-1.41 0-.55-.23-1.06-.59-1.42zM13 17.5l-9-9 1.41-1.42L13 14.67l6.59-6.59L21 9.5l-8 8z"></path>
                  </svg>
                </div>
                <div>
                  <h3 className="font-medium text-white">Win-Win Discounts</h3>
                  <p className="text-sm text-[#B2DFDB]">Get exclusive deals directly from businesses, supporting them while you save.</p>
                </div>
              </div>
            </div>
          </div>
          {/* Removed trust badges as requested */}
        </div>
      </div>
    </div>
  );
}
