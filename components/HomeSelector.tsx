import React from 'react';
import { useQueue } from '../hooks/useQueue';
import { useAuth } from '../hooks/useAuth';

interface HomeSelectorProps {
  setView: (view: 'display' | 'dispenser' | 'desk' | 'management') => void;
}

const MonitorIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
    <line x1="8" y1="21" x2="16" y2="21"/>
    <line x1="12" y1="17" x2="12" y2="21"/>
  </svg>
);

const TicketIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 9a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9Z"/>
    <path d="M8 12h.01"/>
    <path d="M12 12h.01"/>
    <path d="M16 12h.01"/>
  </svg>
);

const UserCircleIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <circle cx="12" cy="10" r="3" />
    <path d="M7 20.662V19a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v1.662" />
  </svg>
);

const ChartBarIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="20" x2="12" y2="10" />
    <line x1="18" y1="20" x2="18" y2="4" />
    <line x1="6" y1="20" x2="6" y2="16" />
  </svg>
);

const UserIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-full w-full">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
        <circle cx="12" cy="7" r="4"></circle>
    </svg>
);

const getDisplayName = (fullName: string): string => {
    if (!fullName) return '';
    const names = fullName.trim().split(' ');
    if (names.length === 1) return names[0];
    return `${names[0]} ${names[names.length - 1]}`;
};


export const HomeSelector: React.FC<HomeSelectorProps> = ({ setView }) => {
  const { resetSystem } = useQueue();
  const { currentUser, logout } = useAuth();
  
  const isManager = currentUser?.role === 'MANAGER';

  return (
    <div className="relative flex flex-col items-center justify-center min-h-screen bg-black p-4">
      {currentUser && logout && (
        <div className="absolute top-4 right-4 sm:top-8 sm:right-8 flex items-center gap-4 z-10">
          <div className="text-right">
            <p className="font-semibold text-white">{getDisplayName(currentUser.fullName)}</p>
            <button onClick={logout} className="text-sm text-red-400 hover:underline">Sair</button>
          </div>
          <div className="h-12 w-12 rounded-full bg-gray-700 text-gray-400 overflow-hidden flex items-center justify-center">
            {currentUser.profilePicture ? (
              <img src={currentUser.profilePicture} alt="Foto do perfil" className="h-full w-full object-cover" />
            ) : (
              <UserIcon />
            )}
          </div>
        </div>
      )}

      <div className="text-center mb-12 mt-8">
        <h1 className="text-4xl font-extrabold text-white sm:text-5xl md:text-6xl">
          Sistema de Gestão de Senhas
        </h1>
        <p className="mt-4 text-xl text-gray-400">
          Juizado Especial Cível de Guarulhos
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-6xl">
        <div onClick={() => setView('display')} className="bg-gray-900 p-8 rounded-xl hover:bg-gray-800 transform hover:-translate-y-1 transition-all duration-300 cursor-pointer flex flex-col items-center text-center">
          <MonitorIcon className="w-16 h-16 text-red-500 mb-4" />
          <h2 className="text-2xl font-bold text-white">Tela de Chamadas</h2>
          <p className="text-gray-400 mt-2">Visualizar as senhas que estão sendo chamadas em tempo real.</p>
        </div>
        
        <div onClick={() => setView('dispenser')} className="bg-gray-900 p-8 rounded-xl hover:bg-gray-800 transform hover:-translate-y-1 transition-all duration-300 cursor-pointer flex flex-col items-center text-center">
          <TicketIcon className="w-16 h-16 text-red-500 mb-4" />
          <h2 className="text-2xl font-bold text-white">Emissão de Senhas</h2>
          <p className="text-gray-400 mt-2">Retirar uma nova senha para atendimento normal ou preferencial.</p>
        </div>

        <div onClick={() => setView('desk')} className="bg-gray-900 p-8 rounded-xl hover:bg-gray-800 transform hover:-translate-y-1 transition-all duration-300 cursor-pointer flex flex-col items-center text-center">
          <UserCircleIcon className="w-16 h-16 text-red-500 mb-4" />
          <h2 className="text-2xl font-bold text-white">Mesa de Atendimento</h2>
          <p className="text-gray-400 mt-2">Fazer login para iniciar o atendimento.</p>
        </div>
        
        {isManager && (
            <div onClick={() => setView('management')} className="bg-gray-900 p-8 rounded-xl hover:bg-gray-800 transform hover:-translate-y-1 transition-all duration-300 cursor-pointer flex flex-col items-center text-center">
                <ChartBarIcon className="w-16 h-16 text-red-500 mb-4" />
                <h2 className="text-2xl font-bold text-white">Gerenciamento</h2>
                <p className="text-gray-400 mt-2">Visualizar estatísticas e gerenciar usuários.</p>
            </div>
        )}
      </div>
      
      {isManager && (
        <div className="mt-16">
            <button
            onClick={resetSystem}
            className="bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors shadow-md flex items-center gap-2"
            >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><path d="m21.73 18-8-14a2 2 0 0 0-3.46 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
            Reiniciar Sistema
            </button>
        </div>
      )}
    </div>
  );
};