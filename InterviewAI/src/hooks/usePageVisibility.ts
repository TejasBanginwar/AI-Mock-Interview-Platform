import { useState, useEffect, useCallback } from 'react';

interface UsePageVisibilityReturn {
  isVisible: boolean;
  isFocused: boolean;
  warningCount: number;
  resetWarningCount: () => void;
}

export const usePageVisibility = (): UsePageVisibilityReturn => {
  const [isVisible, setIsVisible] = useState(true);
  const [isFocused, setIsFocused] = useState(true);
  const [warningCount, setWarningCount] = useState(0);

  const handleVisibilityChange = useCallback(() => {
    const visible = !document.hidden;
    setIsVisible(visible);
    
    if (!visible) {
      // User switched tabs or minimized window
      setWarningCount((prev) => prev + 1);
    }
  }, []);

  const handleFocusChange = useCallback(() => {
    const focused = document.hasFocus();
    setIsFocused(focused);
    
    if (!focused) {
      // User switched to another application
      setWarningCount((prev) => prev + 1);
    }
  }, []);

  useEffect(() => {
    // Check initial state
    setIsVisible(!document.hidden);
    setIsFocused(document.hasFocus());

    // Listen for visibility changes (tab switch, minimize, etc.)
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Listen for focus changes (window focus/blur)
    window.addEventListener('focus', handleFocusChange);
    window.addEventListener('blur', handleFocusChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocusChange);
      window.removeEventListener('blur', handleFocusChange);
    };
  }, [handleVisibilityChange, handleFocusChange]);

  const resetWarningCount = useCallback(() => {
    setWarningCount(0);
  }, []);

  return {
    isVisible,
    isFocused,
    warningCount,
    resetWarningCount,
  };
};


