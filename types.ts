
export enum AgentStatus {
  IDLE = 'IDLE',
  THINKING = 'THINKING',
  EXECUTING = 'EXECUTING',
  REFLECTING = 'REFLECTING',
  ERROR = 'ERROR'
}

export interface LogEntry {
  id: string;
  timestamp: string;
  level: 'info' | 'success' | 'warning' | 'error' | 'thought' | 'search';
  message: string;
  source: 'Brain' | 'Limbs' | 'Reflection' | 'System' | 'Search';
}

export interface AssetHealth {
  name: string;
  replicationFactor: number;
  threshold: number;
  status: 'healthy' | 'critical' | 'healing';
}

export interface LicensingDeal {
  id: string;
  gameTitle: string;
  asset: string;
  price: number;
  status: 'Pending' | 'Signed' | 'Rejected' | 'Negotiating';
  previewUrl?: string;
  marketTrend?: string;
}

export interface GroundingSource {
  title: string;
  uri: string;
}
