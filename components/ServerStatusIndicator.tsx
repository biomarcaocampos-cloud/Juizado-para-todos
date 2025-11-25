import React, { useState, useEffect } from 'react';

interface ServerStatusIndicatorProps {
  onStatusChange: (isOnline: boolean) => void;
}

const SERVER_URL = 'http://localhost:3001/api/status';

export const ServerStatusIndicator: React.FC<ServerStatusIndicatorProps> = ({ onStatusChange }) => {
  const [status, setStatus] = useState<'connecting' | 'online' | 'offline'>('connecting');
  const [serverMode, setServerMode] = useState<'database' | 'local' | null>(null);

  useEffect(() => {
    const checkStatus = async () => {
      try {
        // Use AbortController for fetch timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000); // 3-second timeout
        
        const response = await fetch(SERVER_URL, { 
            method: 'GET', 
            signal: controller.signal 
        });

        clearTimeout(timeoutId);

        const data = await response.json();

        if (response.ok && data.status === 'online') {
          if (status !== 'online') {
            setStatus('online');
            setServerMode(data.mode);
            onStatusChange(true);
          }
        } else {
          throw new Error('Server not OK or invalid status');
        }
      } catch (error) {
        if (status !== 'offline') {
            setStatus('offline');
            setServerMode(null);
            // We set online to TRUE even if offline, to allow the "Local Mode" buttons to work.
            // The queue context now handles local generation.
            onStatusChange(true); 
        }
      }
    };

    checkStatus(); // Check immediately on mount
    const intervalId = setInterval(checkStatus, 5000); // Check every 5 seconds

    return () => clearInterval(intervalId);
  }, [onStatusChange, status]);

  const getStatusInfo = () => {
      switch(status) {
          case 'connecting': return { color: 'bg-yellow-500', text: 'Conectando...' };
          case 'online': return { color: 'bg-green-500', text: serverMode === 'database' ? 'Servidor Conectado (Banco)' : 'Servidor Online (Memória)' };
          case 'offline': return { color: 'bg-orange-500', text: 'Modo Local (Servidor Offline)' };
      }
  };
  
  const info = getStatusInfo();
  const pulseClass = status === 'connecting' ? 'animate-pulse' : '';

  return (
    <div className="flex items-center justify-center gap-2 mt-4 text-sm bg-gray-800/50 py-1 px-3 rounded-full inline-flex mx-auto">
      <div className={`w-3 h-3 rounded-full ${info.color} ${pulseClass}`} />
      <span className="text-gray-400">{info.text}</span>
    </div>
  );
};