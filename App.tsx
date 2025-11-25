import React, { useState, useEffect, useMemo } from 'react';
import { QueueProvider } from './context/QueueContext';
import { AuthProvider } from './context/AuthContext';
import { useAuth } from './hooks/useAuth';
import { HomeSelector } from './components/HomeSelector';
import { DisplayScreen } from './components/DisplayScreen';
import { TicketDispenser } from './context/TicketDispenser';
import { ServiceDesk } from './components/ServiceDesk';
import { Header } from './components/Header';
import { useQueue } from './hooks/useQueue';
import { CompletedService, AbandonedTicket, ServiceTypeDetails, ServiceType, User, ActivityLog, AgendaEntry, LocaisRetorno, LocalRetorno, ServiceDesk as ServiceDeskType } from './types';
import { storageService } from './services/storageService';
import { LoginScreen } from './components/auth/LoginScreen';
import { RegisterScreen } from './components/auth/RegisterScreen';
import { UserManagement } from './components/management/UserManagement';
import { DOCUMENT_CHECKLIST } from './constants/documents';
import { validateCPF, validateEmail } from './utils/cpfValidator';


declare global {
  interface Window {
    jspdf: any;
  }
}

const getDisplayName = (fullName: string): string => {
    if (!fullName) return '';
    const names = fullName.trim().split(' ');
    if (names.length === 1) return names[0];
    return `${names[0]} ${names[names.length - 1]}`;
};

