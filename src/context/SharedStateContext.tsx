// context/SharedStateContext.tsx
import { createContext, useContext, useState, ReactNode } from "react";

type SharedState = {
  isDragging: boolean;
  setIsDragging: (n: boolean) => void;
};

const SharedStateContext = createContext<SharedState | undefined>(undefined);

export function SharedStateProvider({ children }: { children: ReactNode }) {
  const [isDragging, setIsDragging] = useState(false);

  return (
    <SharedStateContext.Provider value={{ isDragging, setIsDragging }}>
      {children}
    </SharedStateContext.Provider>
  );
}

export function useSharedState() {
  const context = useContext(SharedStateContext);
  if (!context) throw new Error("useSharedState must be used within a SharedStateProvider");
  return context;
}
