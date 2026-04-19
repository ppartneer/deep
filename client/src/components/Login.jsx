import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { generateKeyPair, exportPublicKey } from '../services/cryptoService';
import { savePrivateKey } from '../services/storageService';
import { Shield, Loader2 } from 'lucide-react';
import { API_URL } from '../config';

export default function Login() {
  const [code, setCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!code) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const res = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code })
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      localStorage.setItem('vapidPublicKey', data.vapidPublicKey);

      // Generate E2EE keys if none exist on server
      if (!data.user.publicKey) {
        const keyPair = await generateKeyPair();
        const publicKeyBase64 = await exportPublicKey(keyPair.publicKey);
        
        await savePrivateKey(keyPair.privateKey);
        
        // Upload public key to server
        await fetch(`${API_URL}/auth/public-key`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${data.token}`
          },
          body: JSON.stringify({ publicKey: publicKeyBase64 })
        });
        
        const updatedUser = { ...data.user, publicKey: publicKeyBase64 };
        localStorage.setItem('user', JSON.stringify(updatedUser));
      }

      // Check Notification permissions
      if ('serviceWorker' in navigator && 'PushManager' in window) {
        try {
          const reg = await navigator.serviceWorker.register('/sw.js');
          const permission = await Notification.requestPermission();
          
          if (permission === 'granted') {
            const subscription = await reg.pushManager.subscribe({
              userVisibleOnly: true,
              applicationServerKey: data.vapidPublicKey
            });
            
            await fetch(`${API_URL}/auth/subscribe`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${data.token}`
              },
              body: JSON.stringify(subscription)
            });
          }
        } catch(e) {
          console.error("SW Registration failed:", e);
        }
      }

      navigate('/');
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[100dvh] flex items-center justify-center relative bg-deep">
      {/* Background element for depth */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#050B14] to-[#0A1222] pointer-events-none" />
      <div className="absolute inset-x-0 bottom-0 h-64 bg-accent opacity-[0.02] blur-3xl pointer-events-none" />

      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ type: "spring", damping: 15, stiffness: 100 }}
          className="relative z-10 w-full max-w-sm px-6"
        >
          <div className="bg-surface/80 backdrop-blur-md rounded-2xl p-8 shadow-2xl border border-white/5 relative overflow-hidden">
            {/* Subtle highlight line */}
            <div className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-accent/50 to-transparent" />
            
            <motion.div 
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", damping: 12 }}
              className="flex justify-center mb-8"
            >
              <div className="w-16 h-16 rounded-full bg-deep flex items-center justify-center shadow-inner border border-white/5 relative">
                 {/* Inner glow */}
                 <div className="absolute inset-0 rounded-full shadow-[0_0_15px_rgba(0,240,255,0.2)]" />
                 <Shield className="w-8 h-8 text-accent relative z-10" />
              </div>
            </motion.div>

            <h1 className="text-2xl font-semibold text-center mb-2 tracking-wide text-white">DEEP</h1>
            <p className="text-textSecondary text-center mb-8 text-sm opacity-80">Сейф на дне океана</p>

            <form onSubmit={handleLogin} className="space-y-6">
              <div>
                <input
                  type="password"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="Код доступа"
                  disabled={isLoading}
                  className="w-full bg-deep/50 border border-white/10 rounded-xl px-4 py-3 text-center text-white placeholder-textSecondary/50 focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/50 transition-all font-mono tracking-widest disabled:opacity-50"
                  autoComplete="off"
                />
              </div>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                disabled={isLoading || !code}
                className="w-full py-3 bg-accent text-deep font-semibold rounded-xl tracking-wide transition-all shadow-[0_0_15px_rgba(0,240,255,0.3)] hover:shadow-[0_0_25px_rgba(0,240,255,0.5)] flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                type="submit"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" /> 
                    <span>Погружение...</span>
                  </>
                ) : (
                  "Открыть шлюз"
                )}
              </motion.button>
            </form>

            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-4 text-center"
                >
                  <p className="text-danger text-sm font-medium bg-danger/10 py-2 rounded-lg border border-danger/20">
                    {error}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
