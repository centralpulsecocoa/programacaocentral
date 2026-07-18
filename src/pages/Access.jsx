import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, AlertCircle, CheckCircle2, Mail, Key, Lock, ArrowRight } from "lucide-react";
import { toast } from "sonner";

const OFI_LOGO_URL = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6905526da166967415597099/3c8ad4e27_ofi_logo_RGB2.jpg";
const ADMIN_WHITELIST = ['jjancem@gmail.com', 'dep.central@olam.onmicrosoft.com'];

export default function Access() {
  const navigate = useNavigate();
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [isValidDomain, setIsValidDomain] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const isAuth = await base44.auth.isAuthenticated();
      if (isAuth) {
        const currentUser = await base44.auth.me();
        if (currentUser && currentUser.email) {
          const userEmail = currentUser.email.toLowerCase();
          const emailDomain = currentUser.email.split('@')[1]?.toLowerCase();
          const isOfiDomain = emailDomain === 'ofi.com';
          const isWhitelisted = ADMIN_WHITELIST.includes(userEmail);
          
          if (isOfiDomain || isWhitelisted) {
            navigate(createPageUrl("Dashboard"));
          } else {
            await base44.auth.logout();
            toast.error('❌ Domínio não autorizado', {
              description: 'Apenas emails @ofi.com são permitidos',
              duration: 4000,
            });
          }
        }
      }
    } catch (error) {
      console.error("Error checking auth:", error);
    } finally {
      setIsCheckingAuth(false);
    }
  };

  const validateDomain = (emailValue) => {
    const trimmedEmail = emailValue.trim().toLowerCase();
    setEmail(trimmedEmail);

    if (!trimmedEmail) {
      setIsValidDomain(null);
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      setIsValidDomain(false);
      return;
    }

    const domain = trimmedEmail.split('@')[1]?.toLowerCase();
    const isOfiDomain = domain === 'ofi.com';
    const isWhitelisted = ADMIN_WHITELIST.includes(trimmedEmail);

    setIsValidDomain(isOfiDomain || isWhitelisted);
  };

  const handleSendCode = async (e) => {
    if (e) e.preventDefault();
    
    if (!email || isValidDomain === false) {
      toast.error('❌ Email inválido', {
        description: 'Por favor, use um email corporativo @ofi.com',
        duration: 3000,
      });
      return;
    }

    const trimmedEmail = email.trim().toLowerCase();
    const domain = trimmedEmail.split('@')[1]?.toLowerCase();
    const isOfiDomain = domain === 'ofi.com';
    const isWhitelisted = ADMIN_WHITELIST.includes(trimmedEmail);

    if (!isOfiDomain && !isWhitelisted) {
      toast.error('❌ Domínio não autorizado', {
        description: 'Apenas emails @ofi.com são permitidos',
        duration: 4000,
      });
      return;
    }

    setIsLoading(true);

    try {
      const currentUrl = window.location.origin + window.location.pathname;
      await base44.auth.redirectToLogin(currentUrl);
    } catch (error) {
      console.error("Send code error:", error);
      toast.error('❌ Erro ao enviar código', {
        description: error.message || 'Tente novamente.',
        duration: 3000,
      });
      setIsLoading(false);
    }
  };

  if (isCheckingAuth) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#860063] via-[#a31875] to-[#F88D2A] flex items-center justify-center">
        <div className="relative">
          <div className="animate-spin rounded-full h-20 w-20 border-t-4 border-b-4 border-white"></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
            <img 
              src={OFI_LOGO_URL}
              alt="OFI"
              className="w-10 h-10 object-contain"
              onError={(e) => {
                e.target.src = "https://www.ofi.com/favicon.ico";
              }}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#860063] via-[#a31875] to-[#F88D2A] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background decorative elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1.5, opacity: 0.08 }}
          transition={{ duration: 3, repeat: Infinity, repeatType: "reverse" }}
          className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-white"
        />
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1.2, opacity: 0.1 }}
          transition={{ duration: 4, delay: 0.5, repeat: Infinity, repeatType: "reverse" }}
          className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full bg-[#F88D2A]"
        />
        <motion.div
          animate={{ 
            rotate: 360,
          }}
          transition={{ duration: 50, repeat: Infinity, ease: "linear" }}
          className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] border border-white/10 rounded-full"
        />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="w-full max-w-md relative z-10"
      >
        {/* Logo Section */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.8 }}
          className="text-center mb-8"
        >
          <motion.div
            whileHover={{ scale: 1.05 }}
            className="inline-block bg-white rounded-3xl p-6 shadow-2xl mb-6 border-4 border-white/20"
          >
            <img 
              src={OFI_LOGO_URL}
              alt="OFI Logo"
              className="w-28 h-28 object-contain"
              onError={(e) => {
                e.target.src = "https://www.ofi.com/favicon.ico";
              }}
            />
          </motion.div>
          <motion.h1 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-5xl font-bold text-white mb-3 drop-shadow-lg"
          >
            OFI
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="text-xl text-white/95 font-medium tracking-wide"
          >
            Sistema de Agendamento
          </motion.p>
          <motion.div
            initial={{ opacity: 0, width: 0 }}
            animate={{ opacity: 1, width: "80px" }}
            transition={{ delay: 0.6, duration: 0.8 }}
            className="h-1 bg-gradient-to-r from-white/50 to-[#F88D2A] mx-auto mt-3 rounded-full"
          />
        </motion.div>

        {/* Login Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.8 }}
        >
          <Card className="shadow-2xl border-none backdrop-blur-xl bg-white/98 overflow-hidden">
            <CardHeader className="border-b bg-gradient-to-r from-[#860063]/8 via-[#a31875]/6 to-[#F88D2A]/8 pb-4">
              <CardTitle className="text-center flex items-center justify-center gap-2.5 text-xl">
                <div className="p-2 bg-gradient-to-br from-[#860063] to-[#F88D2A] rounded-lg">
                  <Shield className="w-5 h-5 text-white" />
                </div>
                <span className="bg-gradient-to-r from-[#860063] to-[#F88D2A] bg-clip-text text-transparent font-bold">
                  {mode === "login" ? "Acesso ao Sistema" : "Criar Nova Conta"}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 md:p-8">
              <form onSubmit={handleSendCode} className="space-y-5">
                {/* Info Banner */}
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl p-4 shadow-sm">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <Lock className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-blue-900 mb-1">
                        🔒 Acesso Corporativo
                      </p>
                      <p className="text-xs text-blue-800 leading-relaxed">
                        {mode === "login" 
                          ? "Utilize seu email corporativo @ofi.com para acessar o sistema de forma segura."
                          : "Apenas colaboradores OFI com email corporativo @ofi.com podem criar conta no sistema."
                        }
                      </p>
                    </div>
                  </div>
                </div>

                {/* Email Input */}
                <div className="space-y-2.5">
                  <Label htmlFor="email" className="text-sm font-semibold text-gray-700">
                    Email Corporativo *
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="seu.nome@ofi.com"
                      value={email}
                      onChange={(e) => validateDomain(e.target.value)}
                      className={`pl-11 h-12 text-base transition-all border-2 ${
                        isValidDomain === true 
                          ? 'border-green-500 focus:border-green-600 focus:ring-green-500 bg-green-50/30' 
                          : isValidDomain === false 
                          ? 'border-red-500 focus:border-red-600 focus:ring-red-500 bg-red-50/30' 
                          : 'border-gray-300 focus:border-[#860063] focus:ring-[#860063]'
                      }`}
                      disabled={isLoading}
                      autoFocus
                    />
                  </div>

                  {/* Validation Messages */}
                  {isValidDomain === true && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-center gap-2 text-green-700 text-sm font-medium bg-green-50 p-3 rounded-lg border border-green-200"
                    >
                      <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
                      <span>✅ Email corporativo válido</span>
                    </motion.div>
                  )}

                  {isValidDomain === false && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-red-50 border-2 border-red-200 rounded-lg p-4"
                    >
                      <div className="flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm font-bold text-red-800 mb-1.5">
                            ❌ Domínio não autorizado
                          </p>
                          <p className="text-xs text-red-700 leading-relaxed">
                            {mode === "signup" 
                              ? "Não é possível criar conta. Apenas emails @ofi.com são permitidos no sistema."
                              : "Apenas emails @ofi.com podem acessar o sistema. Verifique seu endereço de email."
                            }
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </div>

                {/* Submit Button */}
                <Button
                  type="submit"
                  disabled={!email || isValidDomain === false || isLoading}
                  className="w-full bg-gradient-to-r from-[#860063] via-[#a31875] to-[#F88D2A] hover:from-[#6b004f] hover:via-[#860063] hover:to-[#d97824] text-white h-12 text-base font-bold disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transition-all transform hover:scale-[1.02] active:scale-[0.98]"
                >
                  {isLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-white mr-2"></div>
                      Enviando código de verificação...
                    </>
                  ) : mode === "login" ? (
                    <>
                      <Key className="w-5 h-5 mr-2" />
                      Entrar no Sistema
                      <ArrowRight className="w-5 h-5 ml-2" />
                    </>
                  ) : (
                    <>
                      <Mail className="w-5 h-5 mr-2" />
                      Criar Conta Corporativa
                      <ArrowRight className="w-5 h-5 ml-2" />
                    </>
                  )}
                </Button>

                {/* Mode Toggle */}
                <div className="text-center pt-4 border-t border-gray-200">
                  <p className="text-sm text-gray-600">
                    {mode === "login" ? (
                      <>
                        Primeira vez aqui?{" "}
                        <button
                          type="button"
                          onClick={() => setMode("signup")}
                          className="text-[#860063] font-bold hover:underline hover:text-[#a31875] transition-colors"
                        >
                          Criar conta →
                        </button>
                      </>
                    ) : (
                      <>
                        Já tem conta?{" "}
                        <button
                          type="button"
                          onClick={() => setMode("login")}
                          className="text-[#860063] font-bold hover:underline hover:text-[#a31875] transition-colors"
                        >
                          Fazer login →
                        </button>
                      </>
                    )}
                  </p>
                </div>
              </form>

              {/* How it works */}
              <div className="text-center pt-5 mt-5 border-t border-gray-200">
                <p className="text-xs font-bold text-gray-700 mb-2">
                  📧 Como funciona o acesso?
                </p>
                <p className="text-xs text-gray-600 leading-relaxed">
                  Digite seu email corporativo @ofi.com e você receberá um código de verificação por email para {mode === "login" ? "acessar o sistema" : "criar sua conta"}.
                </p>
              </div>

              {/* Support */}
              <div className="border-t border-gray-200 pt-4 mt-4">
                <div className="bg-gray-50 rounded-lg p-3 text-center">
                  <p className="text-xs text-gray-600">
                    <strong>🆘 Problemas com acesso?</strong>
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Entre em contato com o departamento de TI da OFI
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Security Badge */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6, duration: 0.8 }}
          className="text-center mt-6"
        >
          <div className="bg-white/15 backdrop-blur-md rounded-xl p-4 border border-white/20 shadow-lg">
            <p className="text-sm text-white font-medium flex items-center justify-center gap-2">
              <Shield className="w-5 h-5" />
              <span>Sistema protegido • Acesso restrito a colaboradores OFI</span>
            </p>
          </div>
        </motion.div>

        {/* Copyright */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7, duration: 0.8 }}
          className="text-center mt-4 text-white/90 text-sm font-medium"
        >
          <p>© 2024 OFI - Todos os direitos reservados</p>
        </motion.div>
      </motion.div>
    </div>
  );
}