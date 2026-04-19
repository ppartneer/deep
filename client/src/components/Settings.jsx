import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Settings as SettingsIcon, ShieldAlert, ArrowLeft, Loader2, Key } from 'lucide-react';
import { wipeAllData } from '../services/storageService';
import { API_URL } from '../config';

export default function Settings() {
  const [isConfirming, setIsConfirming] = useState(false);
  const [isWiping, setIsWiping] = useState(false);
  const navigate = useNavigate();
  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  const handleWipe = async () => {
    if (!isConfirming) {
      setIsConfirming(true);
      return;
    }

    setIsWiping(true);
    try {
      if (token) {
        await fetch(`${API_URL}/auth/wipe`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` }
        });
      }
      
      await wipeAllData();
      
      // Navigate to login with query param to trigger special layout/message if needed
      // but just standard redirect is fine too
      navigate('/login?wiped=true');
    } catch (e) {
      console.error(e);
      setIsWiping(false);
    }
  };

  return (
    <div className="min-h-screen bg-deep text-textPrimary flex flex-col items-center">
      <div className="w-full max-w-lg mt-8 p-4">
        
        <div className="flex items-center gap-4 mb-8">
          <button onClick={() => navigate(-1)} className="p-2 bg-surface rounded-full hover:bg-white/10 transition">
            <ArrowLeft className="w-5 h-5 text-white" />
          </button>
          <div className="flex items-center gap-2">
            <SettingsIcon className="w-6 h-6 text-accent" />
            <h1 className="text-xl font-semibold tracking-wide">Панель управления</h1>
          </div>
        </div>

        <div className="bg-surface/80 backdrop-blur-md rounded-2xl border border-white/5 overflow-hidden">
          <div className="p-6 border-b border-white/5">
            <div className="text-sm text-textSecondary uppercase tracking-widest font-mono mb-4">Информация о пользователе</div>
            <div className="space-y-4">
              <div>
                <div className="text-xs text-textSecondary/60 mb-1">Имя</div>
                <div className="font-medium text-lg">{user.name}</div>
              </div>
              <div>
                <div className="text-xs text-textSecondary/60 mb-1 font-mono">ID Узла (Публичный)</div>
                <div className="font-mono text-sm break-all opacity-80 bg-deep/50 p-3 rounded-lg border border-white/5">
                  {user.id}
                </div>
              </div>
              <div className="flex items-center gap-2 mt-4 p-3 bg-accent/5 rounded-lg border border-accent/10">
                <Key className="w-5 h-5 text-accent" />
                <span className="text-sm font-mono text-accent">E2E Ключевая пара сгенерирована</span>
              </div>
            </div>
          </div>

          <div className="p-6 bg-danger/5 relative overflow-hidden">
             {/* Sublayer glow */}
             <div className="absolute inset-0 bg-red-900/10 mix-blend-overlay pointer-events-none" />
             
             <div className="relative z-10">
                <div className="flex items-center gap-2 mb-2 text-danger">
                  <ShieldAlert className="w-5 h-5" />
                  <h2 className="font-semibold uppercase tracking-wide">Ocean Floor Wipe</h2>
                </div>
                <p className="text-sm text-textSecondary/80 mb-6">
                  Это действие необратимо. Текущий физический узел будет стёрт из белого списка. 
                  Все локальные ключи расшифровки и сохраненная история сообщений будут немедленно уничтожены. Следов не останется. Глубина поглотит всё.
                </p>

                <AnimatePresence mode="popLayout">
                  {!isConfirming ? (
                    <motion.button
                      key="btn-1"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      onClick={handleWipe}
                      className="w-full py-3 bg-deep border border-danger/30 text-danger rounded-xl font-semibold hover:bg-danger hover:text-white transition-all tracking-wider uppercase text-sm"
                    >
                      Инициировать стирание
                    </motion.button>
                  ) : (
                    <motion.div
                      key="btn-2"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0 }}
                      className="space-y-3"
                    >
                      <button
                        onClick={handleWipe}
                        disabled={isWiping}
                        className="w-full py-3 bg-danger text-white rounded-xl font-semibold shadow-[0_0_15px_rgba(255,51,102,0.4)] flex justify-center items-center gap-2 hover:bg-red-500 transition-all uppercase tracking-wider text-sm disabled:opacity-50"
                      >
                        {isWiping ? <Loader2 className="w-4 h-4 animate-spin" /> : "ПОДТВЕРДИТЬ УНИЧТОЖЕНИЕ"}
                      </button>
                      <button
                        onClick={() => setIsConfirming(false)}
                        disabled={isWiping}
                        className="w-full py-3 bg-transparent border border-white/10 text-textSecondary rounded-xl font-medium hover:bg-white/5 transition-all uppercase text-sm"
                      >
                        Отмена
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
             </div>
          </div>
        </div>

      </div>
    </div>
  );
}
