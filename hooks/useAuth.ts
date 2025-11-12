import { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { User } from '../types';

// Inferred from usage across the app
interface AuthContextType {
    currentUser: User | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    users: User[];
    login: (cpf: string, password: string) => Promise<void>;
    logout: () => void;
    register: (data: {
        fullName: string;
        cpf: string;
        password: string;
        profilePicture: string | null;
    }) => Promise<void>;
    createUser: (userData: Partial<User>) => Promise<void>;
    updateUser: (user: User) => Promise<void>;
    toggleUserStatus: (userId: string) => Promise<void>;
    resetPassword: (userId: string) => Promise<void>;
}


export const useAuth = () => {
  const context = useContext(AuthContext) as AuthContextType;
  // If the context was created with `createContext({})`, the check for undefined might not be enough.
  // We check for a function that should be on the context to see if we are inside a provider.
  if (!context || !context.login) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
