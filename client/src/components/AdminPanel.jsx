import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Activity, ShieldCheck, ArrowLeft, Loader2, Plus, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { API_URL } from '../config';

export default function AdminPanel() {
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState('');
  
  const navigate = useNavigate();
  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  useEffect(() => {
    if (user.role !== 'admin') {
      navigate('/');
      return;
    }
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`${API_URL}/admin/users`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
      }
    } catch(e) {
      toast.error('Ошибка загрузки сонара');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddCode = async (e) => {
    e.preventDefault();
    if (!newName.trim()) return;
    
    setIsAdding(true);
    try {
      const res = await fetch(`${API_URL}/admin/add-code`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({ name: newName })
      });
      
      const data = await res.json();
      if (res.ok) {
        // Show the new code immediately, admin needs to copy it
        toast.success(
          <div className="flex flex-col gap-2">
            <div>Код успешно сгенерирован:</div>
            <div className="bg-deep/50 p-2 rounded border border-white/10 font-mono text-xs break-all selectable">
              {data.code}
            </div>
            <div className="text-xs text-textSecondary">Обязательно скопируйте его, он больше не отобразится.</div>
          </div>,
          { duration: 15000 }
        );
        setNewName('');
        fetchUsers();
      } else {
        toast.error(data.error);
      }
    } catch(e) {
      toast.error('Ошибка создания кода');
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <div className="min-h-screen bg-deep text-textPrimary flex flex-col items-center">
      <div className="w-full max-w-4xl mt-8 p-4">
        
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate('/')} className="p-2 bg-surface rounded-full hover:bg-white/10 transition">
              <ArrowLeft className="w-5 h-5 text-white" />
            </button>
            <div className="flex items-center gap-2 text-accent">
              <Activity className="w-6 h-6" />
              <h1 className="text-xl font-semibold tracking-widest uppercase">СОНАР (Контроль доступа)</h1>
            </div>
          </div>
          <button onClick={fetchUsers} disabled={isLoading} className="p-2 bg-surface rounded-full hover:bg-white/10 transition disabled:opacity-50">
            <RefreshCw className={`w-5 h-5 text-textSecondary ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* New Code Generator */}
          <div className="md:col-span-1">
            <div className="bg-surface/80 backdrop-blur-md rounded-2xl p-6 border border-white/5 sticky top-8">
              <h2 className="text-sm uppercase tracking-widest font-mono text-textSecondary mb-4">Генерация ключа</h2>
              <form onSubmit={handleAddCode} className="space-y-4">
                <div>
                  <input
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="Позывной / Имя"
                    className="w-full bg-deep/50 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-textSecondary/50 focus:outline-none focus:border-accent/40 font-sans"
                    disabled={isLoading || isAdding}
                  />
                </div>
                <button
                  type="submit"
                  disabled={isLoading || isAdding || !newName.trim()}
                  className="w-full py-3 bg-accent/10 border border-accent/20 text-accent rounded-xl font-semibold hover:bg-accent hover:text-deep transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isAdding ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
                  СОЗДАТЬ
                </button>
              </form>
            </div>
          </div>

          {/* Users List */}
          <div className="md:col-span-2 space-y-4">
            {isLoading && users.length === 0 ? (
              <div className="flex justify-center p-8">
                <Loader2 className="w-8 h-8 animate-spin text-accent" />
              </div>
            ) : (
              users.map(u => (
                <div key={u.id} className="bg-surface/60 backdrop-blur-sm p-4 rounded-xl border border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all hover:bg-surface">
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${u.hasKey ? 'bg-accent shadow-[0_0_8px_rgba(0,240,255,0.8)]' : 'bg-textSecondary/30'}`} title={u.hasKey ? "E2EE ключ загружен" : "Ключ не инициализирован"} />
                    <div>
                      <div className="font-semibold flex items-center gap-2">
                        {u.name}
                        {u.role === 'admin' && <ShieldCheck className="w-4 h-4 text-accent" />}
                      </div>
                      <div className="text-xs font-mono text-textSecondary/60 mt-1">ID: {u.id}</div>
                    </div>
                  </div>
                  <div className="text-right flex flex-row sm:flex-col items-center sm:items-end justify-between sm:justify-center">
                     <div className="text-xs text-textSecondary bg-deep px-2 py-1 rounded-md border border-white/5 inline-block">
                       Добавлен: {new Date(u.createdAt).toLocaleDateString()}
                     </div>
                  </div>
                </div>
              ))
            )}
            {!isLoading && users.length === 0 && (
              <div className="text-center p-8 text-textSecondary/50 border border-dashed border-white/10 rounded-xl">
                 Эхолот не обнаружил сигналов.
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
