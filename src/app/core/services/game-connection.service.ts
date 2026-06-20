import { Injectable, NgZone, computed, inject, signal } from '@angular/core';
import { Client, Room } from 'colyseus.js';
import { environment } from '../../../environments/environment';
import { HeroType } from '../constants/game.constants';
import {
  GameOverPayload,
  GameRoomState,
  HeroView,
  LobbyState,
  LogEntry,
  PlayerState,
  PlayerView,
  TurnResolutionReport,
} from '../models/game.models';
import { ApiService } from './api.service';
import { schemaToArray } from '../utils/schema.utils';

type RoomKind = 'lobby' | 'game';

@Injectable({ providedIn: 'root' })
export class GameConnectionService {
  private api = inject(ApiService);
  private ngZone = inject(NgZone);
  private client = new Client(environment.wsUrl);
  private room: Room | null = null;

  /** Incrementa en cada patch de estado Colyseus para refrescar computed/templates. */
  readonly stateRevision = signal(0);

  readonly roomId = signal<string | null>(null);
  readonly roomName = signal<RoomKind | null>(null);
  readonly sessionId = signal<string | null>(null);
  readonly myPlayerId = signal<string | null>(null);
  readonly connected = computed(() => this.roomId() !== null);
  readonly inGame = computed(() => this.roomName() === 'game');
  readonly inLobby = computed(() => this.roomName() === 'lobby');

  readonly logs = signal<LogEntry[]>([]);
  readonly gameOver = signal<GameOverPayload | null>(null);
  readonly lastReport = signal<TurnResolutionReport | null>(null);

  readonly gameState = computed(() => {
    this.stateRevision();
    if (!this.room || this.roomName() !== 'game') return null;
    return this.room.state as GameRoomState;
  });

  readonly lobbyState = computed(() => {
    this.stateRevision();
    if (!this.room || this.roomName() !== 'lobby') return null;
    return this.room.state as LobbyState;
  });

  readonly myPlayer = computed(() => {
    this.stateRevision();
    const playerId = this.myPlayerId();
    if (!playerId || !this.room) return null;

    const players = this.inGame()
      ? (this.room.state as GameRoomState).players
      : (this.room.state as LobbyState).players;

    return this.getPlayerFromMap(players, playerId);
  });

  /** Snapshot inmutable para templates — nueva referencia en cada patch de Colyseus. */
  readonly myPlayerView = computed((): PlayerView | null => {
    this.stateRevision();
    const playerId = this.myPlayerId();
    if (!playerId || !this.room) return null;

    const players = this.inGame()
      ? (this.room.state as GameRoomState).players
      : (this.room.state as LobbyState).players;

    const player = this.getPlayerFromMap(players, playerId);
    return player ? this.toPlayerView(player) : null;
  });

  readonly players = computed(() => {
    this.stateRevision();
    if (!this.room) return [];

    const map = this.inGame()
      ? (this.room.state as GameRoomState).players
      : (this.room.state as LobbyState).players;

    return this.playersFromMap(map);
  });

  readonly playersView = computed((): Array<{ key: string; player: PlayerView }> => {
    this.stateRevision();
    if (!this.room) return [];

    const map = this.inGame()
      ? (this.room.state as GameRoomState).players
      : (this.room.state as LobbyState).players;

    return this.playersFromMap(map).map(({ key, player }) => ({
      key,
      player: this.toPlayerView(player),
    }));
  });

  readonly opponentPlayerView = computed((): PlayerView | null => {
    this.stateRevision();
    const myId = this.myPlayerId();
    if (!myId) return null;

    const opponent = this.playersView().find((entry) => entry.key !== myId);
    return opponent?.player ?? null;
  });

  private toHeroView(hero: PlayerState['heroLeft']): HeroView | undefined {
    if (!hero) return undefined;
    return {
      heroType: String(hero.heroType),
      position: String(hero.position),
      level: Number(hero.level),
      xp: Number(hero.xp),
      energy: Number(hero.energy),
      energyThreshold: Number(hero.energyThreshold),
    };
  }

