import { ReactNode } from "react";
import { MapPin, Shield } from "lucide-react";
import TestimonialCarousel from "./TestimonialCarousel";

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

        {/* Auth Container */}
        <div className="flex-grow flex flex-col">
          <div className="min-h-[600px] w-full flex flex-col">
            {children}
          </div>
          
          {/* Trust badges (mobile only) */}
          <div className="mt-8 md:hidden">
            <div className="flex items-center justify-center space-x-4 py-3 border-t border-gray-100">
              <div className="flex items-center">
                <Shield className="h-4 w-4 text-[#00796B] mr-1.5" />
                <span className="text-xs text-gray-500">Secure Login</span>
              </div>
              <div className="flex items-center">
                <svg className="h-4 w-4 text-[#00796B] mr-1.5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zM9 6c0-1.66 1.34-3 3-3s3 1.34 3 3v2H9V6zm9 14H6V10h12v10zm-6-3c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2z" />
                </svg>
                <span className="text-xs text-gray-500">Encrypted Data</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel - Brand Image (only on desktop) */}
      <div className="hidden md:block md:w-1/2 xl:w-3/5 bg-[#00796B]">
        <div className="h-full flex flex-col justify-between p-8 bg-gradient-to-br from-[#00796B] to-[#004D40]">
          <div className="max-w-lg mx-auto text-center mt-8">
            <div className="mb-6">
              <MapPin className="h-20 w-20 mx-auto text-white" />
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
                    <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"></path>
                  </svg>
                </div>
                <div>
                  <h3 className="font-medium text-white">Connect With Community</h3>
                  <p className="text-sm text-[#B2DFDB]">Meet like-minded locals and build meaningful connections.</p>
                </div>
              </div>
            </div>
          </div>
          
          {/* Testimonial Carousel */}
          <div className="max-w-lg mx-auto">
            <TestimonialCarousel />
          </div>
          
          {/* Trust badges */}
          <div className="mt-6 flex justify-center space-x-6">
            <div className="flex items-center">
              <Shield className="h-5 w-5 text-white mr-2" />
              <span className="text-[#B2DFDB]">Secure Authentication</span>
            </div>
            <div className="flex items-center">
              <svg className="h-5 w-5 text-white mr-2" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zM9 6c0-1.66 1.34-3 3-3s3 1.34 3 3v2H9V6zm9 14H6V10h12v10zm-6-3c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2z" />
              </svg>
              <span className="text-[#B2DFDB]">End-to-End Encryption</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