const DetailsModal: React.FC<{ title: string; services: CompletedService[]; onClose: () => void; }> = ({ title, services, onClose }) => {
    useEffect(() => {
        const handleEsc = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [onClose]);

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex justify-center items-center z-50 p-4" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="modal-title">
            <div className="bg-gray-800 text-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center p-4 border-b border-gray-700">
                    <h3 id="modal-title" className="text-xl font-bold">{title}</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-white text-3xl">&times;</button>
                </div>
                <div className="overflow-y-auto p-4">
                    <table className="w-full text-left table-auto">
                        <thead className="bg-gray-700 sticky top-0">
                            <tr>
                                <th className="p-3 text-sm font-semibold uppercase">Senha</th>
                                <th className="p-3 text-sm font-semibold uppercase">Serviço</th>
                                <th className="p-3 text-sm font-semibold uppercase">Início Atendimento</th>
                                <th className="p-3 text-sm font-semibold uppercase">Duração</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-600">
                            {services.length > 0 ? [...services].sort((a,b) => b.completedTimestamp - a.completedTimestamp).map(service => (
                                <tr key={`${service.ticketNumber}-${service.completedTimestamp}`} className="hover:bg-gray-700">
                                    <td className="p-3 font-mono">{service.ticketNumber}</td>
                                    <td className="p-3">{ServiceTypeDetails[service.service]?.title || service.service}</td>
                                    <td className="p-3">{new Date(service.completedTimestamp - service.serviceDuration).toLocaleTimeString('pt-BR')}</td>
                                    <td className="p-3 font-mono">{formatTime(service.serviceDuration)}</td>
                                </tr>
                            )) : (
                                <tr><td colSpan={4} className="text-center p-8 text-gray-400">Nenhum serviço para exibir.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

const AbandonedTicketsModal: React.FC<{ title: string; tickets: AbandonedTicket[]; onClose: () => void; }> = ({ title, tickets, onClose }) => {
    useEffect(() => {
        const handleEsc = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [onClose]);

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex justify-center items-center z-50 p-4" onClick={onClose}>
            <div className="bg-gray-800 text-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center p-4 border-b border-gray-700">
                    <h3 className="text-xl font-bold">{title}</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-white text-3xl">&times;</button>
                </div>
                <div className="overflow-y-auto p-4">
                    <table className="w-full text-left table-auto">
                        <thead className="bg-gray-700 sticky top-0">
                            <tr>
                                <th className="p-3 text-sm font-semibold uppercase">Senha</th>
                                <th className="p-3 text-sm font-semibold uppercase">Mesa</th>
                                <th className="p-3 text-sm font-semibold uppercase">Atendente</th>
                                <th className="p-3 text-sm font-semibold uppercase">T. Espera</th>
                                <th className="p-3 text-sm font-semibold uppercase">Chamado às</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-600">
                            {tickets.length > 0 ? [...tickets].sort((a, b) => b.abandonedTimestamp - a.abandonedTimestamp).map(ticket => (
                                <tr key={`${ticket.ticketNumber}-${ticket.abandonedTimestamp}`} className="hover:bg-gray-700">
                                    <td className="p-3 font-mono">{ticket.ticketNumber}</td>
                                    <td className="p-3">{ticket.deskId}</td>
                                    <td className="p-3">{ticket.userName}</td>
                                    <td className="p-3 font-mono">{formatTime(ticket.waitTime)}</td>
                                    <td className="p-3">{new Date(ticket.calledTimestamp).toLocaleTimeString('pt-BR')}</td>
                                </tr>
                            )) : (
                                <tr><td colSpan={5} className="text-center p-8 text-gray-400">Nenhuma senha abandonada.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

const MessageManagementModal: React.FC<{
  onClose: () => void;
  tips: string[];
  alertMessage: string | null;
  updateTips: (newTips: string[]) => void;
  setAlertMessage: (message: string) => void;
  clearAlertMessage: () => void;
}> = ({ onClose, tips, alertMessage, updateTips, setAlertMessage, clearAlertMessage }) => {
  const [editableTips, setEditableTips] = useState([...tips]);
  const [alertInput, setAlertInput] = useState('');

  const handleSave = () => {
    updateTips(editableTips);
    if (alertInput.trim()) {
      setAlertMessage(alertInput.trim());
    }
    alert('Mensagens salvas!');
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex justify-center items-center z-50 p-4" onClick={onClose}>
      <div className="bg-gray-800 text-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center p-4 border-b border-gray-700">
          <h3 className="text-xl font-bold">Gerenciar Mensagens do Painel</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-3xl">&times;</button>
        </div>
        <div className="overflow-y-auto p-6 space-y-6">
          <div className="p-4 bg-gray-700 rounded-lg border border-gray-600">
            <h4 className="font-semibold text-red-400 mb-2">Mensagem de Alerta</h4>
            <p className="text-sm text-gray-400 mb-4">Esta mensagem se sobrepõe às dicas. Use para avisos importantes.</p>
            {alertMessage && <div className="mb-4 p-3 bg-yellow-500 text-black font-semibold rounded-md">Ativo: "{alertMessage}"</div>}
            <div className="flex gap-2">
              <input type="text" value={alertInput} onChange={(e) => setAlertInput(e.target.value)} placeholder="Digite o alerta..." className="flex-grow p-2 rounded-md bg-gray-600 border border-gray-500 text-white"/>
              <button onClick={() => setAlertMessage(alertInput.trim())} className="bg-yellow-500 hover:bg-yellow-600 text-black font-bold py-2 px-4 rounded-md">Ativar</button>
              <button onClick={clearAlertMessage} className="bg-gray-600 hover:bg-gray-500 text-white font-bold py-2 px-4 rounded-md">Desativar</button>
            </div>
          </div>
          <div>
            <h4 className="font-semibold text-red-400 mb-2">Mensagens Informativas</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[40vh] overflow-y-auto pr-2">
              {editableTips.map((tip, index) => (
                <div key={index}>
                  <label className="text-sm font-bold text-gray-500">Mensagem {index + 1}</label>
                  <textarea value={tip} onChange={(e) => setEditableTips(prev => prev.map((t, i) => i === index ? e.target.value : t))} rows={3} className="w-full mt-1 p-2 rounded-md bg-gray-600 border border-gray-500 text-white" />
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="text-center p-4 border-t border-gray-700 mt-auto">
          <button onClick={handleSave} className="bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-8 rounded-lg">Salvar Alterações</button>
        </div>
      </div>
    </div>
  );
};

const EditAgendaModal: React.FC<{ entry: AgendaEntry; onClose: () => void; onSave: (updatedEntry: AgendaEntry) => Promise<void>; }> = ({ entry, onClose, onSave }) => {
    const [formData, setFormData] = useState(entry);
    const [selectedDocs, setSelectedDocs] = useState<string[]>(entry.documentos_selecionados);
    const [outrosDocsText, setOutrosDocsText] = useState(entry.outros_documentos_texto || '');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const isFormValid = formData.nome && formData.telefone && formData.resumo && formData.data_retorno && formData.hora_retorno && formData.local_retorno;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        if (error) setError(null);
        const { name, value, type } = e.target;
        if (type === 'checkbox') {
            setFormData(prev => ({ ...prev, [name]: (e.target as HTMLInputElement).checked }));
        } else {
            setFormData(prev => ({ ...prev, [name]: value }));
        }
    };

    const handleDocToggle = (doc: string) => {
        const isSelected = selectedDocs.includes(doc);
        const newSelectedDocs = isSelected ? selectedDocs.filter(d => d !== doc) : [...selectedDocs, doc];
        setSelectedDocs(newSelectedDocs);
        if (doc === "Outros documentos relevantes" && isSelected) setOutrosDocsText('');
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        if (!isFormValid) {
            setError('Por favor, preencha todos os campos obrigatórios (*).');
            return;
        }
        if (formData.cpf && !validateCPF(formData.cpf)) {
            setError('O CPF inserido é inválido.');
            return;
        }
        if (formData.email && !validateEmail(formData.email)) {
            setError('O e-mail inserido é inválido.');
            return;
        }

        setIsLoading(true);
        try {
            const updatedEntry = {
                ...formData,
                documentos_selecionados: selectedDocs,
                outros_documentos_texto: selectedDocs.includes("Outros documentos relevantes") ? outrosDocsText : undefined,
            };
            await onSave(updatedEntry);
            onClose();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Falha ao salvar.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex justify-center items-center z-50 p-4">
            <form onSubmit={handleSave} className="bg-gray-800 text-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[95vh] flex flex-col">
                <h3 className="text-xl font-bold text-red-400 p-4 border-b border-gray-700">Editar Agendamento</h3>
                <div className="overflow-y-auto p-6 flex-grow">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                        <div className="md:col-span-2 font-semibold text-lg text-gray-300 border-b border-gray-600 pb-2 mb-2">Dados Pessoais</div>
                        <div><label className="text-sm">Nome Completo <span className="text-red-500">*</span></label><input type="text" name="nome" value={formData.nome} onChange={handleChange} required className="w-full mt-1 bg-gray-700 p-2 rounded"/></div>
                        <div><label className="text-sm">CPF</label><input type="text" name="cpf" value={formData.cpf} onChange={handleChange} placeholder="000.000.000-00" className="w-full mt-1 bg-gray-700 p-2 rounded"/></div>
                        <div>
                            <label className="text-sm">Telefone <span className="text-red-500">*</span></label>
                            <input type="tel" name="telefone" value={formData.telefone} onChange={handleChange} required className="w-full mt-1 bg-gray-700 p-2 rounded"/>
                            <label className="flex items-center mt-2 text-sm"><input type="checkbox" name="whatsapp_mesmo" checked={formData.whatsapp_mesmo} onChange={handleChange} className="mr-2 h-4 w-4 rounded bg-gray-600 text-red-500 focus:ring-red-500"/> O WhatsApp é o mesmo número?</label>
                        </div>
                        <div><label className="text-sm">E-mail</label><input type="email" name="email" value={formData.email} onChange={handleChange} className="w-full mt-1 bg-gray-700 p-2 rounded"/></div>

                        <div className="md:col-span-2 font-semibold text-lg text-gray-300 border-b border-gray-600 pb-2 mb-2 mt-4">Resumo da Demanda</div>
                        <div className="md:col-span-2"><label className="text-sm">Descreva o caso <span className="text-red-500">*</span></label><textarea name="resumo" value={formData.resumo} onChange={handleChange} required rows={4} className="w-full mt-1 bg-gray-700 p-2 rounded"/></div>

                        <div className="md:col-span-2 font-semibold text-lg text-gray-300 border-b border-gray-600 pb-2 mb-2 mt-4">Agendamento</div>
                        <div><label className="text-sm">Data do Retorno <span className="text-red-500">*</span></label><input type="date" name="data_retorno" value={formData.data_retorno} onChange={handleChange} required className="w-full mt-1 bg-gray-700 p-2 rounded"/></div>
                        <div><label className="text-sm">Horário do Retorno <span className="text-red-500">*</span></label><input type="time" name="hora_retorno" value={formData.hora_retorno} onChange={handleChange} required className="w-full mt-1 bg-gray-700 p-2 rounded"/></div>
                        <div className="md:col-span-2"><label className="text-sm">Local do Retorno <span className="text-red-500">*</span></label><select name="local_retorno" value={formData.local_retorno} onChange={handleChange} required className="w-full mt-1 bg-gray-700 p-2 rounded">{Object.entries(LocaisRetorno).map(([key, value]) => <option key={key} value={key}>{key} - {value}</option>)}</select></div>

                        <div className="md:col-span-2 font-semibold text-lg text-gray-300 border-b border-gray-600 pb-2 mb-2 mt-4">Documentos a Apresentar</div>
                        <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                            {DOCUMENT_CHECKLIST.map(doc => <label key={doc} className="flex items-center p-2 bg-gray-700 rounded-md hover:bg-gray-600 cursor-pointer"><input type="checkbox" checked={selectedDocs.includes(doc)} onChange={() => handleDocToggle(doc)} className="mr-3 h-4 w-4 rounded bg-gray-600 text-red-500 focus:ring-red-500"/>{doc}</label>)}
                        </div>
                        {selectedDocs.includes("Outros documentos relevantes") && (
                            <div className="md:col-span-2"><label className="text-sm">Especifique outros documentos</label><textarea value={outrosDocsText} onChange={e => setOutrosDocsText(e.target.value)} rows={2} className="w-full mt-1 bg-gray-700 p-2 rounded"/></div>
                        )}
                    </div>
                </div>
                 <div className="p-4 flex justify-between items-center gap-4 border-t border-gray-700 sticky bottom-0 bg-gray-800">
                     <div className="flex-grow">{error && <div className="text-red-400 text-sm font-semibold">{error}</div>}</div>
                    <div className="flex gap-4 flex-shrink-0">
                        <button type="button" onClick={onClose} className="py-2 px-4 rounded-md text-white font-semibold">Cancelar</button>
                        <button type="submit" disabled={isLoading || !isFormValid} className="bg-red-600 hover:bg-red-700 py-2 px-6 rounded-md font-semibold disabled:bg-gray-500 disabled:cursor-not-allowed">
                            {isLoading ? 'Salvando...' : 'Salvar Alterações'}
                        </button>
                    </div>
                </div>
            </form>
        </div>
    );
};

const AgendaManagement: React.FC = () => {
    const { state, cancelAgendaEntry, updateAgendaEntry } = useQueue();
    const { agenda } = state;
    const todayStr = new Date().toISOString().slice(0, 10);
    
    const [startDate, setStartDate] = useState(todayStr);
    const [endDate, setEndDate] = useState(todayStr);
    const [nameFilter, setNameFilter] = useState('');
    const [cpfFilter, setCpfFilter] = useState('');
    const [editingEntry, setEditingEntry] = useState<AgendaEntry | null>(null);

    const filteredAgenda = useMemo(() => {
        const hasTextFilter = nameFilter.trim() !== '' || cpfFilter.trim() !== '';

        if (hasTextFilter) {
            return agenda.filter(entry => {
                const isNameMatch = nameFilter.trim() === '' || entry.nome.toLowerCase().includes(nameFilter.toLowerCase());
                const cleanCpfFilter = cpfFilter.replace(/\D/g, '');
                const isCpfMatch = cleanCpfFilter === '' || (entry.cpf && entry.cpf.replace(/\D/g, '').includes(cleanCpfFilter));
                return isNameMatch && isCpfMatch;
            }).sort((a,b) => b.data_do_registro - a.data_do_registro);
        }
        
        return agenda.filter(entry => {
            const entryDate = new Date(entry.data_retorno + 'T00:00:00');
            const start = new Date(startDate + 'T00:00:00');
            const end = new Date(endDate + 'T23:59:59');
            return entryDate >= start && entryDate <= end;
        }).sort((a,b) => new Date(a.data_retorno).getTime() - new Date(b.data_retorno).getTime() || a.hora_retorno.localeCompare(b.hora_retorno));
    }, [agenda, startDate, endDate, nameFilter, cpfFilter]);
    
    const totalPending = agenda.filter(a => a.status === 'AGENDADO').length;

    const handleCancelEntry = (entryId: string) => {
        if (window.confirm("Tem certeza que deseja desativar este agendamento por desistência?")) {
            cancelAgendaEntry(entryId);
        }
    };

    const getStatusBadge = (status: AgendaEntry['status']) => {
        switch (status) {
            case 'AGENDADO': return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-yellow-900 text-yellow-300">AGENDADO</span>;
            case 'CONCLUÍDO': return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-900 text-green-300">CONCLUÍDO</span>;
            case 'CANCELADO': return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-gray-700 text-gray-300">CANCELADO</span>;
            default: return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-gray-700 text-gray-300">{status}</span>;
        }
    };

    const StatCard: React.FC<{ title: string; value: string; }> = ({ title, value }) => (
        <div className="bg-gray-800 p-4 rounded-xl shadow">
            <p className="text-gray-400 text-sm uppercase font-semibold">{title}</p>
            <p className="text-white text-3xl font-bold">{value}</p>
        </div>
    );

    return (
        <div className="bg-gray-900 text-white p-6 rounded-xl">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6 bg-gray-800 p-4 rounded-lg">
                <div><label className="text-sm font-semibold text-gray-400">Data Inicial</label><input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full mt-1 bg-gray-700 text-white p-2 rounded-md border border-gray-600"/></div>
                <div><label className="text-sm font-semibold text-gray-400">Data Final</label><input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full mt-1 bg-gray-700 text-white p-2 rounded-md border border-gray-600"/></div>
                <div><label className="text-sm font-semibold text-gray-400">Pesquisar por Nome</label><input type="text" value={nameFilter} onChange={e => setNameFilter(e.target.value)} placeholder="Busca global por nome..." className="w-full mt-1 bg-gray-700 text-white p-2 rounded-md border border-gray-600"/></div>
                <div><label className="text-sm font-semibold text-gray-400">Pesquisar por CPF</label><input type="text" value={cpfFilter} onChange={e => setCpfFilter(e.target.value)} placeholder="Busca global por CPF..." className="w-full mt-1 bg-gray-700 text-white p-2 rounded-md border border-gray-600"/></div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">
                <StatCard title="Total de Agendamentos Pendentes" value={String(totalPending)} />
                <StatCard title="Agendamentos no Período/Busca" value={String(filteredAgenda.length)} />
            </div>
            <div className="overflow-x-auto bg-gray-800 rounded-lg">
                <table className="w-full text-left min-w-[840px]">
                    <thead className="bg-gray-700 text-gray-300">
                        <tr>
                            <th className="p-3 text-sm font-semibold uppercase">Nome</th>
                            <th className="p-3 text-sm font-semibold uppercase">CPF</th>
                            <th className="p-3 text-sm font-semibold uppercase">Data Retorno</th>
                            <th className="p-3 text-sm font-semibold uppercase">Horário</th>
                            <th className="p-3 text-sm font-semibold uppercase">Local</th>
                            <th className="p-3 text-sm font-semibold uppercase">Status</th>
                            <th className="p-3 text-sm font-semibold uppercase text-center">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700">
                        {filteredAgenda.map(entry => (
                            <tr key={entry.id} className="hover:bg-gray-700">
                                <td className="p-3 font-semibold text-white">{entry.nome}</td>
                                <td className="p-3 font-mono text-gray-300">{entry.cpf || 'N/A'}</td>
                                <td className="p-3 text-gray-300">{new Date(entry.data_retorno + 'T00:00:00').toLocaleDateString('pt-BR')}</td>
                                <td className="p-3 font-mono text-gray-300">{entry.hora_retorno}</td>
                                <td className="p-3 text-gray-300">{entry.local_retorno}</td>
                                <td className="p-3">{getStatusBadge(entry.status)}</td>
                                <td className="p-3 text-center">
                                    {entry.status === 'AGENDADO' && (
                                        <div className="flex justify-center items-center gap-4">
                                            <button onClick={() => setEditingEntry(entry)} title="Editar Agendamento" className="text-blue-400 hover:text-blue-300">
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" /><path fillRule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clipRule="evenodd" /></svg>
                                            </button>
                                            <button onClick={() => handleCancelEntry(entry.id)} title="Desativar Agendamento (Desistência)" className="text-red-500 hover:text-red-400">
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" /></svg>
                                            </button>
                                        </div>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {filteredAgenda.length === 0 && <p className="text-center text-gray-400 py-8">Nenhum agendamento encontrado para os filtros selecionados.</p>}
            </div>
            {editingEntry && <EditAgendaModal entry={editingEntry} onClose={() => setEditingEntry(null)} onSave={updateAgendaEntry} />}
        </div>
    );
};


const formatTime = (ms: number) => {
    if (isNaN(ms) || ms < 0) return '00:00';
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60).toString().padStart(2, '0');
    const seconds = (totalSeconds % 60).toString().padStart(2, '0');
    return hours > 0 ? `${hours.toString().padStart(2, '0')}:${minutes}:${seconds}` : `${minutes}:${seconds}`;
};

const formatDateForInput = (date: Date) => date.toISOString().split('T')[0];
const isSameDay = (d1: Date, d2: Date) => d1.getFullYear() === d2.getFullYear() && d1.getMonth() === d2.getMonth() && d1.getDate() === d2.getDate();

const ActiveDesksModal: React.FC<{ desks: ServiceDeskType[]; onClose: () => void; }> = ({ desks, onClose }) => {
    useEffect(() => {
        const handleEsc = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [onClose]);

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex justify-center items-center z-50 p-4" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="active-desks-modal-title">
            <div className="bg-gray-800 text-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center p-4 border-b border-gray-700">
                    <h3 id="active-desks-modal-title" className="text-xl font-bold">Mesas em Atendimento</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-white text-3xl">&times;</button>
                </div>
                <div className="overflow-y-auto p-4">
                    <table className="w-full text-left table-auto">
                        <thead className="bg-gray-700 sticky top-0">
                            <tr>
                                <th className="p-3 text-sm font-semibold uppercase">Mesa</th>
                                <th className="p-3 text-sm font-semibold uppercase">Atendente</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-600">
                            {desks.length > 0 ? desks.map(desk => (
                                <tr key={desk.id} className="hover:bg-gray-700">
                                    <td className="p-3 font-mono text-lg">{desk.id}</td>
                                    <td className="p-3 text-lg">{desk.user?.displayName}</td>
                                </tr>
                            )) : (
                                <tr><td colSpan={2} className="text-center p-8 text-gray-400">Nenhuma mesa em atendimento no momento.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

const ManagementScreen: React.FC = () => {
    const { state, updateTips, setAlertMessage, clearAlertMessage } = useQueue();
    const [startDate, setStartDate] = useState(new Date());
    const [endDate, setEndDate] = useState(new Date());
    const [modalContent, setModalContent] = useState<{title: string, services: CompletedService[]} | null>(null);
    const [showAbandonedModal, setShowAbandonedModal] = useState(false);
    const [isMessageModalOpen, setIsMessageModalOpen] = useState(false);
    const [ticketSearchQuery, setTicketSearchQuery] = useState('');
    const [ticketSearchResults, setTicketSearchResults] = useState<any[] | null>(null);
    const [searchedTicket, setSearchedTicket] = useState('');
    const [currentTab, setCurrentTab] = useState<'stats' | 'agenda' | 'users'>('stats');
    const [showActiveDesksModal, setShowActiveDesksModal] = useState(false);
    
    const displayData = (() => {
        const today = new Date();
        if (isSameDay(startDate, today) && isSameDay(endDate, today)) return { ...state, isLive: true };
        
        const aggregatedData: { completedServices: CompletedService[], abandonedTickets: AbandonedTicket[] } = { completedServices: [], abandonedTickets: [] };
        const history = storageService.getHistory();
        for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
            const dayKey = formatDateForInput(d);
            const dayData = history[dayKey];
            if (dayData) {
                aggregatedData.completedServices.push(...(dayData.completedServices || []));
                aggregatedData.abandonedTickets.push(...(dayData.abandonedTickets || []));
            }
        }
        return { ...state, completedServices: aggregatedData.completedServices, abandonedTickets: aggregatedData.abandonedTickets, waitingNormal: [], waitingPreferential: [], isLive: false };
    })();
    
    const { completedServices, waitingNormal, waitingPreferential, abandonedTickets, isLive, desks } = displayData;

    const activeDesks = useMemo(() => 
        isLive ? desks.filter(d => d.user && d.serviceStartTime) : [],
        [desks, isLive]
    );
    
    const { totalServed, totalAbandoned, estimatedTotalRemainingTime, statsByServiceType, statsByUser } = (() => {
        const totalServed = completedServices.length;
        const totalServiceDuration = completedServices.reduce((sum, s) => sum + s.serviceDuration, 0);
        const overallAvgServiceTime = totalServed > 0 ? totalServiceDuration / totalServed : 0;
        
        const statsByServiceType = Object.keys(ServiceTypeDetails).reduce((acc, s) => {
            const service = s as ServiceType;
            const ofType = completedServices.filter(c => c.service === service);
            const count = ofType.length;
            acc[service] = {
                count,
                avgWaitTime: count > 0 ? ofType.reduce((sum, s) => sum + s.waitTime, 0) / count : 0,
                avgServiceTime: count > 0 ? ofType.reduce((sum, s) => sum + s.serviceDuration, 0) / count : 0,
            };
            return acc;
        }, {} as Record<ServiceType, { count: number; avgWaitTime: number; avgServiceTime: number; }>);

        const statsByUser = Array.from(new Set(completedServices.map(s => s.userId))).map(userId => {
            const userServices = completedServices.filter(s => s.userId === userId);
            const userName = userServices[0]?.userName || 'Desconhecido';
            const count = userServices.length;
            const avgDuration = count > 0 ? userServices.reduce((a, c) => a + c.serviceDuration, 0) / count : 0;
            
            return {
                user: userName,
                userId: userId,
                count,
                avgDuration
            };
        }).sort((a, b) => b.count - a.count);

        return {
            totalServed,
            totalAbandoned: abandonedTickets.length,
            estimatedTotalRemainingTime: (waitingNormal.length + waitingPreferential.length) * overallAvgServiceTime,
            statsByServiceType,
            statsByUser,
        };
    })();

    const handleTicketSearch = (e: React.FormEvent) => {
        e.preventDefault();
        setSearchedTicket(ticketSearchQuery);
        setTicketSearchResults(storageService.findTicketInHistory(ticketSearchQuery));
    };
    
    const generatePDFReport = () => {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();

        doc.setFontSize(18);
        doc.text("Relatório de Atendimento", 14, 22);
        doc.setFontSize(11);
        doc.setTextColor(100);
        doc.text(`Período: ${startDate.toLocaleDateString('pt-BR')} a ${endDate.toLocaleDateString('pt-BR')}`, 14, 30);

        const summaryData = [
            ["Atendimentos Realizados", totalServed],
            ["Senhas Abandonadas", totalAbandoned],
        ];

        doc.autoTable({
            startY: 40,
            head: [['Métrica', 'Total']],
            body: summaryData,
            theme: 'striped',
            headStyles: { fillColor: [204, 0, 0] }
        });

        const serviceData = Object.entries(statsByServiceType).map(([key, value]) => [
            ServiceTypeDetails[key as ServiceType].title,
            value.count,
            formatTime(value.avgWaitTime),
            formatTime(value.avgServiceTime)
        ]);

        doc.autoTable({
            startY: doc.previousAutoTable.finalY + 10,
            head: [['Serviço', 'Atendidos', 'T.M. Espera', 'T.M. Atendimento']],
            body: serviceData,
            theme: 'grid',
            headStyles: { fillColor: [204, 0, 0] }
        });
        
        const userData = statsByUser.map(u => [u.user, u.count, formatTime(u.avgDuration)]);

        doc.autoTable({
            startY: doc.previousAutoTable.finalY + 10,
            head: [['Atendente', 'Atendidos', 'T.M. Atendimento']],
            body: userData,
            theme: 'grid',
            headStyles: { fillColor: [204, 0, 0] }
        });

        doc.save(`relatorio_${formatDateForInput(startDate)}_a_${formatDateForInput(endDate)}.pdf`);
    };

    const StatCard: React.FC<{ title: string; value: string; icon: React.ReactNode; onClick?: () => void; disabled?: boolean; }> = ({ title, value, icon, onClick, disabled }) => (
        <div onClick={!disabled ? onClick : undefined} className={`bg-gray-900 p-6 rounded-xl flex items-center gap-4 ${onClick && !disabled ? "cursor-pointer hover:bg-gray-800" : ""} ${disabled ? "opacity-60" : ""}`}>
            <div className="bg-gray-800 p-3 rounded-full">{icon}</div>
            <div><p className="text-gray-400 text-sm uppercase">{title}</p><p className="text-white text-3xl font-bold">{value}</p></div>
        </div>
    );
    
    return (
        <div className="h-full bg-black text-white p-4 lg:p-8 overflow-y-auto">
            <div className="max-w-7xl mx-auto">
                <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                    <h2 className="text-3xl font-bold">Gerenciamento</h2>
                     <div className="flex items-center gap-2">
                        <button onClick={generatePDFReport} className="bg-gray-700 hover:bg-gray-600 text-white font-semibold py-2 px-4 rounded-lg flex items-center gap-2">
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><line x1="10" y1="9" x2="8" y2="9"></line></svg>
                            Exportar PDF
                        </button>
                        <button onClick={() => setIsMessageModalOpen(true)} className="bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded-lg">
                            Gerenciar Mensagens
                        </button>
                    </div>
                </div>
                <div className="border-b border-gray-700 mb-6">
                    <nav className="flex space-x-4">
                        <button onClick={() => setCurrentTab('stats')} className={`py-2 px-3 font-medium ${currentTab === 'stats' ? 'text-red-500 border-b-2 border-red-500' : 'text-gray-400 hover:text-white'}`}>Estatísticas</button>
                        <button onClick={() => setCurrentTab('agenda')} className={`py-2 px-3 font-medium ${currentTab === 'agenda' ? 'text-red-500 border-b-2 border-red-500' : 'text-gray-400 hover:text-white'}`}>Agenda</button>
                        <button onClick={() => setCurrentTab('users')} className={`py-2 px-3 font-medium ${currentTab === 'users' ? 'text-red-500 border-b-2 border-red-500' : 'text-gray-400 hover:text-white'}`}>Usuários</button>
                    </nav>
                </div>

                {currentTab === 'stats' && (
                  <div>
                    <div className="bg-gray-900 p-4 rounded-lg mb-6 flex flex-wrap items-center gap-4">
                        <label className="font-semibold">Período:</label>
                        <input type="date" value={formatDateForInput(startDate)} onChange={e => setStartDate(new Date(e.target.value + 'T00:00:00'))} className="bg-gray-800 p-2 rounded-md border border-gray-700"/>
                        <span>até</span>
                        <input type="date" value={formatDateForInput(endDate)} onChange={e => setEndDate(new Date(e.target.value + 'T00:00:00'))} className="bg-gray-800 p-2 rounded-md border border-gray-700"/>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                        {isLive && (
                            <>
                                <StatCard title="Preferenciais Aguardando" value={String(waitingPreferential.length)} icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-yellow-400" fill="currentColor" viewBox="0 0 24 24"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg>} />
                                <StatCard title="Normais Aguardando" value={String(waitingNormal.length)} icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>} />
                                <StatCard title="Em Atendimento" value={String(activeDesks.length)} icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.653-.284-1.255-.758-1.659M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.653.284-1.255.758-1.659M12 12a4 4 0 100-8 4 4 0 000 8zm0 0v1.5a2.5 2.5 0 005 0V12a5 5 0 00-5-5z" /></svg>} onClick={() => setShowActiveDesksModal(true)} disabled={activeDesks.length === 0} />
                            </>
                        )}
                        <StatCard title="Não Compareceu" value={String(totalAbandoned)} icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg>} onClick={() => setShowAbandonedModal(true)} disabled={totalAbandoned === 0} />
                        <StatCard title="Realizados" value={String(totalServed)} icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>} />
                        {isLive && <StatCard title="Estimativa Restante" value={formatTime(estimatedTotalRemainingTime)} icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>} />}
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        <div className="bg-gray-900 p-6 rounded-xl">
                            <h3 className="font-bold text-lg mb-4">Atendimentos por Serviço</h3>
                            <div className="space-y-4">
                            {Object.entries(statsByServiceType).map(([key, value]) => (
                                <div key={key}>
                                    <div className="flex justify-between items-baseline mb-1">
                                        <span className="font-semibold">{ServiceTypeDetails[key as ServiceType].title}</span>
                                        <span className="text-xl font-bold">{value.count}</span>
                                    </div>
                                    <div className="text-xs text-gray-400 flex justify-between">
                                        <span>T.M. Espera: {formatTime(value.avgWaitTime)}</span>
                                        <span>T.M. Atendimento: {formatTime(value.avgServiceTime)}</span>
                                    </div>
                                </div>
                            ))}
                            </div>
                        </div>

                         <div className="bg-gray-900 p-6 rounded-xl">
                            <h3 className="font-bold text-lg mb-4">Atendimentos por Atendente</h3>
                            <div className="overflow-y-auto max-h-60 pr-2">
                                {statsByUser.map(user => (
                                    <div key={user.userId || user.user} onClick={() => setModalContent({ title: `Serviços de ${user.user}`, services: completedServices.filter(s => s.userName === user.user) })} className="flex justify-between items-center p-2 rounded-md hover:bg-gray-800 cursor-pointer">
                                        <span>{user.user}</span>
                                        <div><span className="font-bold text-lg mr-4">{user.count}</span><span className="text-xs text-gray-400">{formatTime(user.avgDuration)}</span></div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                     <div className="bg-gray-900 p-6 rounded-xl mt-8">
                        <h3 className="font-bold text-lg mb-4">Buscar Histórico da Senha</h3>
                        <form onSubmit={handleTicketSearch} className="flex gap-2">
                            <input type="text" value={ticketSearchQuery} onChange={e => setTicketSearchQuery(e.target.value.toUpperCase())} placeholder="Digite a senha (Ex: N001)" className="flex-grow bg-gray-800 p-2 rounded-md border border-gray-700"/>
                            <button type="submit" className="bg-red-600 font-semibold px-4 py-2 rounded-md">Buscar</button>
                        </form>
                        {ticketSearchResults && (
                            <div className="mt-4">
                                <h4 className="font-semibold">Resultados para "{searchedTicket}":</h4>
                                {ticketSearchResults.length > 0 ? (
                                    <ul className="list-disc pl-5 mt-2">
                                        {ticketSearchResults.map((r, i) => (
                                            <li key={i}>{r.date.toLocaleDateString('pt-BR')} - {r.status} por {r.user} na Mesa {r.deskId} às {new Date(r.completedTimestamp || r.abandonedTimestamp).toLocaleTimeString('pt-BR')}</li>
                                        ))}
                                    </ul>
                                ) : <p className="text-gray-400 mt-2">Nenhum registro encontrado.</p>}
                            </div>
                        )}
                    </div>
                  </div>
                )}
                
                {currentTab === 'agenda' && <AgendaManagement />}

                {currentTab === 'users' && <UserManagement />}
            </div>
            {modalContent && <DetailsModal title={modalContent.title} services={modalContent.services} onClose={() => setModalContent(null)} />}
            {showAbandonedModal && <AbandonedTicketsModal title={`Senhas Abandonadas`} tickets={abandonedTickets} onClose={() => setShowAbandonedModal(false)} />}
            {isMessageModalOpen && <MessageManagementModal onClose={() => setIsMessageModalOpen(false)} tips={state.tips} alertMessage={state.alertMessage} updateTips={updateTips} setAlertMessage={setAlertMessage} clearAlertMessage={clearAlertMessage} />}
            {showActiveDesksModal && <ActiveDesksModal desks={activeDesks} onClose={() => setShowActiveDesksModal(false)} />}
        </div>
    );
};

type View = 'home' | 'display' | 'dispenser' | 'desk' | 'management';

const AuthFlow: React.FC = () => {
    const [view, setView] = useState<'login' | 'register'>('login');
    const [registerSuccessMessage, setRegisterSuccessMessage] = useState<string | null>(null);

    const handleSwitchToLogin = (success?: boolean) => {
        if (success) {
            setRegisterSuccessMessage('Cadastro realizado com sucesso! Você já pode fazer o login.');
        } else {
            setRegisterSuccessMessage(null);
        }
        setView('login');
    };

    const handleSwitchToRegister = () => {
        setRegisterSuccessMessage(null);
        setView('register');
    };
    
    return (
        <div className="min-h-screen bg-black flex items-center justify-center p-4">
            {view === 'login' ? <LoginScreen onSwitchToRegister={handleSwitchToRegister} successMessage={registerSuccessMessage || undefined} /> : <RegisterScreen onSwitchToLogin={handleSwitchToLogin} />}
        </div>
    );
};

const MainApp: React.FC = () => {
    const [view, setView] = useState<View>('home');
    const { currentUser, logout } = useAuth();
    const { state: queueState } = useQueue();
  
    const renderView = () => {
        switch (view) {
        case 'display': return <DisplayScreen setView={setView} />;
        case 'dispenser': return <TicketDispenser />;
        case 'desk': return <ServiceDesk />;
        case 'management':
            if (currentUser?.role === 'MANAGER') return <ManagementScreen />;
            return <HomeSelector setView={setView} />; // Fallback for non-managers
        case 'home':
        default: return <HomeSelector setView={setView} />;
        }
    };
  
    const getHeaderInfo = () => {
        const loggedInDesk = currentUser ? queueState.desks.find(d => d.user?.id === currentUser.id) : null;

        switch(view) {
            case 'display': return null;
            case 'dispenser': return { title: 'Emissão de Senhas', subtitle: 'Retire sua senha para atendimento'};
            case 'desk':
                if (loggedInDesk) {
                    return { title: 'Mesa de Atendimento', subtitle: `Atendendo na Mesa ${loggedInDesk.id}` };
                }
                return { title: 'Mesa de Atendimento', subtitle: 'Faça o login para iniciar o atendimento'};
            case 'management': return { title: 'Gerenciamento', subtitle: 'Painel de estatísticas e usuários' };
            default: return null;
        }
    };

    const headerInfo = getHeaderInfo();
    const showHomeButton = view !== 'home' && view !== 'display';

    return (
        <div className="min-h-screen flex flex-col bg-black">
            {headerInfo && <Header 
                title={headerInfo.title} 
                subtitle={headerInfo.subtitle}
                user={currentUser ? { displayName: getDisplayName(currentUser.fullName), profilePicture: currentUser.profilePicture } : null}
                onLogout={logout}
                onHomeClick={showHomeButton ? () => setView('home') : undefined}
            />}
            <main className="flex-grow">
                {renderView()}
            </main>
        </div>
    );
}

const AppContent: React.FC = () => {
    const { isAuthenticated, isLoading } = useAuth();

    if (isLoading) {
        return <div className="min-h-screen bg-black flex items-center justify-center text-white">Carregando...</div>
    }

    return isAuthenticated ? <MainApp /> : <AuthFlow />;
}

const App: React.FC = () => {
  return (
    <AuthProvider>
      <QueueProvider>
        <AppContent />
      </QueueProvider>
    </AuthProvider>
  );
};

export default App;