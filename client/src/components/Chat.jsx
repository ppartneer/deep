import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Settings, Shield, Send, ArrowLeft, Loader2, Lock } from 'lucide-react';
import { toast } from 'sonner';
import { getPrivateKey, saveMessage, getMessagesForChat } from '../services/storageService';
import { encryptMessage, decryptMessage } from '../services/cryptoService';
import { API_URL, WS_URL } from '../config';

export default function Chat() {
  const [ws, setWs] = useState(null);
  const [contacts, setContacts] = useState([]);
  const [activeChat, setActiveChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  const messagesEndRef = useRef(null);
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const token = localStorage.getItem('token');

  useEffect(() => {
    if (!token) {
      navigate('/login');
      return;
    }
    
    // Fetch contacts
    fetchContacts();

    // Setup WS
    const socket = new WebSocket(WS_URL);
    setWs(socket);

    socket.onopen = () => {
      socket.send(JSON.stringify({ type: 'auth', token }));
    };

    socket.onmessage = async (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'auth_success') {
        setIsLoading(false);
      } else if (data.type === 'error') {
        toast.error(data.message);
      } else if (data.type === 'message') {
        handleIncomingMessage(data);
      } else if (data.type === 'ack') {
        // Message sent acknowledgment
        setIsSending(false);
      }
    };

    socket.onclose = () => {
      toast.warning('Связь потеряна. Переподключение...');
      // Implement basic reconnect
      setTimeout(() => window.location.reload(), 3000);
    };

    return () => socket.close();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchContacts = async () => {
    try {
      const res = await fetch(`${API_URL}/auth/contacts`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setContacts(data);
      }
    } catch(e) {}
  };

  const handleIncomingMessage = async (data) => {
    try {
      const myPrivateKey = await getPrivateKey();
      if (!myPrivateKey) throw new Error('Private key not found');

      const text = await decryptMessage(data.encryptedPayload, data.iv, myPrivateKey);
      
      const msgData = {
        id: data.id,
        senderId: data.senderId,
        recipientId: user.id,
        text,
        timestamp: data.timestamp,
        isOutgoing: false
      };

      await saveMessage(msgData);
      
      // Update UI if in this chat
      setActiveChat((prevActiveChat) => {
        if (prevActiveChat && prevActiveChat.id === data.senderId) {
          setMessages(prev => [...prev, msgData]);
        } else {
          // Send internal notification if background push didn't catch it
          toast('Новое сообщение', {
            description: 'Получено зашифрованное послание',
            icon: <Lock className="w-4 h-4 text-accent" />
          });
        }
        return prevActiveChat;
      });

    } catch (e) {
      console.error('Decryption error:', e);
      toast.error('Не удалось расшифровать сообщение');
    }
  };

  const openChat = async (contact) => {
    setActiveChat(contact);
    const msgs = await getMessagesForChat(contact.id);
    setMessages(msgs || []);
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!inputText.trim() || !activeChat || !ws || isSending) return;

    setIsSending(true);
    const textToSend = inputText;
    setInputText('');

    try {
      const { encryptedPayload, iv } = await encryptMessage(textToSend, activeChat.publicKey);

      ws.send(JSON.stringify({
        type: 'message',
        recipientId: activeChat.id,
        encryptedPayload,
        iv
      }));

      const msgData = {
        id: Date.now().toString(),
        senderId: user.id,
        recipientId: activeChat.id,
        text: textToSend,
        timestamp: new Date().toISOString(),
        isOutgoing: true
      };

      await saveMessage(msgData);
      setMessages(prev => [...prev, msgData]);
    } catch(e) {
      console.error(e);
      toast.error('Ошибка шифрования');
      setIsSending(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-deep">
        <Loader2 className="w-10 h-10 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div className="h-[100dvh] flex flex-col md:flex-row bg-deep overflow-hidden">
      {/* Sidebar - hidden on mobile if chat is active */}
      <div className={`w-full md:w-80 border-r border-white/5 flex flex-col bg-surface/50 backdrop-blur-md ${activeChat ? 'hidden md:flex' : 'flex'}`}>
        <div className="p-4 border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-deep flex items-center justify-center border border-white/5 shadow-[0_0_10px_rgba(0,240,255,0.1)]">
              <Shield className="w-4 h-4 text-accent" />
            </div>
            <span className="font-semibold tracking-wider">DEEP</span>
          </div>
          <button onClick={() => navigate('/settings')} className="p-2 hover:bg-white/5 rounded-full transition-colors">
             <Settings className="w-5 h-5 text-textSecondary" />
          </button>
        </div>

        <div className="px-4 py-3 text-xs font-mono text-textSecondary/50 uppercase tracking-widest">
          Контакты
        </div>

        <div className="flex-1 overflow-y-auto">
          {contacts.map(c => (
            <div 
              key={c.id} 
              onClick={() => openChat(c)}
              className={`p-4 cursor-pointer border-l-2 transition-colors ${activeChat?.id === c.id ? 'border-accent bg-white/5' : 'border-transparent hover:bg-white/5'}`}
            >
              <div className="font-medium">{c.name}</div>
              <div className="text-xs text-textSecondary/50 font-mono mt-1">
                ID: {c.id.substring(0,8)}...
              </div>
            </div>
          ))}
          {contacts.length === 0 && (
            <div className="p-4 text-sm text-textSecondary/50 text-center">
              Радар пуст. Никого нет.
            </div>
          )}
        </div>
        
        {user.role === 'admin' && (
          <div className="p-4 border-t border-white/5">
             <button 
                onClick={() => navigate('/admin')}
                className="w-full py-2 bg-white/5 rounded-lg text-sm text-accent hover:bg-white/10 transition-colors"
             >
               СОНАР (Админ)
             </button>
          </div>
        )}
      </div>

      {/* Main Chat Area */}
      <div className={`flex-1 flex flex-col relative ${!activeChat ? 'hidden md:flex' : 'flex'}`}>
        {/* Detail view background */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#050B14] to-[#0A1222] pointer-events-none" />
        
        {activeChat ? (
          <>
            {/* Header */}
            <div className="relative z-10 p-4 bg-surface/80 backdrop-blur-md border-b border-white/5 flex items-center gap-3">
              <button className="md:hidden p-2 -ml-2 text-textSecondary hover:text-white" onClick={() => setActiveChat(null)}>
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <div className="font-semibold flex items-center gap-2">
                  {activeChat.name}
                </div>
                <div className="text-xs text-textSecondary/50 font-mono flex items-center gap-1">
                  <Lock className="w-3 h-3 text-accent" /> E2E Зашифровано
                </div>
              </div>
            </div>

            {/* Messages */}
            <div className="relative z-10 flex-1 overflow-y-auto p-4 space-y-4">
              <AnimatePresence>
                {messages.map((m, idx) => {
                  const isOut = m.isOutgoing;
                  return (
                    <motion.div
                      key={m.id || idx}
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      transition={{ type: "spring", damping: 15 }}
                      className={`flex flex-col ${isOut ? 'items-end' : 'items-start'}`}
                    >
                      <div className={`max-w-[85%] md:max-w-[70%] p-3 rounded-2xl ${isOut ? 'bg-accent/10 border border-accent/20 text-white rounded-tr-sm' : 'bg-surface border border-white/5 text-textSecondary rounded-tl-sm'}`}>
                        <div className="break-words text-sm md:text-base leading-relaxed">
                          {m.text}
                        </div>
                        <div className="mt-1 flex items-center justify-end gap-1 opacity-50">
                          <span className="text-[10px] uppercase">{new Date(m.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                          {!isOut && <Lock className="w-2.5 h-2.5 text-accent" />}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="relative z-10 p-4 bg-surface/80 backdrop-blur-md border-t border-white/5">
              <form onSubmit={sendMessage} className="flex items-center gap-3">
                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="Сообщение..."
                  className="flex-1 bg-deep/50 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-textSecondary/50 focus:outline-none focus:border-accent/40 transition-all font-sans"
                  disabled={isSending}
                />
                <button 
                  type="submit" 
                  disabled={isSending || !inputText.trim()}
                  className="w-12 h-12 bg-accent/10 text-accent rounded-xl flex items-center justify-center hover:bg-accent hover:text-deep transition-all disabled:opacity-50 disabled:cursor-not-allowed border border-accent/20"
                >
                  {isSending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5 ml-1" />}
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="relative z-10 flex-1 flex flex-col items-center justify-center opacity-40">
            <Shield className="w-16 h-16 text-textSecondary mb-4" />
            <div className="text-xl tracking-widest font-mono">ШЛЮЗ ЗАКРЫТ</div>
            <div className="text-sm mt-2">Выберите контакт для начала сеанса</div>
          </div>
        )}
      </div>
    </div>
  );
}
