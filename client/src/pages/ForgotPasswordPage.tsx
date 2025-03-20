import { ForgotPasswordForm } from "@/components/auth/ForgotPasswordForm";
import { motion } from "framer-motion";

export function ForgotPasswordPage() {
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
      
      <ForgotPasswordForm />
    </div>
  );
}