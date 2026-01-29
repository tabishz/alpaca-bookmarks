import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';

interface UndoToastProps {
  message: string;
  duration: number;
  onUndo: () => void;
  onDismiss: () => void;
  id: string; // Add id to props
}

export const UndoToast: React.FC<UndoToastProps> = ({ message, duration, onUndo, onDismiss }) => {
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    // This effect handles the countdown progress bar
    const intervalTime = 100; // update every 100ms
    const decrement = 100 / (duration / intervalTime);
    const interval = setInterval(() => {
      setProgress(prev => Math.max(0, prev - decrement));
    }, intervalTime);

    return () => clearInterval(interval);
  }, [duration]);

  const handleUndo = () => {
    onUndo();
  };

  return (
    <div className="bg-surface border border-gray-700 rounded-lg shadow-xl p-4 w-full max-w-sm animate-in fade-in slide-in-from-bottom duration-300">
      <div className="flex items-center justify-between">
        <span className="text-text text-sm">{message}</span>
        <div className="flex items-center gap-4 ml-4">
          <button onClick={handleUndo} className="font-bold text-primary hover:underline text-sm flex-shrink-0">Undo</button>
          <button onClick={onDismiss} className="text-gray-500 hover:text-white"><X size={18} /></button>
        </div>
      </div>
      <div className="mt-2 h-1 bg-primary/20 rounded-full w-full overflow-hidden">
        <div
          className="h-1 bg-primary"
          style={{ width: `${progress}%`, transition: 'width 0.1s linear' }}
        ></div>
      </div>
    </div>
  );
};
