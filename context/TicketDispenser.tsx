import React, { useState } from 'react';
import { useQueue } from '../hooks/useQueue';
import { ServiceType, ServiceTypeDetails } from '../types';
import { ServerStatusIndicator } from '../components/ServerStatusIndicator';

declare global {
  interface Window {
    jspdf: any;
  }
}

// Define colors for each service type for better visual distinction in dark mode
const serviceColors: Record<ServiceType, { border: string; hoverBg: string; text: string }> = {
    'TRIAGEM': {
        border: 'border-blue-500 hover:border-blue-400',
        hoverBg: 'hover:bg-gray-700',
        text: 'text-blue-300'
    },
    'ATERMACAO': {
        border: 'border-orange-500 hover:border-orange-400',
        hoverBg: 'hover:bg-gray-700',
        text: 'text-orange-300'
    },
    'ATENDIMENTO': {
        border: 'border-green-500 hover:border-green-400',
        hoverBg: 'hover:bg-gray-700',
        text: 'text-green-300'
    }
};

export const TicketDispenser: React.FC = () => {
  const { dispenseTicket, reinsertTicket, state } = useQueue();
  const [step, setStep] = useState<'type' | 'service' | 'reinsert' | 'confirmation'>('type');
  const [selectedType, setSelectedType] = useState<'NORMAL' | 'PREFERENCIAL' | null>(null);
  const [lastTicket, setLastTicket] = useState<{ number: string; service: ServiceType } | null>(null);
  const [isDispensing, setIsDispensing] = useState(false);
  const [reinsertTicketNumber, setReinsertTicketNumber] = useState('');
  const [reinsertMessage, setReinsertMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isServerOnline, setIsServerOnline] = useState(false);

  const handleTypeSelect = (type: 'NORMAL' | 'PREFERENCIAL') => {
    setSelectedType(type);
    setStep('service');
  };

  const handleServiceSelect = async (service: ServiceType) => {
    if (isDispensing || !selectedType) return;
    setIsDispensing(true);
    try {
        const newTicketNumber = await dispenseTicket(selectedType, service);
        setLastTicket({ number: newTicketNumber, service });
        setStep('confirmation');
    } catch (error) {
        console.error("Failed to dispense ticket:", error);
        if (error instanceof Error) {
            alert(error.message);
        } else {
            alert('Ocorreu um erro desconhecido ao emitir a senha.');
        }
    } finally {
        setIsDispensing(false);
    }
  };

  const handleReinsertSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isDispensing || !reinsertTicketNumber) return;
    setIsDispensing(true);
    setReinsertMessage(null);
    try {
        const result = await reinsertTicket(reinsertTicketNumber);
        if (result.success) {
            setReinsertMessage({ type: 'success', text: result.message });
        } else {
            let errorMessage = result.message;
            if (result.details) {
                const { deskId, user, timestamp } = result.details;
                const time = new Date(timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
                errorMessage = `Essa senha já foi atendida na Mesa ${deskId} por ${user} às ${time}.`;
            }
            setReinsertMessage({ type: 'error', text: errorMessage });
        }
    } catch (error) {
        setReinsertMessage({ type: 'error', text: 'Ocorreu um erro ao reinserir a senha.' });
    } finally {
        setIsDispensing(false);
        setReinsertTicketNumber('');
    }
  };

  const resetToStart = () => {
    setStep('type');
    setSelectedType(null);
    setLastTicket(null);
    setReinsertMessage(null);
    setReinsertTicketNumber('');
  };

  const handlePrintThermal = () => {
    if (!lastTicket) return;

    const typeLabel = lastTicket.number.startsWith('N') ? 'Atendimento Normal' : 'Atendimento Preferencial';
    const serviceLabel = ServiceTypeDetails[lastTicket.service].title;
    const timestamp = new Date().toLocaleString('pt-BR');

    const ticketHTML = `
        <html>
        <head>
            <title>Senha ${lastTicket.number}</title>
            <style>
                body {
                    font-family: 'Courier New', monospace;
                    width: 72mm; /* Standard thermal printer width */
                    margin: 0;
                    padding: 5mm;
                    color: #000;
                    font-size: 10pt;
                }
                .center { text-align: center; }
                h1 { font-size: 12pt; margin: 0 0 5px 0; }
                p { margin: 2px 0; }
                .ticket-number { font-size: 36pt; font-weight: bold; margin: 10px 0; }
                hr { border: none; border-top: 1px dashed #000; margin: 8px 0; }
            </style>
        </head>
        <body>
            <div class="center">
                <h1>Juizado Especial Cível de Guarulhos</h1>
                <hr>
                <p>${typeLabel}</p>
                <p>Serviço: ${serviceLabel}</p>
                <hr>
                <div class="ticket-number">${lastTicket.number}</div>
                <p>${timestamp}</p>
                <p>Aguarde ser chamado no painel.</p>
            </div>
        </body>
        </html>
    `;

    const printWindow = window.open('', '_blank', 'width=300,height=400');
    if (printWindow) {
        printWindow.document.write(ticketHTML);
        printWindow.document.close();
        printWindow.focus();
        printWindow.print();
        setTimeout(() => {
            printWindow.close();
        }, 500);
    } else {
        alert('O bloqueador de pop-ups pode estar impedindo a impressão. Por favor, habilite pop-ups para este site.');
    }
  };

  const renderContent = () => {
    switch (step) {
      case 'type':
        return (
          <>
            <h2 className="text-3xl font-bold text-white mb-8">Retire sua Senha</h2>
            <div className="space-y-6">
              <button onClick={() => handleTypeSelect('NORMAL')} disabled={!isServerOnline} className="w-full bg-blue-600 text-white font-bold py-6 px-4 rounded-xl text-2xl hover:bg-blue-700 transition-transform transform hover:scale-105 duration-300 shadow-lg disabled:bg-gray-600 disabled:cursor-not-allowed disabled:transform-none">Atendimento Normal</button>
              <button onClick={() => handleTypeSelect('PREFERENCIAL')} disabled={!isServerOnline} className="w-full bg-yellow-500 text-gray-900 font-bold py-6 px-4 rounded-xl text-2xl hover:bg-yellow-600 transition-transform transform hover:scale-105 duration-300 shadow-lg disabled:bg-gray-600 disabled:cursor-not-allowed disabled:transform-none">Atendimento Preferencial</button>
            </div>
            <div className="mt-8">
                <button 
                    onClick={() => setStep('reinsert')} 
                    disabled={!isServerOnline}
                    className="w-full bg-gray-300 text-gray-800 font-semibold py-3 px-4 rounded-xl text-lg hover:bg-gray-400 transition-colors duration-300 disabled:bg-gray-500 disabled:cursor-not-allowed"
                >
                    Reinserir Senha
                </button>
            </div>
          </>
        );
      case 'service':
        return (
          <>
            <button onClick={() => setStep('type')} className="absolute top-4 left-4 text-red-400 font-semibold flex items-center gap-1">&larr; Voltar</button>
            <h2 className="text-3xl font-bold text-white mb-8">Selecione o Serviço</h2>
            <div className="space-y-4">
              {Object.entries(ServiceTypeDetails).map(([key, { title, description }]) => {
                const serviceType = key as ServiceType;
                const colors = serviceColors[serviceType];
                return (
                    <button
                        key={key}
                        onClick={() => handleServiceSelect(serviceType)}
                        disabled={isDispensing || !isServerOnline}
                        className={`w-full text-left bg-gray-800 border-2 p-4 rounded-lg transition-colors duration-200 disabled:opacity-50 ${colors.border} ${colors.hoverBg}`}
                    >
                        <p className={`font-bold text-xl ${colors.text}`}>{title}</p>
                        <p className="text-gray-400">{description}</p>
                    </button>
                );
              })}
            </div>
          </>
        );
      case 'reinsert':
        return (
            <>
                <button onClick={resetToStart} className="absolute top-4 left-4 text-red-400 font-semibold flex items-center gap-1">&larr; Voltar</button>
                <h2 className="text-3xl font-bold text-white mb-6">Reinserir Senha</h2>
                <p className="text-gray-400 mb-6">Digite o número da sua senha que não foi atendida. Ela será colocada novamente no final da fila.</p>
                <form onSubmit={handleReinsertSubmit} className="space-y-4">
                    <input
                        type="text"
                        value={reinsertTicketNumber}
                        onChange={(e) => setReinsertTicketNumber(e.target.value.toUpperCase())}
                        placeholder="Ex: N023"
                        className="w-full text-center text-2xl font-mono p-3 border-2 bg-gray-800 border-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                        required
                    />
                    <button type="submit" disabled={isDispensing || !isServerOnline} className="w-full bg-red-600 text-white font-bold py-4 rounded-xl text-xl hover:bg-red-700 transition-colors duration-300 shadow-lg disabled:bg-gray-400 disabled:cursor-not-allowed">
                        {isDispensing ? 'Verificando...' : 'Confirmar'}
                    </button>
                </form>
                {reinsertMessage && (
                    <div className={`mt-6 p-4 rounded-lg text-center font-semibold ${reinsertMessage.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {reinsertMessage.text}
                    </div>
                )}
            </>
        );
      case 'confirmation':
        return (
          <>
            <div className="p-6 border-2 border-dashed border-gray-600 rounded-lg bg-gray-800">
              <p className="text-lg text-gray-300">Sua senha é:</p>
              <p className="text-7xl font-mono font-extrabold text-white my-2">{lastTicket?.number}</p>
              <p className="text-md text-gray-300 font-semibold mb-4">Serviço: {ServiceTypeDetails[lastTicket!.service].title}</p>
              <p className="text-gray-300">Aguarde ser chamado no painel.</p>
              <button onClick={handlePrintThermal} className="mt-4 w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors shadow-md flex items-center justify-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
                Imprimir Senha
              </button>
            </div>
            <button onClick={resetToStart} className="mt-8 w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-4 px-4 rounded-xl text-xl transition-colors duration-300 shadow-lg">
                Emitir Nova Senha
            </button>
          </>
        );
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-full p-4 bg-black">
      <div className="relative w-full max-w-md p-8 bg-gray-900 rounded-2xl text-center">
        {renderContent()}
        <div className="mt-10 text-sm text-gray-400">
          <p>Senhas na fila Normal: {state.waitingNormal.length}</p>
          <p>Senhas na fila Preferencial: {state.waitingPreferential.length}</p>
          <ServerStatusIndicator onStatusChange={setIsServerOnline} />
        </div>
      </div>
    </div>
  );
};