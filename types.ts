export type ServiceType = 'TRIAGEM' | 'ATERMACAO' | 'ATENDIMENTO';

export const ServiceTypeDetails: Record<ServiceType, { title: string, description: string }> = {
    'TRIAGEM': { title: 'Triagem', description: '1° atendimento' },
    'ATERMACAO': { title: 'Atermação', description: 'Retorno agendado' },
    'ATENDIMENTO': { title: 'Atendimento', description: 'Informações de processos ou atendimento a intimação' }
};

export type UserRole = 'ATTENDANT' | 'MANAGER';

export interface User {
  id: string; // Will use CPF as ID
  fullName: string;
  cpf: string;
  passwordHash: string; // base64 encoded string
  role: UserRole;
  isActive: boolean;
  profilePicture: string | null; // base64 encoded image
  createdAt: number;
  history: {
    statusChanges: { timestamp: number; active: boolean; changedBy: string; changedByName: string; }[];
    passwordResets: { timestamp: number; changedBy: string; changedByName: string; }[];
  };
}

export interface ActivityLog {
    id: string; // uuid
    userId: string;
    userName: string;
    timestamp: number;
    type: 'LOGIN' | 'LOGOUT';
    duration?: number;
}

export interface WaitingTicket {
  number: string;
  dispenseTimestamp: number;
  type: 'NORMAL' | 'PREFERENCIAL';
  service: ServiceType;
}

export interface CompletedService {
  ticketNumber: string;
  deskId: number;
  userId: string;
  userName: string;
  serviceDuration: number;
  waitTime: number;
  completedTimestamp: number;
  service: ServiceType;
}

export interface AbandonedTicket {
  ticketNumber: string;
  deskId: number;
  userId: string;
  userName: string;
  calledTimestamp: number;
  abandonedTimestamp: number;
  type: 'NORMAL' | 'PREFERENCIAL';
  waitTime: number; // Time from dispense to call
  service: ServiceType;
}

export interface CalledTicket {
  ticketNumber: string;
  deskNumber: number;
  timestamp: number;
  type: 'NORMAL' | 'PREFERENCIAL';
}

export interface ServiceDesk {
  id: number;
  user: { id: string; displayName: string } | null;
  currentTicket: string | null;
  currentTicketInfo: WaitingTicket | null;
  serviceStartTime: number | null;
  services: ServiceType[];
}

export type LocalRetorno = 'JEC Central' | 'Anexo FIG' | 'Anexo ENIAC';

export const LocaisRetorno: Record<LocalRetorno, string> = {
    'JEC Central': 'Rua dos Crisântemos, 29 – Vila Tijuco, Guarulhos/SP',
    'Anexo FIG': 'Rua São Luís, 315 – Vila Rosália, Guarulhos/SP',
    'Anexo ENIAC': 'Rua Força Pública, 89 – Centro, Guarulhos/SP'
};

export interface AgendaEntry {
    id: string;
    ticketNumber: string;
    nome: string;
    cpf: string;
    telefone: string;
    whatsapp_mesmo: boolean;
    email: string;
    resumo: string;
    data_retorno: string; // YYYY-MM-DD
    hora_retorno: string; // HH:MM
    local_retorno: LocalRetorno;
    documentos_selecionados: string[];
    outros_documentos_texto?: string;
    data_do_registro: number;
    atendente_id: string;
    atendente_responsavel: string;
    status: 'AGENDADO' | 'CONCLUÍDO' | 'CANCELADO';
}


export interface QueueState {
  nextNormalTicket: number;
  nextPreferentialTicket: number;
  waitingNormal: WaitingTicket[];
  waitingPreferential: WaitingTicket[];
  calledHistory: CalledTicket[];
  desks: ServiceDesk[];
  completedServices: CompletedService[];
  abandonedTickets: AbandonedTicket[];
  tips: string[];
  alertMessage: string | null;
  agenda: AgendaEntry[];
}