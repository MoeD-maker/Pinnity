import { ResetPasswordForm } from "@/components/auth/ResetPasswordForm";
import { motion } from "framer-motion";
import { useEffect } from "react";
import { useLocation } from "wouter";

export function ResetPasswordPage() {
  const [, setLocation] = useLocation();
  
  // Check if token is missing from URL, and if so, redirect to forgot password page
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");
    
    if (!token) {
      setLocation("/forgot-password");
    }
  }, [setLocation]);

  return (
    <div className="container flex flex-col items-center justify-center min-h-screen py-12">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center mb-8"
      >
        <h1 className="text-3xl font-bold tracking-tight mb-2">Pinnity</h1>
        <p className="text-muted-foreground">Local Deals, Global Community</p>
      </motion.div>
      
      <ResetPasswordForm />
    </div>
  );
}