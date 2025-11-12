import React, { createContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { QueueState, ServiceDesk, WaitingTicket, CompletedService, AbandonedTicket, ServiceType, AgendaEntry } from '../types';
import { storageService } from '../services/storageService';

const TOTAL_DESKS = 20;

export interface ReinsertResult {
  success: boolean;
  message: string;
  details?: {
    deskId: number;
    user: string;
    timestamp: number;
  };
}

const defaultTips = [
    "Consulte seu processo regularmente no site do Tribunal de Justiça. Acompanhar o andamento é sua responsabilidade.",
    "Prazos são importantes. Perder um prazo pode levar à extinção do seu processo. Fique atento às intimações.",
    "Mantenha seus dados atualizados. Informe ao cartório qualquer mudança de endereço, telefone ou e-mail.",
    "A primeira audiência é para tentativa de acordo (conciliação). Sua presença é obrigatória.",
    "A ausência do autor na audiência de conciliação resulta no arquivamento do processo.",
    "Leve todos os documentos originais que comprovem seu direito no dia da audiência.",
    "Em causas de até 20 salários mínimos, você não precisa de advogado. Acima disso, a presença de um é obrigatória.",
    "Comunicações oficiais são feitas pelo Diário de Justiça Eletrônico ou no sistema do processo.",
    "O cartório pode usar WhatsApp ou e-mail para intimações desde que sejam autorizados pela parte. Ofereça seu e-mail e não perca nenhuma intimação.",
    "Atermação é o ato de registrar seu pedido inicial no Juizado, transformando sua reclamação em um processo.",
    "Se a outra parte não cumprir a sentença, você deve pedir o 'Cumprimento de Sentença' para iniciar a cobrança.",
    "Para apresentar um recurso contra a sentença, a contratação de um advogado é obrigatória.",
    "Se não puder pagar as custas de um recurso, peça a 'Justiça Gratuitá', comprovando sua necessidade.",
    "Seja claro e objetivo em seus pedidos e depoimentos, focando nos fatos importantes para a sua causa.",
    "Guarde todas as provas: e-mails, notas fiscais, contratos, conversas de WhatsApp e outros documentos.",
    "Muitas audiências são conduzidas por um Juiz Leigo, que prepara uma proposta de sentença para o Juiz Togado aprovar.",
    "Trate todos com respeito durante as audiências – a parte contrária, advogados e servidores.",
    "Um acordo pode resolver seu problema de forma mais rápida e eficaz. Esteja aberto a negociar.",
    "O acesso ao Juizado Especial Cível é gratuito na primeira instância. Custas só são cobradas em caso de recurso.",
    "Se tiver dúvidas sobre o andamento do processo, procure o balcão de atendimento do cartório."
];

const initialDesks: ServiceDesk[] = Array.from({ length: TOTAL_DESKS }, (_, i) => ({
  id: i + 1,
  user: null,
  currentTicket: null,
  currentTicketInfo: null,
  serviceStartTime: null,
  services: [],
}));

const initialState: QueueState = {
  nextNormalTicket: 1,
  nextPreferentialTicket: 1,
  waitingNormal: [],
  waitingPreferential: [],
  calledHistory: [],
  desks: initialDesks,
  completedServices: [],
  abandonedTickets: [],
  tips: defaultTips,
  alertMessage: null,
  agenda: [],
};

interface QueueContextType {
  state: QueueState;
  dispenseTicket: (type: 'NORMAL' | 'PREFERENCIAL', service: ServiceType) => Promise<string>;
  callNextTicket: (deskId: number) => void;
  login: (deskId: number, user: { id: string; displayName: string }, services: ServiceType[]) => void;
  logout: (deskId: number) => void;
  startService: (deskId: number) => void;
  endService: (deskId: number) => void;
  resetSystem: () => void;
  reinsertTicket: (ticketNumber: string) => Promise<ReinsertResult>;
  updateTips: (newTips: string[]) => void;
  setAlertMessage: (message: string) => void;
  clearAlertMessage: () => void;
  addAgendaEntry: (entryData: Omit<AgendaEntry, 'id' | 'data_do_registro' | 'status'>) => Promise<void>;
  updateAgendaEntry: (updatedEntry: AgendaEntry) => Promise<void>;
  cancelAgendaEntry: (entryId: string) => Promise<void>;
}

export const QueueContext = createContext<QueueContextType | undefined>(undefined);

const getInitialState = (): QueueState => {
  const savedState = storageService.getQueueState();
  if (savedState) {
      const migratedDesks = initialDesks.map(defaultDesk => {
        const savedDesk = savedState.desks.find((d: ServiceDesk) => d.id === defaultDesk.id);
        return savedDesk ? { ...defaultDesk, ...savedDesk } : defaultDesk;
      });
      return { 
        ...initialState, 
        ...savedState, 
        desks: migratedDesks, 
        abandonedTickets: savedState.abandonedTickets || [],
        tips: savedState.tips || defaultTips,
        alertMessage: savedState.alertMessage || null,
        agenda: savedState.agenda || [],
      };
  }
  return initialState;
};

export const QueueProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, setState] = useState<QueueState>(getInitialState);

  useEffect(() => {
    storageService.saveQueueState(state);
  }, [state]);

  const handleStorageChange = useCallback((event: StorageEvent) => {
    if (event.key === storageService.QUEUE_STORAGE_KEY && event.newValue) {
      try {
        setState(JSON.parse(event.newValue));
      } catch (error) {
        console.error("Error parsing localStorage update", error);
      }
    }
  }, []);

  useEffect(() => {
    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [handleStorageChange]);

  const finalizeCurrentTicket = (desk: ServiceDesk, currentState: QueueState): QueueState => {
    if (!desk.user || !desk.currentTicketInfo) {
      return currentState;
    }

    if (desk.serviceStartTime) { // Completed service
      const waitTime = desk.serviceStartTime - desk.currentTicketInfo.dispenseTimestamp;
      const serviceDuration = Date.now() - desk.serviceStartTime;

      const newCompletedService: CompletedService = {
        ticketNumber: desk.currentTicketInfo.number,
        deskId: desk.id,
        userId: desk.user.id,
        userName: desk.user.displayName,
        serviceDuration,
        waitTime,
        completedTimestamp: Date.now(),
        service: desk.currentTicketInfo.service,
      };
      
      return {
        ...currentState,
        completedServices: [newCompletedService, ...currentState.completedServices],
      };
    } else { // Abandoned ticket (no-show)
      const calledInfo = [...currentState.calledHistory]
        .sort((a, b) => b.timestamp - a.timestamp)
        .find(t => t.ticketNumber === desk.currentTicketInfo?.number);
      
      const calledTimestamp = calledInfo ? calledInfo.timestamp : Date.now();
      
      const newAbandonedTicket: AbandonedTicket = {
        ticketNumber: desk.currentTicketInfo.number,
        deskId: desk.id,
        userId: desk.user.id,
        userName: desk.user.displayName,
        calledTimestamp: calledTimestamp,
        abandonedTimestamp: Date.now(),
        type: desk.currentTicketInfo.type,
        waitTime: calledTimestamp - desk.currentTicketInfo.dispenseTimestamp,
        service: desk.currentTicketInfo.service,
      };

      return {
        ...currentState,
        abandonedTickets: [newAbandonedTicket, ...currentState.abandonedTickets],
      };
    }
  };
  
  const dispenseTicket = (type: 'NORMAL' | 'PREFERENCIAL', service: ServiceType): Promise<string> => {
    return new Promise((resolve) => {
      setState(prevState => {
        let ticketNumberStr: string;
        let newTicket: WaitingTicket;
        if (type === 'NORMAL') {
          const ticketNumber = prevState.nextNormalTicket;
          ticketNumberStr = `N${String(ticketNumber).padStart(3, '0')}`;
          newTicket = { number: ticketNumberStr, dispenseTimestamp: Date.now(), type, service };
          resolve(ticketNumberStr);
          return {
            ...prevState,
            nextNormalTicket: ticketNumber + 1,
            waitingNormal: [...prevState.waitingNormal, newTicket],
          };
        } else {
          const ticketNumber = prevState.nextPreferentialTicket;
          ticketNumberStr = `P${String(ticketNumber).padStart(3, '0')}`;
          newTicket = { number: ticketNumberStr, dispenseTimestamp: Date.now(), type, service };
          resolve(ticketNumberStr);
          return {
            ...prevState,
            nextPreferentialTicket: ticketNumber + 1,
            waitingPreferential: [...prevState.waitingPreferential, newTicket],
          };
        }
      });
    });
  };
  
  const callNextTicket = (deskId: number) => {
    setState(prevState => {
        const deskBeingUsed = prevState.desks.find(d => d.id === deskId);
        if (!deskBeingUsed || !deskBeingUsed.user || deskBeingUsed.services.length === 0) {
            return prevState;
        }

        let stateAfterFinalizing = prevState;
        if (deskBeingUsed.currentTicketInfo) {
            stateAfterFinalizing = finalizeCurrentTicket(deskBeingUsed, prevState);
        }

        const { waitingPreferential, waitingNormal, calledHistory, desks } = stateAfterFinalizing;

        const deskServices = deskBeingUsed.services;
        const availablePreferential = waitingPreferential.filter(t => deskServices.includes(t.service));
        const availableNormal = waitingNormal.filter(t => deskServices.includes(t.service));

        const preferentialsCalled = calledHistory.filter(t => t.type === 'PREFERENCIAL').length;
        const normalsCalled = calledHistory.filter(t => t.type === 'NORMAL').length;

        const shouldCallPreferential = availablePreferential.length > 0 &&
            (preferentialsCalled <= normalsCalled / 2 || availableNormal.length === 0);

        let ticketToCall: WaitingTicket | undefined;
        if (shouldCallPreferential) {
            ticketToCall = availablePreferential[0];
        } else if (availableNormal.length > 0) {
            ticketToCall = availableNormal[0];
        } else if (availablePreferential.length > 0) {
            ticketToCall = availablePreferential[0];
        }

        if (!ticketToCall) {
            // No new ticket found. Finalize current and clear the desk.
            const newDesks = desks.map(desk =>
                desk.id === deskId
                    ? { ...desk, currentTicket: null, currentTicketInfo: null, serviceStartTime: null }
                    : desk
            );
            return {
                ...stateAfterFinalizing,
                desks: newDesks,
            };
        }

        let newWaitingPreferential = [...waitingPreferential];
        let newWaitingNormal = [...waitingNormal];
        let ticketFoundAndRemoved = false;

        if (ticketToCall.type === 'PREFERENCIAL') {
            const index = newWaitingPreferential.findIndex(t => t.number === ticketToCall!.number);
            if (index > -1) {
                newWaitingPreferential.splice(index, 1);
                ticketFoundAndRemoved = true;
            }
        } else {
            const index = newWaitingNormal.findIndex(t => t.number === ticketToCall!.number);
            if (index > -1) {
                newWaitingNormal.splice(index, 1);
                ticketFoundAndRemoved = true;
            }
        }

        if (!ticketFoundAndRemoved) {
            console.error("Could not find ticket to remove from queue", ticketToCall);
            // This case is unlikely but if it happens, we should also clear the desk.
            const newDesks = desks.map(desk =>
                desk.id === deskId
                    ? { ...desk, currentTicket: null, currentTicketInfo: null, serviceStartTime: null }
                    : desk
            );
            return {
                ...stateAfterFinalizing,
                desks: newDesks,
            };
        }

        const newCalledTicket = {
            ticketNumber: ticketToCall.number,
            deskNumber: deskId,
            timestamp: Date.now(),
            type: ticketToCall.type,
        };

        const newCalledHistory = [newCalledTicket, ...calledHistory];
        const newDesks = desks.map(desk =>
            desk.id === deskId
                ? { ...desk, currentTicket: ticketToCall!.number, currentTicketInfo: ticketToCall, serviceStartTime: null }
                : desk
        );

        return {
            ...stateAfterFinalizing,
            waitingNormal: newWaitingNormal,
            waitingPreferential: newWaitingPreferential,
            calledHistory: newCalledHistory,
            desks: newDesks,
        };
    });
};


  const login = (deskId: number, user: { id: string; displayName: string }, services: ServiceType[]) => {
    setState(prevState => ({
      ...prevState,
      desks: prevState.desks.map(desk => desk.id === deskId ? { ...desk, user, services } : desk),
    }));
  };

  const logout = (deskId: number) => {
    setState(prevState => {
      const deskToLogout = prevState.desks.find(d => d.id === deskId);
      let stateAfterFinalizing = prevState;
      if (deskToLogout) {
        stateAfterFinalizing = finalizeCurrentTicket(deskToLogout, prevState);
      }
      return {
        ...stateAfterFinalizing,
        desks: stateAfterFinalizing.desks.map(desk => desk.id === deskId ? { ...desk, user: null, currentTicket: null, currentTicketInfo: null, serviceStartTime: null, services: [] } : desk),
      };
    });
  };
  
  const startService = (deskId: number) => {
    setState(prevState => ({
      ...prevState,
      desks: prevState.desks.map(desk => desk.id === deskId ? { ...desk, serviceStartTime: Date.now() } : desk),
    }));
  };

  const endService = (deskId: number) => {
    setState(prevState => {
        const deskToEnd = prevState.desks.find(d => d.id === deskId);
        if (!deskToEnd || !deskToEnd.currentTicketInfo || !deskToEnd.serviceStartTime) {
            return prevState;
        }

        const stateAfterFinalizing = finalizeCurrentTicket(deskToEnd, prevState);
        
        const newDesks = stateAfterFinalizing.desks.map(desk =>
            desk.id === deskId
                ? { ...desk, currentTicket: null, currentTicketInfo: null, serviceStartTime: null }
                : desk
        );

        return {
            ...stateAfterFinalizing,
            desks: newDesks
        };
    });
  };

  const resetSystem = () => {
    if(window.confirm("Tem certeza que deseja reiniciar o sistema? Os dados de hoje serão arquivados e uma nova sessão será iniciada.")) {
      const today = new Date();
      const dateKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

      const historyData = {
          completedServices: state.completedServices,
          abandonedTickets: state.abandonedTickets,
      };

      if (historyData.completedServices.length > 0 || historyData.abandonedTickets.length > 0) {
          storageService.archiveDay(dateKey, historyData);
      }
       
       setState({...initialState, tips: state.tips, alertMessage: state.alertMessage, agenda: state.agenda }); // Keep messages and agenda on reset
    }
  };

  const reinsertTicket = (ticketNumber: string): Promise<ReinsertResult> => {
    return new Promise((resolve) => {
      setState(prevState => {
        const upperCaseTicketNumber = ticketNumber.toUpperCase();

        const completedTicket = prevState.completedServices.find(t => t.ticketNumber.toUpperCase() === upperCaseTicketNumber);
        if (completedTicket) {
            resolve({
                success: false,
                message: `Essa senha já foi atendida.`,
                details: {
                    deskId: completedTicket.deskId,
                    user: completedTicket.userName,
                    timestamp: completedTicket.completedTimestamp,
                }
            });
            return prevState;
        }
        
        const ticketToReinsert = prevState.abandonedTickets.find(t => t.ticketNumber.toUpperCase() === upperCaseTicketNumber);

        if (!ticketToReinsert) {
          resolve({
            success: false,
            message: 'Senha não encontrada na lista de abandonadas ou inválida.'
          });
          return prevState;
        }

        const newWaitingTicket: WaitingTicket = {
          number: ticketToReinsert.ticketNumber,
          type: ticketToReinsert.type,
          service: ticketToReinsert.service,
          dispenseTimestamp: Date.now(),
        };

        const newAbandoned = prevState.abandonedTickets.filter(t => t.ticketNumber.toUpperCase() !== upperCaseTicketNumber);

        if (newWaitingTicket.type === 'NORMAL') {
          resolve({ success: true, message: `Senha ${upperCaseTicketNumber} reinserida na fila com sucesso.` });
          return {
            ...prevState,
            abandonedTickets: newAbandoned,
            waitingNormal: [...prevState.waitingNormal, newWaitingTicket],
          };
        } else {
          resolve({ success: true, message: `Senha ${upperCaseTicketNumber} reinserida na fila com sucesso.` });
          return {
            ...prevState,
            abandonedTickets: newAbandoned,
            waitingPreferential: [...prevState.waitingPreferential, newWaitingTicket],
          };
        }
      });
    });
  };

  const updateTips = (newTips: string[]) => {
    setState(prevState => ({ ...prevState, tips: newTips }));
  };

  const setAlertMessage = (message: string) => {
    setState(prevState => ({ ...prevState, alertMessage: message }));
  };

  const clearAlertMessage = () => {
    setState(prevState => ({ ...prevState, alertMessage: null }));
  };

  const addAgendaEntry = (entryData: Omit<AgendaEntry, 'id' | 'data_do_registro' | 'status'>): Promise<void> => {
    return new Promise((resolve) => {
        setState(prevState => {
            const newEntry: AgendaEntry = {
                ...entryData,
                id: `AGENDA-${Date.now()}-${entryData.ticketNumber}`,
                data_do_registro: Date.now(),
                status: 'AGENDADO',
            };
            const updatedAgenda = [...prevState.agenda, newEntry];
            resolve();
            return {
                ...prevState,
                agenda: updatedAgenda,
            };
        });
    });
  };

  const updateAgendaEntry = (updatedEntry: AgendaEntry): Promise<void> => {
    return new Promise((resolve) => {
        setState(prevState => {
            const updatedAgenda = prevState.agenda.map(entry => 
                entry.id === updatedEntry.id ? updatedEntry : entry
            );
            resolve();
            return { ...prevState, agenda: updatedAgenda };
        });
    });
  };

  const cancelAgendaEntry = (entryId: string): Promise<void> => {
    return new Promise((resolve) => {
        setState(prevState => {
            const updatedAgenda = prevState.agenda.map(entry => 
                // FIX: Explicitly cast status to the correct literal union type to avoid type widening issues with object spread.
                entry.id === entryId ? { ...entry, status: 'CANCELADO' as AgendaEntry['status'] } : entry
            );
            resolve();
            return { ...prevState, agenda: updatedAgenda };
        });
    });
  };


  return (
    <QueueContext.Provider value={{ 
        state, 
        dispenseTicket, 
        callNextTicket, 
        login, 
        logout, 
        startService, 
        endService, 
        resetSystem, 
        reinsertTicket,
        updateTips,
        setAlertMessage,
        clearAlertMessage,
        addAgendaEntry,
        updateAgendaEntry,
        cancelAgendaEntry,
    }}>
      {children}
    </QueueContext.Provider>
  );
};
