import { useEffect, useState } from 'react';
import { usePageVisibility } from '@/hooks/usePageVisibility';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle, X, Monitor } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface TabSwitchWarningProps {
  className?: string;
  showWarning?: boolean;
  maxWarnings?: number;
  onMaxWarningsReached?: () => void;
}

export const TabSwitchWarning = ({
  className,
  showWarning = true,
  maxWarnings = 3,
  onMaxWarningsReached,
}: TabSwitchWarningProps) => {
  const { isVisible, isFocused, warningCount, resetWarningCount } = usePageVisibility();
  const [showAlert, setShowAlert] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  // Show warning when user switches away
  useEffect(() => {
    if (!isVisible || !isFocused) {
      setShowAlert(true);
      setDismissed(false);
    } else {
      // Hide alert after a delay when user returns
      const timer = setTimeout(() => {
        setShowAlert(false);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [isVisible, isFocused]);

  // Check if max warnings reached
  useEffect(() => {
    if (warningCount >= maxWarnings && onMaxWarningsReached) {
      onMaxWarningsReached();
    }
  }, [warningCount, maxWarnings, onMaxWarningsReached]);

  const handleDismiss = () => {
    setDismissed(true);
    setShowAlert(false);
  };

  // Don't show if disabled
  if (!showWarning) {
    return null;
  }

  // Show persistent warning if user is away (fixed at top)
  if (!isVisible || !isFocused) {
    return (
      <>
        {/* Fixed banner at top */}
        <div className="fixed top-0 left-0 right-0 z-50 bg-red-600 text-white px-4 py-3 shadow-lg animate-in slide-in-from-top">
          <div className="container mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Monitor className="h-5 w-5 animate-pulse" />
              <div>
                <p className="font-bold">⚠️ Tab Switch Detected!</p>
                <p className="text-sm text-red-100">
                  Please return to this tab immediately. Warning #{warningCount}
                </p>
              </div>
            </div>
            {warningCount >= maxWarnings && (
              <div className="bg-red-800 px-3 py-1 rounded text-sm font-semibold">
                MAX WARNINGS REACHED
              </div>
            )}
          </div>
        </div>
        {/* Alert in content area */}
        <Alert
          variant="destructive"
          className={cn(
            'border-red-500 bg-red-50 dark:bg-red-950 animate-in slide-in-from-top-5 shadow-lg',
            className
          )}
        >
          <Monitor className="h-5 w-5 text-red-600 dark:text-red-400 animate-pulse" />
          <AlertTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <span>⚠️ Tab Switch Detected</span>
              {warningCount > 0 && (
                <span className="text-xs font-normal bg-red-200 dark:bg-red-900 px-2 py-1 rounded">
                  Warning #{warningCount}
                </span>
              )}
            </span>
          </AlertTitle>
          <AlertDescription>
            <div className="space-y-2">
              <p className="font-semibold">
                Please return to this tab immediately! Switching tabs or opening other
                applications is not allowed during the interview.
              </p>
              {warningCount >= maxWarnings && (
                <p className="text-sm font-bold text-red-700 dark:text-red-300">
                  ⚠️ Maximum warnings reached! Continued tab switching may result in interview termination.
                </p>
              )}
            </div>
          </AlertDescription>
        </Alert>
      </>
    );
  }

  // Show dismissible warning when user returns
  if (showAlert && !dismissed) {
    return (
      <Alert
        variant="destructive"
        className={cn(
          'border-yellow-500 bg-yellow-50 dark:bg-yellow-950 animate-in slide-in-from-top-5',
          className
        )}
      >
        <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
        <AlertTitle className="flex items-center justify-between">
          <span>Tab Switch Detected</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDismiss}
            className="h-6 w-6 p-0 hover:bg-yellow-100 dark:hover:bg-yellow-900"
          >
            <X className="h-4 w-4" />
          </Button>
        </AlertTitle>
        <AlertDescription>
          <div className="space-y-2">
            <p>
              A tab switch was detected. Please stay on this page during the interview.
            </p>
            {warningCount > 0 && (
              <p className="text-sm font-semibold">
                Total warnings: {warningCount}
                {warningCount >= maxWarnings && (
                  <span className="text-red-600 dark:text-red-400 ml-2">
                    (Maximum reached!)
                  </span>
                )}
              </p>
            )}
          </div>
        </AlertDescription>
      </Alert>
    );
  }

  return null;
};

