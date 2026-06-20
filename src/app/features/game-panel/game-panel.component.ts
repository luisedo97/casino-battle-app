import { Component, computed, effect, inject, OnDestroy, signal, untracked } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Button } from 'primeng/button';
import { Dialog } from 'primeng/dialog';
import { Tag } from 'primeng/tag';
import { ToggleSwitch } from 'primeng/toggleswitch';
import { HERO_LABELS, LEVEL_LABELS } from '../../core/constants/game.constants';
import { GameConnectionService } from '../../core/services/game-connection.service';
import { HeroView, PlayerView, ResolutionLogEntry } from '../../core/models/game.models';
import { GameLogComponent } from '../game-log/game-log.component';
import { WheelsPanelComponent } from '../wheels-panel/wheels-panel.component';

const AUTO_MODE_KEY = 'casino-battle-auto-mode';
const RESOLUTION_LINE_MS = 750;

@Component({
  selector: 'app-game-panel',
  imports: [
    FormsModule,
    NgTemplateOutlet,
    Button,
    Dialog,
    Tag,
    ToggleSwitch,
    WheelsPanelComponent,
    GameLogComponent,
  ],
  templateUrl: './game-panel.component.html',
  styleUrl: './game-panel.component.scss',
})
export class GamePanelComponent implements OnDestroy {
  readonly conn = inject(GameConnectionService);

  autoMode = signal(false);
  private autoTimer: ReturnType<typeof setTimeout> | null = null;
  private lastAutoKey = '';

  readonly resolutionActive = signal(false);
  readonly resolutionLines = signal<ResolutionLogEntry[]>([]);
  readonly pulseTarget = signal<'self' | 'opponent' | 'both' | null>(null);

  private resolutionTimers: ReturnType<typeof setTimeout>[] = [];
  private lastReportToken = '';

  readonly gameOverVisible = () => this.conn.gameOver() !== null;
  readonly gameOver = () => this.conn.gameOver();

  readonly myPlayer = computed(() => this.conn.myPlayerView());
  readonly opponentPlayer = computed(() => this.conn.opponentPlayerView());

  readonly myWheels = computed(() => this.myPlayer()?.turn?.wheels ?? []);
  readonly opponentWheels = computed(() => this.opponentPlayer()?.turn?.wheels ?? []);

  private autoEffect = effect(() => {
    if (!this.autoMode() || !this.conn.inGame()) return;

    const revision = this.conn.stateRevision();
    const player = this.conn.myPlayerView();
    const phase = player?.turn?.phase;
    const confirmed = player?.turn?.confirmed;

    untracked(() => {
      if (revision >= 0 && phase && !confirmed) {
        this.queueAutoTurn();
      }
    });
  });

  private resolutionEffect = effect(() => {
    const report = this.conn.lastReport();
    const revision = this.conn.stateRevision();
    if (!report?.entries?.length || revision < 0) return;

    const token = `${revision}:${report.entries.length}:${report.entries[0]?.message ?? ''}`;
    if (token === this.lastReportToken) return;

    untracked(() => {
      this.lastReportToken = token;
      this.playResolution(report.entries);
    });
  });

  constructor() {
    const stored = sessionStorage.getItem(AUTO_MODE_KEY) === 'true';
    this.autoMode.set(stored);
  }

  ngOnDestroy() {
    this.clearAutoTimer();
    this.clearResolutionTimers();
  }

  onAutoModeChange(enabled: boolean) {
    this.autoMode.set(enabled);
    this.lastAutoKey = '';
    sessionStorage.setItem(AUTO_MODE_KEY, String(enabled));
    this.conn.appendLog(
      enabled ? '[IA] Modo automático activado' : '[IA] Modo automático desactivado',
      enabled ? 'ok' : 'event'
    );

    if (enabled) {
      this.queueAutoTurn();
    } else {
      this.clearAutoTimer();
    }
  }

  queueAutoTurn() {
    this.clearAutoTimer();
    if (!this.autoMode() || !this.conn.inGame()) return;

    this.autoTimer = setTimeout(() => this.runAutoTurn(), 400);
  }

  private clearAutoTimer() {
    if (this.autoTimer) {
      clearTimeout(this.autoTimer);
      this.autoTimer = null;
    }
  }

  private clearResolutionTimers() {
    for (const timer of this.resolutionTimers) {
      clearTimeout(timer);
    }
    this.resolutionTimers = [];
  }

  private playResolution(entries: ResolutionLogEntry[]) {
    this.clearResolutionTimers();
    this.resolutionActive.set(true);
    this.resolutionLines.set([]);

    entries.forEach((entry, index) => {
      const timer = setTimeout(() => {
        this.resolutionLines.update((lines) => [...lines, entry]);
        this.pulseTarget.set(this.resolvePulseTarget(entry));
      }, index * RESOLUTION_LINE_MS);
      this.resolutionTimers.push(timer);
    });

    const finishTimer = setTimeout(() => {
      this.resolutionActive.set(false);
      this.pulseTarget.set(null);
    }, entries.length * RESOLUTION_LINE_MS + 1200);
    this.resolutionTimers.push(finishTimer);
  }

  private resolvePulseTarget(entry: ResolutionLogEntry): 'self' | 'opponent' | 'both' | null {
    const myId = this.conn.myPlayerId();
    if (!entry.playerId) return entry.phase === 'summary' ? 'both' : null;
    if (entry.playerId === myId) return 'self';
    return 'opponent';
  }

  private runAutoTurn() {
    if (!this.autoMode() || !this.conn.inGame()) return;

    const player = this.conn.myPlayerView();
    if (!player?.turn || player.turn.confirmed) return;

    const { phase } = player.turn;
    const autoKey = `${phase}:${player.turn.spinsRemaining}:${player.turn.confirmed}`;

    if (this.lastAutoKey === autoKey) return;

    if (phase === 'spinning') {
      this.lastAutoKey = autoKey;
      this.conn.skipSpins();
      this.conn.appendLog('[IA] Giros saltados automáticamente', 'event');
      return;
    }

    if (phase === 'confirming') {
      this.lastAutoKey = autoKey;
      this.conn.confirmTurn();
      this.conn.appendLog('[IA] Turno confirmado automáticamente', 'event');
    }
  }

  heroLabel(type: string) {
    return HERO_LABELS[type as keyof typeof HERO_LABELS] ?? type;
  }

  levelLabel(level: number) {
    return LEVEL_LABELS[level] ?? `Nivel ${level}`;
  }

  hpPercent(player?: PlayerView | null) {
    const crown = player?.crown;
    if (!crown) return 0;
    return Math.max(0, Math.min(100, (crown.health / crown.maxHeal) * 100));
  }

  energyPercent(hero?: HeroView) {
    if (!hero?.energyThreshold) return 0;
    return Math.max(0, Math.min(100, (hero.energy / hero.energyThreshold) * 100));
  }

  xpPercent(hero?: HeroView) {
    if (!hero) return 0;
    return Math.max(0, Math.min(100, (hero.xp / 6) * 100));
  }

  bulwarkBlocks(amount = 0) {
    return Array.from({ length: Math.max(0, Math.min(12, amount)) });
  }

  onTurnResolved() {
    this.lastAutoKey = '';
    this.queueAutoTurn();
  }

  closeGameOver() {
    this.conn.dismissGameOver();
  }

  resolutionClass(entry: ResolutionLogEntry) {
    return `theater-line phase-${entry.phase}`;
  }
}
