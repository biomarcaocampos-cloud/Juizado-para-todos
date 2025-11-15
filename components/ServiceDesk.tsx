import React, { useState, useEffect, useMemo } from 'react';
import { useQueue } from '../hooks/useQueue';
import { ServiceType, ServiceTypeDetails, ServiceDesk as ServiceDeskType, LocalRetorno, LocaisRetorno, AgendaEntry } from '../types';
import { useAuth } from '../hooks/useAuth';
import { DOCUMENT_CHECKLIST } from '../constants/documents';
import { validateCPF, validateEmail } from '../utils/cpfValidator';

const getDisplayName = (fullName: string): string => {
    if (!fullName) return '';
    const names = fullName.trim().split(' ');
    if (names.length === 1) return names[0];
    return `${names[0]} ${names[names.length - 1]}`;
};

interface AgendaModalProps {
    onClose: () => void;
    attendant: { id: string; name: string; };
    ticketNumber: string;
}

const AgendaModal: React.FC<AgendaModalProps> = ({ onClose, attendant, ticketNumber }) => {
    const { addAgendaEntry } = useQueue();
    const [formData, setFormData] = useState({
        nome: '',
        cpf: '',
        telefone: '',
        whatsapp_mesmo: true,
        email: '',
        resumo: '',
        data_retorno: '',
        hora_retorno: '',
        local_retorno: 'JEC Central' as LocalRetorno,
    });
    const [selectedDocs, setSelectedDocs] = useState<string[]>([DOCUMENT_CHECKLIST[0], DOCUMENT_CHECKLIST[1]]);
    const [outrosDocsText, setOutrosDocsText] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [showPreview, setShowPreview] = useState(false);
    const [previewData, setPreviewData] = useState<Omit<AgendaEntry, 'id' | 'data_do_registro' | 'status'> | null>(null);
    const [error, setError] = useState<string | null>(null);

    const isFormValid = formData.nome && formData.telefone && formData.resumo && formData.data_retorno && formData.hora_retorno && formData.local_retorno;

    const formatCPF = (value: string) => {
        return value.replace(/\D/g, '').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})/, '$1-$2').substring(0, 14);
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        if(error) setError(null);
        const { name, value, type } = e.target;
        if (type === 'checkbox') {
            setFormData(prev => ({...prev, [name]: (e.target as HTMLInputElement).checked }));
        } else if (name === 'cpf') {
            setFormData(prev => ({ ...prev, cpf: formatCPF(value) }));
        } else {
            setFormData(prev => ({...prev, [name]: value }));
        }
    };

    const handleDocToggle = (doc: string) => {
        const isSelected = selectedDocs.includes(doc);
        const newSelectedDocs = isSelected ? selectedDocs.filter(d => d !== doc) : [...selectedDocs, doc];
        setSelectedDocs(newSelectedDocs);

        if (doc === "Outros documentos relevantes" && isSelected) {
            setOutrosDocsText('');
        }
    };

    const handlePreparePreview = (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (!isFormValid) {
            setError('Por favor, preencha todos os campos obrigatórios (*).');
            return;
        }

        if (formData.cpf && !validateCPF(formData.cpf)) {
            setError('O CPF inserido é inválido. Verifique o número ou deixe o campo em branco.');
            return;
        }
        
        if (formData.email && !validateEmail(formData.email)) {
            setError('O e-mail inserido é inválido. Verifique o endereço ou deixe o campo em branco.');
            return;
        }

        const entryData: Omit<AgendaEntry, 'id' | 'data_do_registro' | 'status'> = {
            ...formData,
            documentos_selecionados: selectedDocs,
            outros_documentos_texto: selectedDocs.includes("Outros documentos relevantes") ? outrosDocsText : undefined,
            ticketNumber: ticketNumber,
            atendente_id: attendant.id,
            atendente_responsavel: attendant.name,
        };
        setPreviewData(entryData);
        setShowPreview(true);
    };

    const handlePrint = (data: Omit<AgendaEntry, 'id' | 'data_do_registro' | 'status'>) => {
        const date = new Date(data.data_retorno + 'T00:00:00').toLocaleDateString('pt-BR');
        const docsHtml = data.documentos_selecionados.map(doc => `<li>${doc === "Outros documentos relevantes" && data.outros_documentos_texto ? `Outros: ${data.outros_documentos_texto}` : doc}</li>`).join('');
        const printContent = `
            <html><head><title>Comprovante de Agendamento</title>
            <style>body{font-family:sans-serif;margin:20px}h1{font-size:18px;border-bottom:1px solid #000;padding-bottom:5px}p{margin:5px 0}ul{padding-left:20px}strong{display:inline-block;width:90px}</style></head>
            <body><h1>Comprovante de Agendamento - JEC Guarulhos</h1>
            <p><strong>Nome:</strong> ${data.nome}</p>
            <p><strong>Retornar em:</strong> ${date} às ${data.hora_retorno}</p>
            <p><strong>Local:</strong> ${data.local_retorno} - ${LocaisRetorno[data.local_retorno]}</p>
            <hr><p><strong>Documentos a apresentar:</strong></p><ul>${docsHtml}</ul>
            <hr><p><strong>Resumo do caso:</strong> ${data.resumo}</p></body></html>`;

        const printWindow = window.open('', '_blank');
        printWindow?.document.write(printContent);
        printWindow?.document.close();
        printWindow?.print();
    };

    const handleSaveAndPrint = async () => {
        if (!previewData) return;
        setIsLoading(true);
        try {
            await addAgendaEntry(previewData);
            handlePrint(previewData);
            onClose();
        } catch (error) {
            alert('Falha ao salvar o agendamento.');
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };
    
    if (showPreview && previewData) {
        return (
            <div className="fixed inset-0 bg-black bg-opacity-80 flex justify-center items-center z-50 p-4">
                <div className="bg-gray-800 text-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[95vh] flex flex-col">
                    <h3 className="text-xl font-bold text-red-400 p-4 border-b border-gray-700">Revisar Agendamento</h3>
                    <div className="overflow-y-auto p-6 space-y-3 text-sm">
                        <p><strong>Nome:</strong> {previewData.nome}</p>
                        <p><strong>CPF:</strong> {previewData.cpf || 'Não informado'}</p>
                        <p><strong>Telefone:</strong> {previewData.telefone} {previewData.whatsapp_mesmo && "(WhatsApp)"}</p>
                        <p><strong>E-mail:</strong> {previewData.email || 'Não informado'}</p>
                        <p><strong>Data/Hora:</strong> {new Date(previewData.data_retorno + 'T00:00:00').toLocaleDateString('pt-BR')} às {previewData.hora_retorno}</p>
                        <p><strong>Local:</strong> {previewData.local_retorno}</p>
                        <div><strong>Documentos:</strong>
                            <ul className="list-disc pl-5 mt-1">
                                {previewData.documentos_selecionados.map(d => <li key={d}>{d}{d === "Outros documentos relevantes" && previewData.outros_documentos_texto ? `: ${previewData.outros_documentos_texto}` : ''}</li>)}
                            </ul>
                        </div>
                        <p><strong>Resumo:</strong> {previewData.resumo}</p>
                    </div>
                    <div className="p-4 flex justify-end gap-4 border-t border-gray-700 mt-auto">
                        <button onClick={() => setShowPreview(false)} className="py-2 px-4 rounded-md text-white font-semibold">Corrigir</button>
                        <button onClick={handleSaveAndPrint} disabled={isLoading} className="bg-red-600 hover:bg-red-700 py-2 px-6 rounded-md font-semibold disabled:bg-gray-500">{isLoading ? 'Salvando...' : 'Salvar e Imprimir'}</button>
                    </div>
                </div>
            </div>
        );
    }
    
    return (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex justify-center items-center z-50 p-4" role="dialog" aria-modal="true" aria-labelledby="agenda-modal-title">
            <div className="bg-gray-800 text-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[95vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center p-4 border-b border-gray-700 sticky top-0 bg-gray-800">
                    <h3 id="agenda-modal-title" className="text-xl font-bold text-red-400">Agendamento de Retorno (Atermação)</h3>
                </div>
                <form onSubmit={handlePreparePreview} className="overflow-y-auto p-6 flex-grow">
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
                </form>
                <div className="p-4 flex justify-between items-center gap-4 border-t border-gray-700 sticky bottom-0 bg-gray-800">
                     <div className="flex-grow">
                        {error && <div className="text-red-400 text-sm font-semibold">{error}</div>}
                    </div>
                    <div className="flex gap-4 flex-shrink-0">
                        <button type="button" onClick={onClose} className="py-2 px-4 rounded-md text-white font-semibold">Cancelar</button>
                        <button type="submit" onClick={handlePreparePreview} disabled={!isFormValid} className="bg-red-600 hover:bg-red-700 py-2 px-6 rounded-md font-semibold disabled:bg-gray-500 disabled:cursor-not-allowed">
                            Salvar
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export const ServiceDesk: React.FC = () => {
  const { state, login, logout, callSpecificTicket, startService, endService } = useQueue();
  const { currentUser } = useAuth();

  const [selectedDeskId, setSelectedDeskId] = useState<number | null>(null);
  const [selectedServices, setSelectedServices] = useState<ServiceType[]>([]);
  const [view, setView] = useState<'return' | 'select_desk'>('return');
  
  const [elapsedTime, setElapsedTime] = useState(0);
  const [waitingSinceCall, setWaitingSinceCall] = useState(0);
  const [isAgendaModalOpen, setIsAgendaModalOpen] = useState(false);

  const loggedInDesk = state.desks.find(d => d.user?.id === currentUser?.id);
  const isServiceActive = loggedInDesk?.serviceStartTime !== null;
  
  const myActiveDesk = state.desks.find(d => d.user?.id === currentUser?.id);
  const availableDesks = state.desks.filter(d => !d.user);
  
  const { pendingPreferential, pendingNormal } = useMemo(() => {
    if (!loggedInDesk) return { pendingPreferential: 0, pendingNormal: 0 };
    const deskServices = loggedInDesk.services;
    const pendingPreferential = state.waitingPreferential.filter(t => deskServices.includes(t.service)).length;
    const pendingNormal = state.waitingNormal.filter(t => deskServices.includes(t.service)).length;
    return { pendingPreferential, pendingNormal };
  }, [state.waitingPreferential, state.waitingNormal, loggedInDesk]);


  useEffect(() => {
    if (!isServiceActive || !loggedInDesk?.serviceStartTime) {
      setElapsedTime(0);
      return;
    }

    const intervalId = setInterval(() => {
      setElapsedTime(Date.now() - (loggedInDesk.serviceStartTime ?? 0));
    }, 1000);

    return () => clearInterval(intervalId);
  }, [isServiceActive, loggedInDesk?.serviceStartTime]);
  
  useEffect(() => {
    let intervalId: number | undefined;

    if (loggedInDesk?.currentTicketInfo && !loggedInDesk.serviceStartTime) {
        const calledInfo = state.calledHistory.find(
            t => t.ticketNumber === loggedInDesk.currentTicketInfo?.number
        );
        const calledTimestamp = calledInfo ? calledInfo.timestamp : Date.now();

        const updateTimer = () => {
            setWaitingSinceCall(Date.now() - calledTimestamp);
        };

        intervalId = window.setInterval(updateTimer, 1000);
        updateTimer();
    } else {
        setWaitingSinceCall(0);
    }

    return () => {
        if (intervalId) {
            clearInterval(intervalId);
        }
    };
}, [loggedInDesk?.currentTicketInfo, loggedInDesk?.serviceStartTime, state.calledHistory]);

  useEffect(() => {
    if (myActiveDesk) {
      setView('return');
    } else {
      setView('select_desk');
    }
  }, [myActiveDesk]);

  const pendingCounts = useMemo(() => {
    if (!loggedInDesk) return {} as Record<ServiceType, number>;

    const counts: Record<ServiceType, number> = {
        'TRIAGEM': 0,
        'ATERMACAO': 0,
        'ATENDIMENTO': 0,
    };

    const allWaiting = [...state.waitingNormal, ...state.waitingPreferential];

    for (const service of loggedInDesk.services) {
        counts[service] = allWaiting.filter(ticket => ticket.service === service).length;
    }

    return counts;

  }, [state.waitingNormal, state.waitingPreferential, loggedInDesk]);

  const handleServiceSelectionChange = (service: ServiceType) => {
    setSelectedServices(prev => {
      if (prev.includes(service)) {
        return prev.filter(s => s !== service);
      } else {
        return [...prev, service];
      }
    });
  };

  const handleDeskLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedDeskId && currentUser && selectedServices.length > 0) {
      const user = { id: currentUser.id, displayName: getDisplayName(currentUser.fullName) };
      login(selectedDeskId, user, selectedServices);
    } else if (selectedServices.length === 0) {
      alert("Por favor, selecione ao menos um tipo de serviço para atender.");
    }
  };

  const handleLogout = () => {
    if (loggedInDesk) {
      logout(loggedInDesk.id);
      setSelectedDeskId(null);
      setSelectedServices([]);
      setView('select_desk');
    }
  };
  
  const handleStartService = () => {
    if (loggedInDesk?.currentTicketInfo) {
      startService(loggedInDesk.id);
      if (loggedInDesk.currentTicketInfo.service === 'TRIAGEM') {
        setIsAgendaModalOpen(true);
      }
    }
  };

  const handleEndService = () => {
    if (loggedInDesk) {
        endService(loggedInDesk.id);
    }
  };

  const handleCallNormal = () => {
    if (loggedInDesk) {
      callSpecificTicket(loggedInDesk.id, 'NORMAL');
    }
  };

  const handleCallPreferential = () => {
    if (loggedInDesk) {
      callSpecificTicket(loggedInDesk.id, 'PREFERENCIAL');
    }
  };
  
  const handleReturnToDesk = () => {
    if (myActiveDesk) {
      setSelectedDeskId(myActiveDesk.id);
    }
  };
  
  const switchToLoginView = () => {
      setSelectedDeskId(null);
      setSelectedServices([]);
      setView('select_desk');
  }

  const formatTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
    const seconds = (totalSeconds % 60).toString().padStart(2, '0');
    return `${minutes}:${seconds}`;
  };

  if (!currentUser) {
    return <div>Carregando...</div>;
  }

  if (loggedInDesk) {
    const isWaitingForAttendantAction = loggedInDesk.currentTicketInfo && !isServiceActive;

    return (
        <>
      <div className="flex justify-center items-center h-full p-4 bg-black">
        <div className="w-full max-w-5xl p-4 bg-gray-900 rounded-xl grid grid-cols-1 lg:grid-cols-3 gap-4" style={{ height: 'calc(100vh - 120px)'}}>
          
          {/* Coluna Principal de Ações */}
          <div className="lg:col-span-2 bg-gray-800 rounded-lg p-6 flex flex-col justify-between border border-gray-700">
            <div className="text-center">
              <p className="text-xl text-white font-semibold">Senha Chamada</p>
              <p className="text-7xl md:text-8xl font-mono font-extrabold text-white my-2 leading-tight">
                {loggedInDesk.currentTicketInfo?.number || '----'}
              </p>
              {loggedInDesk.currentTicketInfo && (
                <p className="text-xl text-gray-300 font-semibold -mt-2 mb-4">
                  Serviço: {ServiceTypeDetails[loggedInDesk.currentTicketInfo.service].title}
                </p>
              )}
              {loggedInDesk.currentTicketInfo && !isServiceActive && waitingSinceCall > 0 && (
                <div className="flex items-center justify-center gap-2 text-yellow-400 text-lg font-medium bg-gray-700 px-3 py-1 rounded-full w-auto mx-auto mb-4">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                  <span>Espera:</span>
                  <span className="font-mono">{formatTime(waitingSinceCall)}</span>
                </div>
              )}
               {isServiceActive && (
                 <div className="flex items-center justify-center gap-2 text-white text-xl font-medium bg-gray-700 px-3 py-1 rounded-full w-auto mx-auto">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                    <span>Duração:</span>
                    <span className="font-mono">{formatTime(elapsedTime)}</span>
                  </div>
               )}
            </div>
            
            <div className="mt-6 space-y-4">
              {loggedInDesk.currentTicketInfo && (
                isServiceActive ? (
                  <button onClick={handleEndService} className="w-full bg-green-600 text-white font-bold py-4 rounded-lg text-xl hover:bg-green-700 transition-colors duration-300 shadow-md">
                    Encerrar Atendimento
                  </button>
                ) : (
                  <button onClick={handleStartService} className="w-full bg-red-600 text-white font-bold py-4 rounded-lg text-xl hover:bg-red-700 transition-transform transform hover:scale-105 duration-300 shadow-md">
                    Iniciar Atendimento
                  </button>
                )
              )}
              {!isServiceActive && (
                  <div className="grid grid-cols-2 gap-4">
                    <button
                        onClick={handleCallPreferential}
                        disabled={pendingPreferential === 0}
                        className="w-full font-bold py-4 px-2 rounded-lg text-lg transition-transform transform hover:scale-105 duration-300 shadow-md flex flex-col items-center justify-center bg-yellow-500 hover:bg-yellow-600 text-gray-900 disabled:bg-gray-600 disabled:text-gray-400 disabled:cursor-not-allowed disabled:transform-none"
                    >
                        <span>Chamar Preferencial</span>
                        <span className="text-2xl font-black">{pendingPreferential}</span>
                    </button>
                    <button
                        onClick={handleCallNormal}
                        disabled={pendingNormal === 0}
                        className="w-full font-bold py-4 px-2 rounded-lg text-lg transition-transform transform hover:scale-105 duration-300 shadow-md flex flex-col items-center justify-center bg-blue-600 hover:bg-blue-700 text-white disabled:bg-gray-600 disabled:text-gray-400 disabled:cursor-not-allowed disabled:transform-none"
                    >
                        <span>Chamar Normal</span>
                        <span className="text-2xl font-black">{pendingNormal}</span>
                    </button>
                </div>
              )}
            </div>
          </div>

          {/* Coluna Lateral de Informações */}
          <div className="lg:col-span-1 flex flex-col gap-4">
            <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
              <h2 className="text-xl font-bold text-white">Mesa {loggedInDesk.id}</h2>
              <p className="text-gray-300 truncate">Atendente: {loggedInDesk.user?.displayName}</p>
              <p className="text-gray-400 text-sm mt-1">
                Serviços: {loggedInDesk.services.map(s => ServiceTypeDetails[s].title).join(', ')}
              </p>
            </div>
            <button onClick={() => setIsAgendaModalOpen(true)} className="bg-blue-600 text-white font-semibold py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors duration-300 flex items-center justify-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"></rect><line x1="16" x2="16" y1="2" y2="6"></line><line x1="8" x2="8" y1="2" y2="6"></line><line x1="3" x2="21" y1="10" y2="10"></line></svg>
                Novo Agendamento
            </button>
            <div className="bg-gray-800 p-4 rounded-lg border border-gray-700 flex-grow">
              <h3 className="text-md font-semibold text-white mb-3 text-center">Senhas em Espera</h3>
              <div className="flex flex-col justify-center space-y-3 h-full">
                  {loggedInDesk.services.length > 0 ? (
                      loggedInDesk.services.map(service => (
                          <div key={service} className="flex justify-between items-center">
                              <p className="text-gray-300">{ServiceTypeDetails[service].title}</p>
                              <p className="text-2xl font-bold text-white bg-gray-700 rounded-md px-2">
                                  {pendingCounts[service] ?? 0}
                              </p>
                          </div>
                      ))
                  ) : (
                      <p className="text-gray-500 text-center">Nenhum serviço selecionado.</p>
                  )}
              </div>
            </div>
            <button onClick={handleLogout} className="bg-red-600 text-white font-semibold py-3 px-4 rounded-lg hover:bg-red-700 transition-colors duration-300 flex items-center justify-center gap-1.5">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
              Sair da Mesa
            </button>
          </div>

        </div>
      </div>
      {isAgendaModalOpen && currentUser && (
        <AgendaModal
            onClose={() => setIsAgendaModalOpen(false)}
            attendant={{ id: currentUser.id, name: getDisplayName(currentUser.fullName) }}
            ticketNumber={loggedInDesk.currentTicketInfo?.number ?? 'MANUAL'}
        />
      )}
      </>
    );
  }

  if (myActiveDesk && view === 'return') {
    return (
      <div className="flex items-center justify-center h-full p-4 bg-black">
        <div className="w-full max-w-sm p-8 bg-gray-900 rounded-xl text-center">
            <h2 className="text-2xl font-bold text-white mb-4">Bem-vindo(a) de volta!</h2>
            <p className="text-gray-400 mb-8">Você já está logado na Mesa {myActiveDesk.id}.</p>
            <button
                onClick={handleReturnToDesk}
                className="w-full bg-red-600 text-white font-bold py-4 rounded-xl text-xl hover:bg-red-700 transition-colors duration-300 shadow-lg"
            >
                Retornar à Mesa
            </button>
             <div className="mt-8 text-center border-t border-gray-700 pt-6">
                <button
                    onClick={switchToLoginView}
                    className="text-red-400 hover:underline"
                >
                    Não é sua mesa? Fazer novo login
                </button>
            </div>
        </div>
      </div>
    );
  }

  // Select Desk form
  return (
    <div className="flex items-center justify-center h-full p-4 bg-black">
      <form onSubmit={handleDeskLogin} className="w-full max-w-sm p-8 bg-gray-900 rounded-xl relative">
        <h2 className="text-2xl font-bold text-center text-white mb-2">Login da Mesa de Atendimento</h2>
        <p className="text-center text-gray-400 mb-8">Olá, {getDisplayName(currentUser.fullName)}!</p>
        <div className="mb-4">
          <label htmlFor="desk" className="block text-gray-300 text-sm font-bold mb-2">
            Número da Mesa
          </label>
          <select
            id="desk"
            onChange={(e) => setSelectedDeskId(Number(e.target.value))}
            value={selectedDeskId ?? ''}
            required
            className="bg-gray-800 shadow-sm appearance-none border border-gray-700 rounded-lg w-full py-3 px-4 text-white leading-tight focus:outline-none focus:ring-2 focus:ring-red-500"
          >
            <option value="" disabled>Selecione uma mesa disponível</option>
            {availableDesks.map(desk => (
              <option key={desk.id} value={desk.id}>
                Mesa {desk.id}
              </option>
            ))}
          </select>
        </div>
        <div className="mb-6">
            <label className="block text-gray-300 text-sm font-bold mb-2">
                Tipos de Atendimento
            </label>
            <div className="space-y-2 mt-2">
                {Object.entries(ServiceTypeDetails).map(([key, { title }]) => {
                    const serviceType = key as ServiceType;
                    return (
                        <label key={key} className="flex items-center space-x-3 bg-gray-800 p-3 rounded-lg cursor-pointer hover:bg-gray-700 transition-colors">
                            <input
                                type="checkbox"
                                value={serviceType}
                                checked={selectedServices.includes(serviceType)}
                                onChange={() => handleServiceSelectionChange(serviceType)}
                                className="h-5 w-5 rounded border-gray-600 bg-gray-700 text-red-600 focus:ring-red-500 focus:ring-offset-gray-900"
                            />
                            <span className="text-white">{title}</span>
                        </label>
                    );
                })}
            </div>
        </div>
        <button
          type="submit"
          className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-4 rounded-lg focus:outline-none focus:shadow-outline transition-transform transform hover:scale-105 duration-300 disabled:bg-gray-500 disabled:cursor-not-allowed"
          disabled={!selectedDeskId || selectedServices.length === 0}
        >
          Entrar na Mesa
        </button>
      </form>
    </div>
  );
};