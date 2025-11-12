import { QueueState, CompletedService, AbandonedTicket, User, ActivityLog } from '../types';

const QUEUE_STORAGE_KEY = 'guarulhosCourtQueue';
const HISTORY_STORAGE_KEY = 'guarulhosCourtHistory';
const USERS_STORAGE_KEY = 'guarulhosCourtUsers';
const ACTIVITY_LOG_STORAGE_KEY = 'guarulhosCourtActivityLog';

type DailyHistory = {
  completedServices: CompletedService[];
  abandonedTickets: AbandonedTicket[];
};

type FullHistory = Record<string, DailyHistory>;

class StorageService {
    public readonly QUEUE_STORAGE_KEY = QUEUE_STORAGE_KEY;
    public readonly HISTORY_STORAGE_KEY = HISTORY_STORAGE_KEY;
    public readonly USERS_STORAGE_KEY = USERS_STORAGE_KEY;
    public readonly ACTIVITY_LOG_STORAGE_KEY = ACTIVITY_LOG_STORAGE_KEY;

    private safeJSONParse<T>(item: string | null): T | null {
        if (!item) return null;
        try {
            return JSON.parse(item) as T;
        } catch (error) {
            console.error("Error parsing JSON from localStorage", error);
            return null;
        }
    }

    public getQueueState(): QueueState | null {
        const item = window.localStorage.getItem(this.QUEUE_STORAGE_KEY);
        return this.safeJSONParse<QueueState>(item);
    }

    public saveQueueState(state: QueueState): void {
        try {
            window.localStorage.setItem(this.QUEUE_STORAGE_KEY, JSON.stringify(state));
        } catch (error) {
            console.error("Error writing to localStorage", error);
        }
    }

    public getHistory(): FullHistory {
        const item = window.localStorage.getItem(this.HISTORY_STORAGE_KEY);
        return this.safeJSONParse<FullHistory>(item) || {};
    }

    public archiveDay(dateKey: string, data: DailyHistory): void {
        const history = this.getHistory();
        history[dateKey] = data;
        try {
            window.localStorage.setItem(this.HISTORY_STORAGE_KEY, JSON.stringify(history));
        } catch (error) {
            console.error("Error writing history to localStorage", error);
        }
    }

    public findTicketInHistory(ticketNumberQuery: string): any[] {
        const query = ticketNumberQuery.toUpperCase();
        const allResults: any[] = [];
        const history = this.getHistory();
        const liveState = this.getQueueState();

        if (liveState) {
            const todayCompleted = liveState.completedServices.filter(s => s.ticketNumber.toUpperCase() === query);
            todayCompleted.forEach(s => allResults.push({ ...s, user: s.userName, date: new Date(), status: 'Atendido' }));
            
            const todayAbandoned = liveState.abandonedTickets.filter(t => t.ticketNumber.toUpperCase() === query);
            todayAbandoned.forEach(t => allResults.push({ ...t, user: t.userName, date: new Date(), status: 'Abandonado' }));
        }

        for (const dateKey in history) {
            const dayData = history[dateKey];
            const completed = dayData.completedServices.filter(s => s.ticketNumber.toUpperCase() === query);
            completed.forEach(s => allResults.push({ ...s, user: s.userName, date: new Date(dateKey + 'T00:00:00'), status: 'Atendido' }));

            const abandoned = dayData.abandonedTickets.filter(t => t.ticketNumber.toUpperCase() === query);
            abandoned.forEach(t => allResults.push({ ...t, user: t.userName, date: new Date(dateKey + 'T00:00:00'), status: 'Abandonado' }));
        }

        allResults.sort((a, b) => (b.completedTimestamp || b.abandonedTimestamp) - (a.completedTimestamp || a.abandonedTimestamp));
        
        return allResults;
    }

    // User Management
    public getUsers(): User[] {
        const item = window.localStorage.getItem(this.USERS_STORAGE_KEY);
        return this.safeJSONParse<User[]>(item) || [];
    }

    public saveUsers(users: User[]): void {
        try {
            window.localStorage.setItem(this.USERS_STORAGE_KEY, JSON.stringify(users));
        } catch (error) {
            console.error("Error writing users to localStorage", error);
        }
    }
    
    // Activity Log Management
    public getActivityLogs(): ActivityLog[] {
        const item = window.localStorage.getItem(this.ACTIVITY_LOG_STORAGE_KEY);
        return this.safeJSONParse<ActivityLog[]>(item) || [];
    }
    
    public saveActivityLogs(logs: ActivityLog[]): void {
        try {
            window.localStorage.setItem(this.ACTIVITY_LOG_STORAGE_KEY, JSON.stringify(logs));
        } catch (error) {
            console.error("Error writing activity logs to localStorage", error);
        }
    }
}

export const storageService = new StorageService();
