import { HeroType } from '../constants/game.constants';

export interface RoomListing {
  roomId: string;
  clients: number;
  maxClients: number;
  metadata?: Record<string, unknown>;
}

export interface LogEntry {
  time: string;
  message: string;
  type: 'event' | 'ok' | 'err' | 'chat' | 'wheels' | 'combat' | 'summary';
}

export interface ResolutionLogEntry {
  playerId: string;
  playerName: string;
  phase: 'wheels' | 'combat' | 'summary';
  message: string;
}

export interface TurnResolutionReport {
  entries: ResolutionLogEntry[];
}

export interface GameOverPayload {
  winnerId: string;
  isDraw: boolean;
  message: string;
  report?: TurnResolutionReport;
}

export interface HeroState {
  heroType: HeroType | string;
  position: string;
  level: number;
  xp: number;
  energy: number;
  energyThreshold: number;
}

export interface WheelState {
  symbol: string;
  locked: boolean;
}

export interface TurnState {
  phase: string;
  spinsRemaining: number;
  confirmed: boolean;
  wheels: WheelState[];
}

export interface PlayerState {
  id: string;
  name: string;
  selectedHeroes?: string[];
  isReady?: boolean;
  crown?: { health: number; maxHeal: number };
  bulwark?: { height: number };
  heroLeft?: HeroState;
  heroRight?: HeroState;
  turn?: TurnState;
}

export interface LobbyState {
  players: Map<string, PlayerState> | Record<string, PlayerState>;
}

export interface GameRoomState {
  status: string;
  winnerId: string;
  isDraw: boolean;
  players: Map<string, PlayerState> | Record<string, PlayerState>;
}
