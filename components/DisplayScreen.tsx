import React, { useEffect, useState } from 'react';
import { useQueue } from '../hooks/useQueue';
import { useAuth } from '../hooks/useAuth';
import { Header } from './Header';
import { CalledTicket } from '../types';

// --- Audio Generation ---

let audioContext: AudioContext | null = null;
const initAudioContext = (): AudioContext | null => {
  if (audioContext) return audioContext;
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    audioContext = new AudioContext();
    return audioContext;
  } catch (e) {
    console.error("Web Audio API is not supported in this browser");
    return null;
  }
};

const playListUpdateSound = (ctx: AudioContext) => {
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    oscillator.type = 'triangle';
    oscillator.frequency.setValueAtTime(220, ctx.currentTime);
    gainNode.gain.setValueAtTime(0, ctx.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.2, ctx.currentTime + 0.02);
    gainNode.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.1);
    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.1);
};

const playTicketCallSound = (type: 'NORMAL' | 'PREFERENCIAL') => {
  const ctx = initAudioContext();
  if (!ctx || ctx.state !== 'running') return;
  const oscillator = ctx.createOscillator();
  const gainNode = ctx.createGain();
  oscillator.connect(gainNode);
  gainNode.connect(ctx.destination);
  gainNode.gain.setValueAtTime(0, ctx.currentTime);
  gainNode.gain.linearRampToValueAtTime(0.4, ctx.currentTime + 0.05);
  if (type === 'PREFERENCIAL') {
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(880, ctx.currentTime);
    oscillator.frequency.setValueAtTime(1046.50, ctx.currentTime + 0.15);
    gainNode.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.3);
    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.3);
    setTimeout(() => playListUpdateSound(ctx), 350);
  } else {
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(659.25, ctx.currentTime);
    gainNode.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.2);
    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.2);
    setTimeout(() => playListUpdateSound(ctx), 250);
  }
};

const getDisplayName = (fullName: string): string => {
    if (!fullName) return '';
    const names = fullName.trim().split(' ');
    if (names.length === 1) return names[0];
    return `${names[0]} ${names[names.length - 1]}`;
};

interface DisplayScreenProps {
  setView: (view: 'home' | 'display' | 'dispenser' | 'desk' | 'management') => void;
}

