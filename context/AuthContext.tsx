import React, { createContext, useState, useEffect, ReactNode } from 'react';
import { storageService } from '../services/storageService';
import { User, ActivityLog } from '../types';
import { validateCPF } from '../utils/cpfValidator';

// Simple base64 "hashing" for demonstration purposes.
// In a real-world application, a robust library like bcrypt should be used.
const hashPassword = (password: string) => btoa(password);
const verifyPassword = (password: string, hash: string) => btoa(password) === hash;

const MASTER_CPF = '169.914.338-29';
const MASTER_PASS = '123';

const createMasterUser = (): User => {
    const passwordHash = hashPassword(MASTER_PASS);
    return {
        id: MASTER_CPF.replace(/\D/g, ''),
        cpf: MASTER_CPF,
        fullName: 'Master Manager',
        passwordHash,
        role: 'MANAGER',
        isActive: true,
        profilePicture: null,
        createdAt: Date.now(),
        history: {
            statusChanges: [{ timestamp: Date.now(), active: true, changedBy: 'system', changedByName: 'Sistema' }],
            passwordResets: [],
        },
    };
};

const getDisplayName = (fullName: string): string => {
    if (!fullName) return '';
    const names = fullName.trim().split(' ');
    if (names.length === 1) return names[0];
    return `${names[0]} ${names[names.length - 1]}`;
};