  private toPlayerView(player: PlayerState): PlayerView {
    const wheels = schemaToArray(player.turn?.wheels).map((wheel) => ({
      symbol: String(wheel.symbol),
      locked: Boolean(wheel.locked),
    }));

    return {
      id: player.id,
      name: player.name,
      selectedHeroes: player.selectedHeroes ? [...player.selectedHeroes] : undefined,
      isReady: player.isReady,
      crown: player.crown
        ? { health: player.crown.health, maxHeal: player.crown.maxHeal }
        : undefined,
      bulwark: player.bulwark ? { height: player.bulwark.height } : undefined,
      heroLeft: this.toHeroView(player.heroLeft),
      heroRight: this.toHeroView(player.heroRight),
      turn: player.turn
        ? {
            phase: String(player.turn.phase),
            spinsRemaining: Number(player.turn.spinsRemaining),
            confirmed: Boolean(player.turn.confirmed),
            wheels,
          }
        : undefined,
    };
  }

  private bumpState() {
    this.stateRevision.update((v) => v + 1);
  }

  private runInAngular(fn: () => void) {
    this.ngZone.run(fn);
  }

  getPlayerFromMap(
    map: Map<string, PlayerState> | Record<string, PlayerState> | undefined,
    key: string
  ): PlayerState | null {
    if (!map) return null;

    const schemaMap = map as { get?: (k: string) => PlayerState | undefined };
    if (typeof schemaMap.get === 'function') {
      return schemaMap.get(key) ?? null;
    }

    return (map as Record<string, PlayerState>)[key] ?? null;
  }

  playersFromMap(
    map: Map<string, PlayerState> | Record<string, PlayerState> | undefined
  ): Array<{ key: string; player: PlayerState }> {
    if (!map) return [];

    const schemaMap = map as {
      forEach?: (cb: (player: PlayerState, key: string) => void) => void;
    };

    if (typeof schemaMap.forEach === 'function') {
      const entries: Array<{ key: string; player: PlayerState }> = [];
      schemaMap.forEach((player, key) => entries.push({ key, player }));
      return entries;
    }

    return Object.entries(map as Record<string, PlayerState>).map(([key, player]) => ({
      key,
      player,
    }));
  }

  private pushLog(message: string, type: LogEntry['type'] = 'event') {
    this.logs.update((entries) => [
      ...entries,
      { time: new Date().toLocaleTimeString(), message, type },
    ]);
  }

  private logReport(report?: TurnResolutionReport) {
    if (!report?.entries?.length) return;

    for (const entry of report.entries) {
      const prefix = entry.playerName ? `[${entry.playerName}] ` : '';
      const type =
        entry.phase === 'combat' ? 'combat' : entry.phase === 'wheels' ? 'wheels' : 'summary';
      this.pushLog(`${prefix}${entry.message}`, type);
    }
  }

  async createAndJoinLobby(playerName?: string): Promise<string> {
    const roomId = await this.api.createRoom();
    await this.joinLobby(roomId, playerName);
    return roomId;
  }

  async joinLobby(roomId: string, playerName?: string): Promise<void> {
    await this.leave(false);
    const room = await this.client.joinById(roomId, playerName ? { name: playerName } : {});
    this.setupRoom(room, 'lobby');
    this.myPlayerId.set(room.sessionId);
    this.pushLog(`Unido al lobby (${room.roomId})`, 'ok');
  }

  private setupRoom(room: Room, kind: RoomKind) {
    this.room = room;
    this.roomId.set(room.roomId);
    this.roomName.set(kind);
    this.sessionId.set(room.sessionId);
    this.gameOver.set(null);
    this.bumpState();

    room.onStateChange(() => {
      this.runInAngular(() => this.bumpState());
    });

    if (kind === 'lobby') {
      this.bindLobbyHandlers(room);
    } else {
      this.bindGameHandlers(room);
    }
  }

  private bindLobbyHandlers(room: Room) {
    room.onMessage('chat-room', (msg: string) =>
      this.runInAngular(() => this.pushLog(`chat: ${msg}`, 'chat'))
    );
    room.onMessage('selection-error', (msg: string) =>
      this.runInAngular(() => this.pushLog(`selection-error: ${msg}`, 'err'))
    );

    room.onMessage('transfer-room', async (payload: string | { roomId: string; message?: string }) => {
      const gameRoomId = typeof payload === 'string' ? payload : payload.roomId;
      const message = typeof payload === 'string' ? '' : (payload.message ?? '');
      const lobbyPlayerId = this.myPlayerId();

      this.runInAngular(() =>
        this.pushLog(`transfer-room → game ${gameRoomId}${message ? ` (${message})` : ''}`, 'event')
      );

      await this.leave(false);

      const gameRoom = await this.client.joinById(gameRoomId);
      this.runInAngular(() => {
        this.setupRoom(gameRoom, 'game');
        // El id de jugador en game es el sessionId del lobby, no el de la nueva conexión.
        if (lobbyPlayerId) {
          this.myPlayerId.set(lobbyPlayerId);
          this.pushLog(`Jugador restaurado: ${lobbyPlayerId}`, 'ok');
        }
        this.pushLog(`Conectado a partida (${gameRoom.roomId})`, 'ok');
      });
    });
  }

