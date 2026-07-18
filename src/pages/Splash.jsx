import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { motion } from "framer-motion";

export default function Splash() {
  const navigate = useNavigate();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    checkAuthAndRedirect();
  }, []);

  const checkAuthAndRedirect = async () => {
    try {
      const isAuthenticated = await base44.auth.isAuthenticated();
      
      if (isAuthenticated) {
        setTimeout(() => {
          navigate(createPageUrl("Dashboard"));
        }, 2000);
      } else {
        setTimeout(() => {
          navigate(createPageUrl("Access"));
        }, 2000);
      }
    } catch (error) {
      console.error("Error checking auth:", error);
      setTimeout(() => {
        navigate(createPageUrl("Access"));
      }, 2000);
    } finally {
      setIsChecking(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#860063] via-[#9d1876] to-[#F88D2A] flex items-center justify-center overflow-hidden relative">
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 2, opacity: 0.1 }}
        transition={{ duration: 2, repeat: Infinity, repeatType: "reverse" }}
        className="absolute w-96 h-96 rounded-full bg-white"
      />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="relative z-10 text-center"
      >
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 1, ease: "easeOut" }}
          className="mb-8"
        >
          <motion.div
            animate={{ 
              boxShadow: [
                "0 0 20px rgba(248, 141, 42, 0.3)",
                "0 0 60px rgba(248, 141, 42, 0.6)",
                "0 0 20px rgba(248, 141, 42, 0.3)"
              ]
            }}
            transition={{ duration: 2, repeat: Infinity }}
            className="inline-block bg-white rounded-3xl p-8 shadow-2xl"
          >
            <img 
              src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6905526da166967415597099/3c8ad4e27_ofi_logo_RGB2.jpg" 
              alt="OFI Logo"
              className="w-48 h-48 object-contain"
              onError={(e) => {
                e.target.src = "https://www.ofi.com/favicon.ico";
              }}
            />
          </motion.div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.8 }}
        >
          <motion.h1 
            className="text-5xl md:text-6xl font-bold text-white mb-4"
            animate={{ 
              textShadow: [
                "0 0 10px rgba(255,255,255,0.5)",
                "0 0 20px rgba(255,255,255,0.8)",
                "0 0 10px rgba(255,255,255,0.5)"
              ]
            }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            OFI
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8, duration: 0.6 }}
            className="text-xl md:text-2xl text-white/90 font-medium"
          >
            Agendamento de Veículos
          </motion.p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2, duration: 0.6 }}
          className="mt-12 flex justify-center"
        >
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            className="w-12 h-12 border-4 border-white/30 border-t-white rounded-full"
          />
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5, duration: 0.6 }}
          className="mt-4 text-white/70 text-sm"
        >
          Carregando sistema...
        </motion.p>
      </motion.div>
    </div>
  );
}