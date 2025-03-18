import { useParams, useLocation } from "wouter";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import OnboardingFlow from "@/components/onboarding/OnboardingFlow";
import { Loader2 } from "lucide-react";

export default function OnboardingPage() {
  const params = useParams();
  const [location, setLocation] = useLocation();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  
  const { userType, userId } = params;

  useEffect(() => {
    // Validate the userType and userId
    if (!userType || !userId || !['individual', 'business'].includes(userType)) {
      // Redirect to auth if invalid parameters
      setLocation('/auth');
      return;
    }

    // Fetch user data to validate and get details for onboarding
    const fetchUserData = async () => {
      try {
        setLoading(true);
        
        // Get the token from localStorage
        const token = localStorage.getItem('token');
        if (!token) {
          throw new Error('No authentication token found');
        }
        
        // Fetch user data from API
        const response = await fetch(`/api/user/${userId}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (!response.ok) {
          throw new Error('Failed to fetch user data');
        }
        
        const userData = await response.json();
        
        // Validate that the user type matches the URL parameter
        if (userData.userType !== userType) {
          throw new Error('User type mismatch');
        }
        
        setUser(userData);
      } catch (error) {
        console.error('Onboarding error:', error);
        // Redirect to auth on error
        setLocation('/auth');
      } finally {
        setLoading(false);
      }
    };
    
    fetchUserData();
  }, [userType, userId, setLocation]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-b from-gray-50 to-gray-100">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin mx-auto text-[#00796B]" />
          <h2 className="mt-4 text-xl font-medium text-gray-700">Loading your personalization...</h2>
          <p className="mt-2 text-gray-500">We're setting up your customized experience</p>
        </div>
      </div>
    );
  }

  return (
    <motion.div 
      className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 py-12 px-4 sm:px-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Welcome to Pinnity</h1>
          <p className="text-lg text-gray-600">Let's personalize your experience</p>
        </div>
        
        {user && (
          <OnboardingFlow 
            user={user}
            userType={userType as 'individual' | 'business'} 
          />
        )}
      </div>
    </motion.div>
  );
}