  private bindGameHandlers(room: Room) {
    const assignPlayer = (payload: { playerId: string }) => {
      this.runInAngular(() => {
        this.myPlayerId.set(payload.playerId);
        this.pushLog(`Asignado a jugador: ${payload.playerId}`, 'ok');
      });
    };

    room.onMessage('chat-room', (msg: string) =>
      this.runInAngular(() => this.pushLog(`chat: ${msg}`, 'chat'))
    );
    room.onMessage('reconnected', assignPlayer);
    room.onMessage('player-assigned', assignPlayer);
    room.onMessage('game-info', (payload: { message: string }) =>
      this.runInAngular(() => this.pushLog(`game-info: ${payload.message}`, 'event'))
    );
    room.onMessage('start-game', () =>
      this.runInAngular(() => this.pushLog('La partida comenzó', 'ok'))
    );
    room.onMessage('turn-started', (payload: { message: string }) =>
      this.runInAngular(() => {
        this.pushLog(`turn-started: ${payload.message}`, 'event');
        this.bumpState();
      })
    );
    room.onMessage('turn-updated', (payload: { action: string; phase: string }) =>
      this.runInAngular(() => {
        this.pushLog(`turn-updated: ${payload.action} → ${payload.phase}`, 'event');
        this.bumpState();
      })
    );
    room.onMessage('turn-error', (payload: { error: string }) =>
      this.runInAngular(() => this.pushLog(`turn-error: ${payload.error}`, 'err'))
    );
    room.onMessage('turn-resolved', (payload: { message: string; report?: TurnResolutionReport }) => {
      this.runInAngular(() => {
        this.pushLog(`turn-resolved: ${payload.message}`, 'event');
        this.lastReport.set(payload.report ?? null);
        this.logReport(payload.report);
        this.bumpState();
      });
    });
    room.onMessage('game-over', (payload: GameOverPayload) => {
      this.runInAngular(() => {
        const summary = payload.isDraw ? 'Empate' : `Ganador ${payload.winnerId}`;
        this.pushLog(`game-over: ${summary} — ${payload.message}`, 'ok');
        this.lastReport.set(payload.report ?? null);
        this.logReport(payload.report);
        this.gameOver.set(payload);
      });
    });
    room.onMessage('room-error', (payload: { error: string }) =>
      this.runInAngular(() => this.pushLog(`room-error: ${payload.error}`, 'err'))
    );
  }

  selectCharacter(characters: [HeroType, HeroType]) {
    this.room?.send('selectCharacter', { characters });
    this.pushLog(`selectCharacter: ${characters.join(', ')}`, 'event');
  }

  ready() {
    this.room?.send('ready');
    this.pushLog('ready enviado', 'event');
  }

  spin() {
    this.room?.send('spin');
    this.pushLog('Giro enviado', 'event');
  }

  skipSpins() {
    this.room?.send('skipSpins');
    this.pushLog('Giros saltados', 'event');
  }

  confirmTurn() {
    this.room?.send('confirmTurn');
    this.pushLog('Turno confirmado', 'event');
  }

  lockWheel(index: number) {
    this.room?.send('lock', { indices: [index] });
    this.pushLog(`lock rueda ${index + 1}`, 'event');
  }

  unlockWheel(index: number) {
    this.room?.send('unlock', { indices: [index] });
    this.pushLog(`unlock rueda ${index + 1}`, 'event');
  }

  async leave(logLeave = true): Promise<void> {
    if (!this.room) return;

    const id = this.room.roomId;
    const room = this.room;
    this.room = null;

    await room.leave();

    this.runInAngular(() => {
      this.roomId.set(null);
      this.roomName.set(null);
      this.sessionId.set(null);
      this.myPlayerId.set(null);
      this.gameOver.set(null);
      this.bumpState();

      if (logLeave) {
        this.pushLog(`Saliste de la sala ${id}`, 'event');
      }
    });
  }

  clearLogs() {
    this.logs.set([]);
    this.lastReport.set(null);
  }

  appendLog(message: string, type: LogEntry['type'] = 'event') {
    this.pushLog(message, type);
  }

  dismissGameOver() {
    this.gameOver.set(null);
  }
}
