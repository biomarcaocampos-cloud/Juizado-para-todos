import React from 'react';

const UserIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-full w-full">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
        <circle cx="12" cy="7" r="4"></circle>
    </svg>
);

const HomeIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-8 w-8">
        <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
        <polyline points="9 22 9 12 15 12 15 22"></polyline>
    </svg>
);


interface HeaderProps {
    title: string;
    subtitle: string;
    user?: {
        displayName: string;
        profilePicture: string | null;
    } | null;
    onLogout?: () => void;
    onHomeClick?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ title, subtitle, user, onLogout, onHomeClick }) => {
  return (
    <header className="bg-gray-900">
      <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8 flex justify-between items-center">
        <div className="text-left">
            <h1 className="text-2xl font-bold leading-tight text-white">
            {title}
            </h1>
            <p className="text-md text-gray-300 mt-1">{subtitle}</p>
        </div>

        <div className="flex items-center gap-4">
            {onHomeClick && (
                <button onClick={onHomeClick} className="text-red-500 p-2 rounded-full hover:bg-gray-700 hover:text-red-400 transition-colors" title="Voltar à Tela Principal">
                    <HomeIcon />
                </button>
            )}
            {user && onLogout && (
                <>
                    <div className="text-right">
                        <p className="font-semibold text-white">{user.displayName}</p>
                        <button onClick={onLogout} className="text-sm text-red-400 hover:underline">Sair</button>
                    </div>
                    <div className="h-12 w-12 rounded-full bg-gray-700 text-gray-400 overflow-hidden flex items-center justify-center">
                        {user.profilePicture ? (
                            <img src={user.profilePicture} alt="Foto do perfil" className="h-full w-full object-cover" />
                        ) : (
                            <UserIcon />
                        )}
                    </div>
                </>
            )}
        </div>
      </div>
    </header>
  );
};