import { createContext, useCallback, useContext, useMemo, useState } from "react";
import GlobalLoading from "../components/GlobalLoading";

type LoadingContextValue = {
  isLoading: boolean;
  message?: string;
  showLoading: (message?: string) => void;
  hideLoading: () => void;
};

const LoadingContext = createContext<LoadingContextValue | null>(null);

export function LoadingProvider({ children }: { children: React.ReactNode }) {
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<string | undefined>();

  const showLoading = useCallback((text?: string) => {
    setMessage(text);
    setIsLoading(true);
  }, []);

  const hideLoading = useCallback(() => {
    setIsLoading(false);
    setMessage(undefined);
  }, []);

  const value = useMemo(
    () => ({
      isLoading,
      message,
      showLoading,
      hideLoading,
    }),
    [isLoading, message, showLoading, hideLoading]
  );

  return (
    <LoadingContext.Provider value={value}>
      {children}
      <GlobalLoading visible={isLoading} message={message} />
    </LoadingContext.Provider>
  );
}

export const useGlobalLoading = () => {
  const ctx = useContext(LoadingContext);
  if (!ctx) {
    throw new Error("useGlobalLoading must be used within LoadingProvider");
  }
  return ctx;
};