export const DisplayScreen: React.FC<DisplayScreenProps> = ({ setView }) => {
  const { state } = useQueue();
  const { currentUser, logout } = useAuth();
  const { calledHistory, tips, alertMessage } = state;

  const [latestTicket, setLatestTicket] = useState<CalledTicket | null>(null);
  const [showBlink, setShowBlink] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [isHeaderVisible, setIsHeaderVisible] = useState(false);
  const [tipIndex, setTipIndex] = useState(0);
  const [tipAnimation, setTipAnimation] = useState(true);

  const handleEnableAudio = () => {
    const ctx = initAudioContext();
    if (ctx) {
      if (ctx.state === 'suspended') {
        ctx.resume().then(() => setAudioEnabled(true));
      } else if (ctx.state === 'running') {
        setAudioEnabled(true);
      }
    }
  };

  useEffect(() => {
    if (calledHistory.length > 0) {
      if (!latestTicket || calledHistory[0].timestamp !== latestTicket.timestamp) {
        const newTicket = calledHistory[0];
        setLatestTicket(newTicket);
        if (audioEnabled) playTicketCallSound(newTicket.type);
        setShowBlink(true);
        const timer = setTimeout(() => setShowBlink(false), 3000);
        return () => clearTimeout(timer);
      }
    } else {
      setLatestTicket(null);
    }
  }, [calledHistory, latestTicket, audioEnabled]);

  useEffect(() => {
    if (alertMessage) return;
    const interval = setInterval(() => {
      setTipAnimation(false);
      setTimeout(() => {
        setTipIndex((prevIndex) => (prevIndex + 1) % (tips.length || 1));
        setTipAnimation(true);
      }, 500);
    }, 10000);
    return () => clearInterval(interval);
  }, [tips, alertMessage]);

  const olderCalledTickets = calledHistory.slice(1, 5);

  return (
    <div className="relative flex flex-col h-screen bg-black text-white overflow-hidden">
      <button
        onClick={() => setIsHeaderVisible(!isHeaderVisible)}
        className="absolute top-4 right-4 z-30 p-2 bg-gray-800/70 rounded-full hover:bg-gray-700 transition-colors"
        aria-label="Mostrar/Ocultar Cabeçalho"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6 text-white"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
      </button>

      {isHeaderVisible && (
        <div className="absolute top-0 left-0 right-0 z-20">
          <nav className="bg-gray-900 p-2">
            <button onClick={() => setView('home')} className="text-red-400 hover:text-red-300 font-semibold">
              &larr; Voltar à Tela Principal
            </button>
          </nav>
          <Header
            title="Painel de Atendimento"
            subtitle="Visualização de senhas em tempo real"
            user={currentUser ? { displayName: getDisplayName(currentUser.fullName), profilePicture: currentUser.profilePicture } : null}
            onLogout={logout}
          />
        </div>
      )}

      {!audioEnabled && (
        <div className="absolute top-4 left-4 z-10">
          <button onClick={handleEnableAudio} className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg transition-colors shadow-lg" aria-label="Ativar alertas sonoros">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon></svg>
            Ativar Som
          </button>
        </div>
      )}

      {/* Section 1: Current Ticket */}
      <div className="flex-[2] flex flex-col justify-center items-center p-4 border-b-2 border-gray-800 bg-gray-900">
        <div className={`w-full transition-all duration-500 text-center ${showBlink ? 'animate-pulse' : ''}`}>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-3xl lg:text-4xl text-gray-400 font-semibold uppercase">Senha</p>
              <p className="text-8xl lg:text-9xl leading-none font-mono font-bold text-white mt-4">
                {latestTicket ? latestTicket.ticketNumber : '----'}
              </p>
            </div>
            <div>
              <p className="text-3xl lg:text-4xl text-gray-400 font-semibold uppercase">Mesa</p>
              <p className="text-8xl lg:text-9xl leading-none font-mono font-bold text-white mt-4">
                {latestTicket ? String(latestTicket.deskNumber).padStart(2, '0') : '--'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Section 2: History */}
      <div className="flex-[3] flex flex-col justify-center items-center p-4 border-b-2 border-gray-800">
        <h2 className="text-3xl font-bold text-center text-gray-400 mb-4 uppercase">Últimas Chamadas</h2>
        <div className="w-full max-w-4xl px-2">
            {olderCalledTickets.length > 0 ? (
                <div className="grid grid-cols-2 gap-4">
                    {olderCalledTickets.map((ticket) => (
                    <div key={ticket.timestamp} className="grid grid-cols-2 text-center p-3 text-4xl lg:text-5xl font-mono bg-gray-800 rounded-md">
                        <div className="text-gray-200">{ticket.ticketNumber}</div>
                        <div className="text-gray-200">{String(ticket.deskNumber).padStart(2, '0')}</div>
                    </div>
                    ))}
                </div>
            ) : (
                <div className="text-center p-8 text-gray-500">Nenhuma senha chamada anteriormente.</div>
            )}
        </div>
      </div>

      {/* Section 3: Messages */}
      {alertMessage ? (
        <div className="flex-[1] bg-yellow-500 flex flex-col items-center justify-center p-6 animate-pulse">
          <h2 className="text-3xl font-bold text-black mb-4 uppercase tracking-wider">Alerta</h2>
          <div className="text-center flex items-center justify-center">
            <p className="text-3xl lg:text-4xl text-black font-semibold px-4">{alertMessage}</p>
          </div>
        </div>
      ) : (
        <div className="flex-[1] bg-gray-800 flex flex-col items-center justify-center p-6">
          <h2 className="text-3xl font-bold text-red-400 mb-4 uppercase tracking-wider">Informações Úteis</h2>
          <div className="text-center flex items-center justify-center">
            <p className={`text-2xl lg:text-3xl text-white transition-opacity duration-500 ease-in-out px-4 ${tipAnimation ? 'opacity-100' : 'opacity-0'}`}>
              {tips[tipIndex]}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};