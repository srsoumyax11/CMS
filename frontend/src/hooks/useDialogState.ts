import { useState, useCallback } from 'react';

export function useDialogState<T = any>() {
  const [isOpen, setIsOpen] = useState(false);
  const [data, setData] = useState<T | null>(null);

  const open = useCallback((payload?: T) => {
    setIsOpen(true);
    if (payload !== undefined) {
      setData(payload);
    }
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
    setData(null);
  }, []);

  return { isOpen, data, open, close, setIsOpen };
}
