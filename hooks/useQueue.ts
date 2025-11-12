
import { useContext } from 'react';
import { QueueContext } from '../context/QueueContext';

export const useQueue = () => {
  const context = useContext(QueueContext);
  if (context === undefined) {
    throw new Error('useQueue must be used within a QueueProvider');
  }
  return context;
};
