import { Component, effect, inject, OnDestroy, signal, untracked } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Button } from 'primeng/button';
import { Dialog } from 'primeng/dialog';
import { Tag } from 'primeng/tag';
import { ToggleSwitch } from 'primeng/toggleswitch';
import { HERO_LABELS, LEVEL_LABELS } from '../../core/constants/game.constants';
import { GameConnectionService } from '../../core/services/game-connection.service';
import { WheelsPanelComponent } from '../wheels-panel/wheels-panel.component';

const AUTO_MODE_KEY = 'casino-battle-auto-mode';

@Component({
  selector: 'app-game-panel',
  imports: [FormsModule, Button, Dialog, Tag, ToggleSwitch, WheelsPanelComponent],
  templateUrl: './game-panel.component.html',
  styleUrl: './game-panel.component.scss',
})
export class GamePanelComponent implements OnDestroy {
  readonly conn = inject(GameConnectionService);

  autoMode = signal(sessionStorage.getItem(AUTO_MODE_KEY) === 'true');
  private autoTimer: ReturnType<typeof setTimeout> | null = null;

  readonly gameOverVisible = () => this.conn.gameOver() !== null;
  readonly gameOver = () => this.conn.gameOver();

  private autoEffect = effect(() => {
    if (!this.autoMode() || !this.conn.inGame()) return;

    const player = this.conn.myPlayer();
    const phase = player?.turn?.phase;
    const confirmed = player?.turn?.confirmed;

    untracked(() => {
      if (phase && !confirmed) {
        this.queueAutoTurn();
      }
    });
  });

  ngOnDestroy() {
    this.clearAutoTimer();
  }

  onAutoModeChange(enabled: boolean) {
    this.autoMode.set(enabled);
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

    this.autoTimer = setTimeout(() => this.runAutoTurn(), 250);
  }

  private clearAutoTimer() {
    if (this.autoTimer) {
      clearTimeout(this.autoTimer);
      this.autoTimer = null;
    }
  }

  private runAutoTurn() {
    if (!this.autoMode() || !this.conn.inGame()) return;

    const player = this.conn.myPlayer();
    if (!player?.turn || player.turn.confirmed) return;

    if (player.turn.phase === 'spinning') {
      this.conn.skipSpins();
      this.conn.appendLog('[IA] Giros saltados automáticamente', 'event');
      return;
    }

    if (player.turn.phase === 'confirming') {
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

  onGameAction() {
    this.queueAutoTurn();
  }

  closeGameOver() {
    this.conn.dismissGameOver();
  }
}
