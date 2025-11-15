import React, { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { User, UserRole } from '../../types';
import { ProfilePictureInput } from '../auth/ProfilePictureInput';
import { validateCPF } from '../../utils/cpfValidator';

const getDisplayName = (fullName: string): string => {
    if (!fullName) return '';
    const names = fullName.trim().split(' ');
    if (names.length === 1) return names[0];
    return `${names[0]} ${names[names.length - 1]}`;
};

const UserIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-full w-full">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
        <circle cx="12" cy="7" r="4"></circle>
    </svg>
);

const EyeIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
);

const EyeOffIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><line x1="2" x2="22" y1="2" y2="22"/></svg>
);

const UserModal: React.FC<{ user: User | null, onClose: () => void, onSave: (user: Partial<User>) => Promise<void> }> = ({ user, onClose, onSave }) => {
    const { currentUser, toggleUserStatus, resetPassword } = useAuth();
    const [formData, setFormData] = useState({
        fullName: user?.fullName || '',
        cpf: user?.cpf || '',
        password: '',
        role: user?.role || 'ATTENDANT',
        profilePicture: user?.profilePicture || null,
        id: user?.id || ''
    });
    const [isLoading, setIsLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const isNewUser = !user;
    const isSelf = currentUser?.id === user?.id;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (isNewUser && !validateCPF(formData.cpf)) {
            alert('CPF inválido. Por favor, verifique o número.');
            return;
        }

        setIsLoading(true);
        try {
            await onSave(formData);
            onClose();
        } catch(err) {
            alert(err instanceof Error ? err.message : 'Erro desconhecido');
        } finally {
            setIsLoading(false);
        }
    };

    const handleToggleStatus = async () => {
        if (!user) return;
        const action = user.isActive ? 'desativar' : 'ativar';
        const actionPastTense = user.isActive ? 'desativado' : 'ativado';
        if (window.confirm(`Tem certeza que deseja ${action} o usuário ${getDisplayName(user.fullName)}?`)) {
            try {
                await toggleUserStatus(user.id);
                alert(`Usuário ${actionPastTense} com sucesso!`);
                onClose();
            } catch (error) {
                alert(`Erro ao ${action} usuário: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
            }
        }
    };

    const handleResetPasswordToCpf = async () => {
        if (!user) return;
        if (window.confirm(`Tem certeza que deseja resetar a senha de ${getDisplayName(user.fullName)}? A nova senha será o CPF do usuário (apenas números).`)) {
            try {
                await resetPassword(user.id);
                onClose();
            } catch (error) {
                alert(`Erro ao resetar senha: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
            }
        }
    };
    
    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex justify-center items-center z-50 p-4">
            <div className="bg-gray-800 text-white rounded-xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
                <form onSubmit={handleSave}>
                    <div className="p-6">
                        <h3 className="text-xl font-bold mb-6">{isNewUser ? 'Criar Novo Usuário' : 'Editar Usuário'}</h3>
                        <div className="space-y-4">
                            <ProfilePictureInput initialImage={formData.profilePicture} onPictureChange={(pic) => setFormData(p => ({...p, profilePicture: pic}))} />
                             <div>
                                <label className="text-sm font-bold text-gray-400">Nome Completo</label>
                                <input type="text" name="fullName" value={formData.fullName} onChange={handleChange} required className="w-full mt-1 bg-gray-700 p-2 rounded-md"/>
                            </div>
                            <div>
                                <label className="text-sm font-bold text-gray-400">CPF</label>
                                <input type="text" name="cpf" value={formData.cpf} onChange={handleChange} required disabled={!isNewUser} className="w-full mt-1 bg-gray-700 p-2 rounded-md disabled:opacity-50"/>
                            </div>
                             <div>
                                <label className="text-sm font-bold text-gray-400">Nova Senha</label>
                                <div className="relative mt-1">
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        name="password"
                                        value={formData.password}
                                        onChange={handleChange}
                                        placeholder={isNewUser ? 'Obrigatório' : 'Deixe em branco para não alterar'}
                                        required={isNewUser}
                                        className="w-full bg-gray-700 p-2 rounded-md pr-10"
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
                             <div>
                                <label className="text-sm font-bold text-gray-400">Função</label>
                                <select name="role" value={formData.role} onChange={handleChange} disabled={isSelf} className="w-full mt-1 bg-gray-700 p-2 rounded-md disabled:opacity-50 disabled:cursor-not-allowed">
                                    <option value="ATTENDANT">Atendente</option>
                                    <option value="MANAGER">Gestor</option>
                                </select>
                            </div>
                        </div>
                    </div>
                    <div className="bg-gray-700 p-4 flex justify-between items-center rounded-b-xl">
                        <div>
                            {!isNewUser && !isSelf && user && (
                                <div className="flex gap-2">
                                    <button 
                                        type="button" 
                                        onClick={handleToggleStatus}
                                        className={`py-2 px-4 rounded-md font-semibold text-sm text-white ${user.isActive ? 'bg-yellow-600 hover:bg-yellow-700' : 'bg-green-600 hover:bg-green-700'}`}
                                    >
                                        {user.isActive ? 'Desativar' : 'Ativar'}
                                    </button>
                                    <button 
                                        type="button"
                                        onClick={handleResetPasswordToCpf}
                                        className="py-2 px-4 rounded-md font-semibold text-sm text-white bg-blue-600 hover:bg-blue-700"
                                    >
                                        Resetar Senha
                                    </button>
                                </div>
                            )}
                        </div>
                        <div className="flex gap-4">
                            <button type="button" onClick={onClose} className="py-2 px-4 rounded-md text-white">Cancelar</button>
                            <button type="submit" disabled={isLoading} className="bg-red-600 hover:bg-red-700 py-2 px-4 rounded-md font-semibold disabled:bg-gray-500">
                                {isLoading ? 'Salvando...' : 'Salvar'}
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
};

const UserDetailsModal: React.FC<{ user: User, onClose: () => void }> = ({ user, onClose }) => (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex justify-center items-center z-50 p-4">
        <div className="bg-gray-800 text-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
            <div className="p-4 border-b border-gray-700 flex justify-between items-center">
                <h3 className="text-xl font-bold">Histórico do Usuário</h3>
                <button onClick={onClose} className="text-3xl">&times;</button>
            </div>
            <div className="p-6 overflow-y-auto">
                <p><strong>Nome:</strong> {user.fullName}</p>
                <p><strong>CPF:</strong> {user.cpf}</p>
                <h4 className="font-bold mt-4 mb-2 text-red-400">Mudanças de Status</h4>
                {user.history.statusChanges.length > 0 ? (
                    <ul className="list-disc pl-5 text-sm space-y-1">
                        {[...user.history.statusChanges].reverse().map(log => (
                            <li key={log.timestamp}>
                                {new Date(log.timestamp).toLocaleString('pt-BR')}: Usuário foi <strong className={log.active ? 'text-green-400' : 'text-yellow-400'}>{log.active ? 'ATIVADO' : 'DESATIVADO'}</strong> por {log.changedByName}.
                            </li>
                        ))}
                    </ul>
                ) : <p className="text-sm text-gray-400">Nenhuma mudança de status registrada.</p>}
                
                <h4 className="font-bold mt-4 mb-2 text-red-400">Resets de Senha</h4>
                {user.history.passwordResets.length > 0 ? (
                    <ul className="list-disc pl-5 text-sm space-y-1">
                        {[...user.history.passwordResets].reverse().map(log => (
                            <li key={log.timestamp}>
                                {new Date(log.timestamp).toLocaleString('pt-BR')}: Senha resetada por {log.changedByName}.
                            </li>
                        ))}
                    </ul>
                ) : <p className="text-sm text-gray-400">Nenhum reset de senha registrado.</p>}
            </div>
        </div>
    </div>
);


export const UserManagement: React.FC = () => {
    const { users, currentUser, createUser, updateUser } = useAuth();
    const [filter, setFilter] = useState('');
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [isCreating, setIsCreating] = useState(false);
    const [viewingUser, setViewingUser] = useState<User | null>(null);

    const handleSaveUser = async (userData: Partial<User>) => {
        if (isCreating) {
            await createUser(userData);
        } else if (editingUser) {
            await updateUser({ ...editingUser, ...userData });
        }
    };

    const filteredUsers = users.filter(u => 
        u.fullName.toLowerCase().includes(filter.toLowerCase()) || 
        u.cpf.includes(filter)
    ).sort((a, b) => a.fullName.localeCompare(b.fullName));

    return (
        <div className="bg-gray-900 text-white p-6 rounded-xl">
            <div className="flex flex-col sm:flex-row justify-between items-center mb-4 gap-4">
                <input
                    type="text"
                    placeholder="Filtrar por nome ou CPF..."
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                    className="bg-gray-800 text-white placeholder-gray-400 p-2 rounded-md border border-gray-600 w-full sm:w-auto"
                />
                <button onClick={() => { setEditingUser(null); setIsCreating(true); }} className="bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded-lg flex items-center gap-2 w-full sm:w-auto justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" x2="19" y1="8" y2="14"/><line x1="22" x2="16" y1="11" y2="11"/></svg>
                    Criar Usuário
                </button>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-left min-w-[640px]">
                    <thead className="bg-gray-700 text-gray-300">
                        <tr>
                            <th className="p-3 uppercase text-sm font-semibold">Usuário</th>
                            <th className="p-3 uppercase text-sm font-semibold">CPF</th>
                            <th className="p-3 uppercase text-sm font-semibold">Função</th>
                            <th className="p-3 uppercase text-sm font-semibold text-center">Status</th>
                            <th className="p-3 uppercase text-sm font-semibold text-center">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700">
                        {filteredUsers.map(user => {
                            return (
                                <tr key={user.id}>
                                    <td className="p-3 flex items-center gap-3">
                                        <div className="h-10 w-10 rounded-full bg-gray-700 text-gray-400 overflow-hidden flex-shrink-0">
                                            {user.profilePicture ? <img src={user.profilePicture} alt={`Foto de ${user.fullName}`} className="h-full w-full object-cover"/> : <UserIcon />}
                                        </div>
                                        <div>
                                            <p className="font-bold text-white">{getDisplayName(user.fullName)}</p>
                                            <p className="text-sm text-gray-400">{user.fullName}</p>
                                        </div>
                                    </td>
                                    <td className="p-3 font-mono text-gray-300">{user.cpf}</td>
                                    <td className="p-3 text-gray-300">{user.role === 'MANAGER' ? 'Gestor' : 'Atendente'}</td>
                                    <td className="p-3 text-center">
                                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${user.isActive ? 'bg-green-900 text-green-300' : 'bg-gray-600 text-gray-300'}`}>
                                            {user.isActive ? 'Ativo' : 'Inativo'}
                                        </span>
                                    </td>
                                    <td className="p-3">
                                        <div className="flex justify-center gap-4">
                                            <button 
                                                onClick={() => setEditingUser(user)} 
                                                className="text-gray-400 hover:bg-gray-700 p-1 rounded-full transition-colors"
                                                title="Editar Usuário"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" /><path fillRule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clipRule="evenodd" /></svg>
                                            </button>
                                            <button 
                                                onClick={() => setViewingUser(user)} 
                                                className="text-blue-400 hover:bg-gray-700 p-1 rounded-full transition-colors" 
                                                title="Ver Histórico"
                                            >
                                               <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 flex-shrink-0"><path d="M12 8v4l3 3m6-3a9 9 0 1 1-18 0 9 9 0 0 1 18 0z"></path></svg>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
                 {filteredUsers.length === 0 && <p className="text-center text-gray-400 py-8">Nenhum usuário encontrado.</p>}
            </div>

            {(isCreating || editingUser) && (
                <UserModal 
                    user={editingUser}
                    onClose={() => { setIsCreating(false); setEditingUser(null); }}
                    onSave={handleSaveUser}
                />
            )}
            {viewingUser && <UserDetailsModal user={viewingUser} onClose={() => setViewingUser(null)} />}
        </div>
    );
};