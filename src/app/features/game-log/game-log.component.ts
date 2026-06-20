import { Component, effect, ElementRef, inject, untracked, viewChild } from '@angular/core';
import { Button } from 'primeng/button';
import { GameConnectionService } from '../../core/services/game-connection.service';

@Component({
  selector: 'app-game-log',
  imports: [Button],
  templateUrl: './game-log.component.html',
  styleUrl: './game-log.component.scss',
})
export class GameLogComponent {
  readonly conn = inject(GameConnectionService);
  private logScroll = viewChild<ElementRef<HTMLElement>>('logScroll');

  constructor() {
    effect(() => {
      const entries = this.conn.logs();
      if (entries.length === 0) return;

      untracked(() => {
        requestAnimationFrame(() => this.scrollToBottom());
      });
    });
  }

  logClass(type: string) {
    return `log-line log-${type}`;
  }

  private scrollToBottom() {
    const el = this.logScroll()?.nativeElement;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }
}
