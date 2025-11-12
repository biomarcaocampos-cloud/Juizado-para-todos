
import React, { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { validateCPF } from '../../utils/cpfValidator';

interface LoginScreenProps {
  onSwitchToRegister: () => void;
  successMessage?: string;
}

const EyeIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
);

const EyeOffIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><line x1="2" x2="22" y1="2" y2="22"/></svg>
);

export const LoginScreen: React.FC<LoginScreenProps> = ({ onSwitchToRegister, successMessage }) => {
  const [cpf, setCpf] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!validateCPF(cpf)) {
        setError('CPF inválido. Verifique o número digitado.');
        return;
    }
    
    setIsLoading(true);
    try {
      await login(cpf, password);
      // On success, the AuthProvider will handle the redirect
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ocorreu um erro desconhecido.');
    } finally {
      setIsLoading(false);
    }
  };
  
  const formatCPF = (value: string) => {
    return value
      .replace(/\D/g, '')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})/, '$1-$2')
      .substring(0, 14);
  };


  return (
    <div className="w-full max-w-md p-8 space-y-8 bg-gray-900 rounded-xl shadow-lg">
      <div className="text-center">
        <h2 className="text-3xl font-extrabold text-white">Acessar Sistema</h2>
        <p className="mt-2 text-gray-400">Juizado Especial Cível de Guarulhos</p>
      </div>
      {successMessage && (
        <div className="p-3 bg-green-900/50 border border-green-700 rounded-md text-center">
            <p className="text-sm text-green-300">{successMessage}</p>
        </div>
      )}
      <form className="mt-8 space-y-6" onSubmit={handleLogin}>
        <div>
          <label htmlFor="cpf" className="block text-sm font-medium text-gray-300">CPF</label>
          <input
            id="cpf"
            name="cpf"
            type="text"
            autoComplete="username"
            required
            value={cpf}
            onChange={(e) => setCpf(formatCPF(e.target.value))}
            className="mt-1 block w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white placeholder-gray-500 focus:outline-none focus:ring-red-500 focus:border-red-500"
            placeholder="000.000.000-00"
          />
        </div>
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-300">Senha</label>
          <div className="relative mt-1">
            <input
              id="password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="block w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white placeholder-gray-500 focus:outline-none focus:ring-red-500 focus:border-red-500 pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-white"
              aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
            >
              {showPassword ? <EyeOffIcon /> : <EyeIcon />}
            </button>
          </div>
        </div>
        {error && <p className="text-sm text-red-400 text-center">{error}</p>}
        <div>
          <button
            type="submit"
            disabled={isLoading}
            className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:bg-gray-500"
          >
            {isLoading ? 'Entrando...' : 'Entrar'}
          </button>
        </div>
      </form>
      <div className="text-center">
        <p className="text-sm text-gray-400">
          Não tem uma conta de atendente?{' '}
          <button onClick={onSwitchToRegister} className="font-medium text-red-400 hover:text-red-300">
            Cadastre-se
          </button>
        </p>
      </div>
    </div>
  );
};
