import { useState } from "react";
import AuthLayout from "@/components/auth/AuthLayout";
import LoginForm from "@/components/auth/LoginForm";
import SignupForm from "@/components/auth/SignupForm";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AnimatePresence, motion } from "framer-motion";

export default function AuthPage() {
  const [activeTab, setActiveTab] = useState("login");
  
  return (
    <AuthLayout>
      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="w-full transition-all duration-300 ease-in-out"
      >
        <TabsList className="grid w-full grid-cols-2 mb-8 sticky top-0 bg-white z-10">
          <TabsTrigger value="login">Log In</TabsTrigger>
          <TabsTrigger value="signup">Sign Up</TabsTrigger>
        </TabsList>
        
        <AnimatePresence mode="wait">
          <TabsContent value="login" className="overflow-y-auto">
            <motion.div
              key="login"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              <LoginForm />
            </motion.div>
          </TabsContent>
          
          <TabsContent value="signup" className="overflow-y-auto">
            <motion.div
              key="signup"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              <SignupForm />
            </motion.div>
          </TabsContent>
        </AnimatePresence>
      </Tabs>
      
      {/* Contact Us Link */}
      <div className="mt-8 text-center">
        <p className="text-sm text-gray-600">
          Need help?{" "}
          <a 
            href="mailto:hello@pinnity.ca" 
            className="text-blue-600 hover:text-blue-800 underline transition-colors"
          >
            Contact us
          </a>
        </p>
      </div>
    </AuthLayout>
  );
}
