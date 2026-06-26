import React, { useState, useEffect } from "react";
import ReactDOM from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Trophy, X, Star, Rocket, Sparkles, Navigation } from "lucide-react";
// @ts-ignore
import confetti from "canvas-confetti";

interface AnnouncementPopupProps {
  onNavigate?: () => void;
}

// Floating elements for extra animations
const FloatingElement = ({ children, delay = 0, duration = 3, yOffset = 20, xOffset = 20 }: any) => (
  <motion.div
    animate={{
      y: [0, -yOffset, 0],
      x: [0, xOffset, 0],
      rotate: [0, 15, -15, 0]
    }}
    transition={{
      duration,
      repeat: Infinity,
      ease: "easeInOut",
      delay
    }}
    className="absolute pointer-events-none z-50"
  >
    {children}
  </motion.div>
);

export const AnnouncementPopup: React.FC<AnnouncementPopupProps> = ({ onNavigate }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const timer = setTimeout(() => {
      setIsOpen(true);
      triggerConfetti();
    }, 1500);
    return () => {
      clearTimeout(timer);
      setMounted(false);
    };
  }, []);

  const triggerConfetti = () => {
    const duration = 6000;
    const end = Date.now() + duration;

    const frame = () => {
      confetti({
        particleCount: 12,
        angle: 60,
        spread: 80,
        origin: { x: 0 },
        colors: ["#16a34a", "#facc15", "#2563eb", "#ffffff"], // Green, Yellow, Blue, White
        zIndex: 9999999,
      });
      confetti({
        particleCount: 12,
        angle: 120,
        spread: 80,
        origin: { x: 1 },
        colors: ["#16a34a", "#facc15", "#2563eb", "#ffffff"],
        zIndex: 9999999,
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    };
    frame();
  };

  const handleClose = () => {
    setIsOpen(false);
  };

  const handleNavigate = () => {
    if (onNavigate) {
      onNavigate();
    }
    setIsOpen(false);
  };

  const popupContent = (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          
          {/* MASSIVE BACKGROUND ANIMATIONS - BRASIL THEME */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: [0.4, 0.7, 0.4] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-green-600/40 via-transparent to-transparent pointer-events-none"
          />
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: [0.3, 0.6, 0.3] }}
            transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
            className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-yellow-500/30 via-transparent to-transparent pointer-events-none"
          />
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: [0.2, 0.5, 0.2] }}
            transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut", delay: 2 }}
            className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_var(--tw-gradient-stops))] from-blue-600/30 via-transparent to-transparent pointer-events-none"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.3, y: 100, rotate: -15 }}
            animate={{ opacity: 1, scale: 1, y: 0, rotate: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: -100, rotate: 15 }}
            transition={{ type: "spring", bounce: 0.6, duration: 0.8 }}
            className="max-w-md w-full relative z-10"
          >
            {/* Inner card containing the actual popup contents, with yellow border and overflow-hidden to perfectly clip corners */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-[0_0_120px_rgba(22,163,74,0.6)] border-[5px] border-yellow-400 overflow-hidden relative">
              {/* Close Button */}
              <button
                onClick={handleClose}
                className="absolute top-4 right-4 z-20 text-white hover:text-white transition-all bg-black/20 hover:bg-black/40 rounded-full p-2 hover:rotate-90 hover:scale-110 shadow-lg"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Header / Banner - Brazil Gradient */}
              <div className="bg-gradient-to-br from-green-600 via-green-500 to-yellow-500 p-5 md:p-8 flex flex-col items-center justify-center text-white relative">
                {/* Dynamic Header Glow */}
                <motion.div
                  animate={{ scale: [1, 1.5, 1], opacity: [0.2, 0.5, 0.2] }}
                  transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                  className="absolute inset-0 bg-yellow-300/30 blur-2xl"
                />
                
                <motion.div
                  animate={{ y: [0, -10, 0], rotate: [0, 10, -10, 0] }}
                  transition={{ repeat: Infinity, duration: 2.5, ease: "easeInOut" }}
                  className="bg-white/20 p-4 md:p-5 rounded-full mb-3 md:mb-4 backdrop-blur-md border-[3px] border-yellow-300 shadow-[0_0_30px_rgba(250,204,21,0.6)] relative"
                >
                  <motion.div
                    animate={{ scale: [1, 1.3, 1] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                    className="absolute inset-0 bg-yellow-400/40 rounded-full blur-md"
                  />
                  <Trophy className="w-10 h-10 md:w-16 md:h-16 text-yellow-300 relative z-10" />
                </motion.div>

                <h2 className="text-[20px] md:text-[28px] font-black uppercase tracking-widest text-center text-white drop-shadow-[0_4px_6px_rgba(0,0,0,0.4)] leading-tight">
                  Rumo ao Hexa! 🏆 BRASIL
                </h2>
              </div>

              {/* Content */}
              <div className="p-5 md:p-8 text-center relative overflow-visible bg-slate-50 dark:bg-slate-900">
                
                <div className="absolute -top-6 md:-top-8 left-1/2 -translate-x-1/2 z-20">
                  <motion.div 
                    className="bg-blue-600 text-yellow-300 p-3 md:p-4 rounded-full shadow-[0_0_30px_rgba(37,99,235,0.8)] border-[3px] md:border-[4px] border-yellow-400 cursor-pointer relative"
                    whileHover={{ scale: 1.2, rotate: 360 }}
                    transition={{ type: "spring", bounce: 0.5, duration: 0.6 }}
                  >
                    <motion.div
                      animate={{ y: [-3, 3, -3] }}
                      transition={{ duration: 1, repeat: Infinity, ease: "easeInOut" }}
                    >
                      <Rocket className="w-6 h-6 md:w-8 md:h-8" />
                    </motion.div>
                  </motion.div>
                </div>

                <div className="mt-8 md:mt-10 relative z-10">
                  <h3 className="text-xl md:text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-green-600 to-blue-600 dark:from-green-400 dark:to-blue-400 mb-2 md:mb-4 uppercase tracking-wide">
                    Bateu um Bolão! ⚽
                  </h3>
                  <p className="text-slate-600 dark:text-slate-300 leading-snug md:leading-relaxed mb-6 md:mb-8 font-medium text-[12px] md:text-[15px]">
                    Professor(a), entre em campo como um verdadeiro camisa 10! ⭐
                    <br className="hidden md:block" /><br className="hidden md:block" />
                    Com a nova ferramenta de <strong>Criação Automática</strong>, você gera Provas e Atividades com a agilidade de um craque. O <span className="font-black text-green-600 dark:text-green-400">empurrãozinho tecnológico</span> que faltava na sua escalação!
                    <br /><br />
                    <span className="bg-yellow-100 dark:bg-yellow-900/40 text-yellow-800 dark:text-yellow-300 px-2 py-1 md:px-3 md:py-1 rounded-lg font-bold border border-yellow-300 dark:border-yellow-700 block md:inline-block leading-tight">
                      Menos tempo no banco, mais tempo no jogo! 🏆
                    </span>
                  </p>
                  
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleNavigate}
                    className="w-full relative group overflow-hidden bg-gradient-to-r from-green-600 via-blue-600 to-green-600 text-white font-black uppercase tracking-widest py-3 md:py-4 px-4 md:px-6 rounded-2xl shadow-[0_10px_20px_rgba(22,163,74,0.4)] border border-yellow-400/50 text-[13px] md:text-base"
                  >
                    <motion.div
                      animate={{ x: ["-100%", "200%"] }}
                      transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                      className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent skew-x-12"
                    />
                    <span className="relative z-10 flex items-center justify-center gap-2 drop-shadow-md">
                      Incrível! Vamos Lá <Navigation className="w-5 h-5 ml-1" />
                    </span>
                  </motion.button>
                </div>
              </div>
            </div>

            {/* FLOATING DECORATIONS AROUND BORDER - MOVED HERE TO BE ON TOP */}
            <div className="absolute inset-0 pointer-events-none z-[100]">
              <FloatingElement delay={0} duration={3} yOffset={35} xOffset={-25}>
                <div className="absolute -top-12 -left-12 text-yellow-400 drop-shadow-[0_0_15px_rgba(250,204,21,0.8)]"><Star size={50} fill="currentColor" /></div>
              </FloatingElement>
              <FloatingElement delay={1} duration={4} yOffset={30} xOffset={25}>
                <div className="absolute -bottom-10 -right-10 text-green-500 drop-shadow-[0_0_15px_rgba(34,197,94,0.8)]"><Sparkles size={45} /></div>
              </FloatingElement>
              <FloatingElement delay={0.5} duration={3.5} yOffset={25} xOffset={-15}>
                <div className="absolute top-1/2 -left-14 text-blue-500 drop-shadow-[0_0_15px_rgba(59,130,246,0.8)]"><Star size={35} fill="currentColor" /></div>
              </FloatingElement>
              <FloatingElement delay={1.5} duration={4.5} yOffset={40} xOffset={15}>
                <div className="absolute -top-14 right-10 text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.8)] text-4xl">⚽</div>
              </FloatingElement>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );

  // Render via React Portal to document.body to ensure it escapes any overflow: hidden
  if (!mounted) return null;
  return ReactDOM.createPortal(popupContent, document.body);
};
