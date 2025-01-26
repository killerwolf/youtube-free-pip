export interface DebugStorage {
  debugMode: boolean;
  lastUpdated: number;
}

export interface DebugModeContext {
  isDebugMode: boolean;
  toggleDebug: (force?: boolean) => void;
  setFromQueryParam: (value: string | null) => void;
}

export interface DebugProviderProps {
  children: React.ReactNode;
  defaultValue?: boolean;
}

export interface DebugTooltipProps {
  content: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
  children: React.ReactNode;
}