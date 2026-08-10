import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  User as UserIcon,
  Lock,
  Eye,
  EyeOff,
  ChevronRight,
  Loader2,
  AlertCircle,
  Zap,
  GraduationCap,
  Sparkles,
  Building2,
  Mail
} from "lucide-react";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: "login" | "register" | "demo";
  error: string;
  setError: (msg: string) => void;
  handleSubmit: (e: React.FormEvent) => void;
  username: string;
  setUsername: (val: string) => void;
  password: string;
  setPassword: (val: string) => void;
  showPassword: boolean;
  setShowPassword: (val: boolean) => void;
  loading: boolean;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  initialMode = "login",
  error,
  setError,
  handleSubmit,
  username,
  setUsername,
  password,
  setPassword,
  showPassword,
  setShowPassword,
  loading,
}) => {
  const [mode, setMode] = useState<"login" | "register" | "demo">(initialMode);
  const [schoolName, setSchoolName] = useState("");
  const [email, setEmail] = useState("");
  const [submittedDemo, setSubmittedDemo] = useState(false);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-md rounded-3xl bg-slate-900 border border-slate-800 p-6 sm:p-8 shadow-2xl text-left space-y-6 overflow-hidden"
        >
          {/* Top Close Button */}
          <button
            type="button"
            onClick={onClose}
            className="absolute top-5 right-5 p-2 rounded-xl bg-slate-950 text-slate-400 hover:text-white border border-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Modal Header */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white font-bold">
                <GraduationCap className="w-5 h-5" />
              </div>
              <span className="text-lg font-bold text-white font-display">NexusEdu</span>
            </div>

            <h3 className="text-xl font-bold text-white font-display">
              {mode === "demo" ? "Agendar Demonstração Privada" : "Acessar Plataforma"}
            </h3>
            <p className="text-xs text-slate-400">
              {mode === "demo"
                ? "Preencha seus dados para contato da equipe técnica com os gestores."
                : "Digite suas credenciais corporativas ou RA para acessar."}
            </p>
          </div>

          {/* Error Alert */}
          {error && (
            <div className="bg-rose-950/90 text-rose-200 border border-rose-500/30 p-3.5 rounded-xl text-xs font-medium flex items-center gap-2.5 shadow-lg">
              <AlertCircle className="w-4.5 h-4.5 text-rose-400 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Form */}
          {mode === "demo" && submittedDemo ? (
            <div className="p-4 rounded-2xl bg-emerald-950/60 border border-emerald-500/30 text-emerald-300 text-xs space-y-2 text-center">
              <Sparkles className="w-6 h-6 mx-auto text-emerald-400" />
              <strong className="block text-sm">Demonstração Solicitada com Sucesso!</strong>
              <p>Nossa equipe entrará em contato em breve com a gestão de sua instituição.</p>
              <button
                type="button"
                onClick={() => setSubmittedDemo(false)}
                className="mt-2 text-[11px] underline text-emerald-400"
              >
                Voltar
              </button>
            </div>
          ) : (
            <form
              onSubmit={(e) => {
                if (mode === "demo") {
                  e.preventDefault();
                  setSubmittedDemo(true);
                  return;
                }
                handleSubmit(e);
              }}
              className="space-y-4"
            >
              {mode === "demo" && (
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">Nome da Escola ou Instituição</label>
                  <div className="relative">
                    <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-500" />
                    <input
                      type="text"
                      value={schoolName}
                      onChange={(e) => setSchoolName(e.target.value)}
                      required
                      placeholder="Ex: Colégio Futuro"
                      className="w-full pl-11 pr-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder:text-slate-600 text-xs font-medium outline-none focus:border-blue-500"
                    />
                  </div>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">
                  {mode === "demo" ? "Email Corporativo da Gestão" : "Usuário, Email ou RA"}
                </label>
                <div className="relative">
                  {mode === "demo" ? (
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-500" />
                  ) : (
                    <UserIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-500" />
                  )}
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    placeholder={mode === "demo" ? "direcao@escola.com.br" : "Digite seu usuário ou RA"}
                    autoCapitalize="none"
                    autoComplete="username"
                    className="w-full pl-11 pr-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder:text-slate-600 text-xs font-medium outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {mode !== "demo" && (
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">Senha ou PIN</label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-500" />
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      placeholder="••••••••"
                      autoComplete="current-password"
                      className="w-full pl-11 pr-11 py-3 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder:text-slate-600 text-xs font-medium outline-none focus:border-blue-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 p-1"
                    >
                      {showPassword ? <EyeOff className="w-4.5 h-4.5" /> : <Eye className="w-4.5 h-4.5" />}
                    </button>
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 px-6 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-blue-600/25 cursor-pointer mt-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4.5 h-4.5 animate-spin text-white" />
                    <span>Autenticando...</span>
                  </>
                ) : (
                  <>
                    <span>
                      {mode === "demo" ? "Enviar Solicitação de Demonstração" : "Entrar no NexusEdu"}
                    </span>
                    <ChevronRight className="w-4.5 h-4.5" />
                  </>
                )}
              </button>
            </form>
          )}

          {/* Footer Note */}
          <div className="pt-2 text-center border-t border-slate-800 text-[11px] text-slate-400">
            <span>
              Contas de acesso são gerenciadas exclusivamente pela <b className="text-slate-200">Direção e Secretaria Escolar</b>.
            </span>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