// The context is initialized with an empty object. The useAuth hook provides type safety and proper context access.
export const AuthContext = createContext({});

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [users, setUsers] = useState<User[]>([]);
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        setIsLoading(true);
        let allUsers = storageService.getUsers();
        if (allUsers.length === 0 || !allUsers.some(u => u.cpf === MASTER_CPF)) {
            const masterUser = createMasterUser();
            // Ensure master user isn't duplicated if it was just missing
            const otherUsers = allUsers.filter(u => u.cpf !== MASTER_CPF);
            allUsers = [masterUser, ...otherUsers];
            storageService.saveUsers(allUsers);
        }
        setUsers(allUsers);

        const loggedInUserId = sessionStorage.getItem('loggedInUserId');
        if (loggedInUserId) {
            const user = allUsers.find(u => u.id === loggedInUserId);
            if (user && user.isActive) {
                setCurrentUser(user);
            } else {
                sessionStorage.removeItem('loggedInUserId');
            }
        }
        setIsLoading(false);
    }, []);
    
    const logActivity = (type: 'LOGIN' | 'LOGOUT', user: User) => {
        const logs = storageService.getActivityLogs();
        if (type === 'LOGIN') {
            const newLog: ActivityLog = {
                id: `${user.id}-${Date.now()}`,
                userId: user.id,
                userName: getDisplayName(user.fullName),
                timestamp: Date.now(),
                type: 'LOGIN',
            };
            storageService.saveActivityLogs([...logs, newLog]);
        } else if (type === 'LOGOUT') {
            const lastLogin = [...logs].reverse().find(l => l.userId === user.id && l.type === 'LOGIN' && !l.duration);
            if (lastLogin) {
                lastLogin.duration = Date.now() - lastLogin.timestamp;
                storageService.saveActivityLogs(logs);
            }
        }
    };

    const login = async (cpf: string, password: string): Promise<void> => {
        const user = users.find(u => u.cpf.replace(/\D/g, '') === cpf.replace(/\D/g, ''));
        if (!user) {
            throw new Error('CPF não encontrado.');
        }
        if (!user.isActive) {
            throw new Error('Este usuário está desativado.');
        }
        if (!verifyPassword(password, user.passwordHash)) {
            throw new Error('Senha incorreta.');
        }
        setCurrentUser(user);
        sessionStorage.setItem('loggedInUserId', user.id);
        logActivity('LOGIN', user);
    };

    const logout = () => {
        if(currentUser) {
            logActivity('LOGOUT', currentUser);
        }
        setCurrentUser(null);
        sessionStorage.removeItem('loggedInUserId');
    };

    const register = async (data: { fullName: string; cpf: string; password: string; profilePicture: string | null; }): Promise<void> => {
        if (!validateCPF(data.cpf)) {
            throw new Error('CPF inválido.');
        }
        const cleanCpf = data.cpf.replace(/\D/g, '');
        if (users.some(u => u.cpf.replace(/\D/g, '') === cleanCpf)) {
            throw new Error('CPF já cadastrado.');
        }
        const newUser: User = {
            id: cleanCpf,
            cpf: data.cpf,
            fullName: data.fullName,
            passwordHash: hashPassword(data.password),
            role: 'ATTENDANT',
            isActive: true,
            profilePicture: data.profilePicture,
            createdAt: Date.now(),
            history: {
                statusChanges: [{ timestamp: Date.now(), active: true, changedBy: 'self', changedByName: 'Cadastro Próprio' }],
                passwordResets: [],
            },
        };
        setUsers(prevUsers => {
            const updatedUsers = [...prevUsers, newUser];
            storageService.saveUsers(updatedUsers);
            return updatedUsers;
        });
    };
    
    const createUser = async (userData: Partial<User> & { password?: string }): Promise<void> => {
        if (!currentUser || currentUser.role !== 'MANAGER') throw new Error("Apenas gestores podem criar usuários.");
        if (!userData.cpf || !userData.password || !userData.fullName) throw new Error("CPF, Nome e Senha são obrigatórios.");

        if (!validateCPF(userData.cpf)) {
            throw new Error("CPF inválido.");
        }
        
        const cleanCpf = userData.cpf.replace(/\D/g, '');
        
        setUsers(prevUsers => {
            if (prevUsers.some(u => u.id === cleanCpf)) throw new Error("CPF já cadastrado.");

            const newUser: User = {
                id: cleanCpf,
                cpf: userData.cpf!,
                fullName: userData.fullName!,
                passwordHash: hashPassword(userData.password!),
                role: userData.role || 'MANAGER',
                isActive: true,
                profilePicture: userData.profilePicture || null,
                createdAt: Date.now(),
                history: {
                    statusChanges: [{ timestamp: Date.now(), active: true, changedBy: currentUser.id, changedByName: getDisplayName(currentUser.fullName) }],
                    passwordResets: [],
                },
            };
            const updatedUsers = [...prevUsers, newUser];
            storageService.saveUsers(updatedUsers);
            return updatedUsers;
        });
    };
    
    const updateUser = async (updatedUserWithChanges: Partial<User> & { password?: string }): Promise<void> => {
        if (!currentUser || currentUser.role !== 'MANAGER') throw new Error("Apenas gestores podem editar usuários.");
        if (!updatedUserWithChanges.id) throw new Error("ID de usuário ausente para atualização.");

        setUsers(prevUsers => {
            const userIndex = prevUsers.findIndex(u => u.id === updatedUserWithChanges.id);
            if (userIndex === -1) {
                console.error("Usuário não encontrado para atualizar.");
                return prevUsers;
            }

            const originalUser = prevUsers[userIndex];
            const updatedUser = {...originalUser, ...updatedUserWithChanges};
            
            if(updatedUserWithChanges.password) {
                updatedUser.passwordHash = hashPassword(updatedUserWithChanges.password);
            }

            const updatedUsers = [...prevUsers];
            updatedUsers[userIndex] = updatedUser;
            storageService.saveUsers(updatedUsers);

            if (currentUser?.id === updatedUser.id) {
                setCurrentUser(updatedUser);
            }

            return updatedUsers;
        });
    };

    const toggleUserStatus = async (userId: string): Promise<void> => {
        if (!currentUser || currentUser.role !== 'MANAGER') {
            throw new Error("Apenas gestores podem alterar status.");
        }
    
        if (userId === currentUser.id) {
            throw new Error("Você não pode desativar a si mesmo.");
        }
    
        setUsers(prevUsers => {
            const newUsers = prevUsers.map(user => {
                if (user.id === userId) {
                    const newIsActiveState = !user.isActive;
                    return {
                        ...user,
                        isActive: newIsActiveState,
                        history: {
                            ...user.history,
                            statusChanges: [
                                ...user.history.statusChanges,
                                {
                                    timestamp: Date.now(),
                                    active: newIsActiveState,
                                    changedBy: currentUser.id,
                                    changedByName: getDisplayName(currentUser.fullName),
                                }
                            ]
                        }
                    };
                }
                return user;
            });
            storageService.saveUsers(newUsers);
            return newUsers;
        });
    };
    
    const resetPassword = async (userId: string): Promise<void> => {
        if (!currentUser || currentUser.role !== 'MANAGER') {
            throw new Error("Apenas gestores podem resetar senhas.");
        }

        if (userId === currentUser.id) {
            throw new Error("Você não pode resetar sua própria senha.");
        }
    
        setUsers(prevUsers => {
             const newUsers = prevUsers.map(user => {
                if (user.id === userId) {
                    const newPassword = user.cpf.replace(/\D/g, '');
                    return {
                        ...user,
                        passwordHash: hashPassword(newPassword),
                        history: {
                            ...user.history,
                            passwordResets: [
                                ...user.history.passwordResets,
                                {
                                    timestamp: Date.now(),
                                    changedBy: currentUser.id,
                                    changedByName: getDisplayName(currentUser.fullName),
                                }
                            ]
                        }
                    };
                }
                return user;
            });
            storageService.saveUsers(newUsers);
            return newUsers;
        });
    };

    const value = {
        currentUser,
        isAuthenticated: !!currentUser,
        isLoading,
        users,
        login,
        logout,
        register,
        createUser,
        updateUser,
        toggleUserStatus,
        resetPassword
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};