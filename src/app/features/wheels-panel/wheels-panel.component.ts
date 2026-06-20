import { Component, computed, inject } from '@angular/core';
import { Button } from 'primeng/button';
import { Tag } from 'primeng/tag';
import { HERO_LABELS, LEVEL_LABELS, PHASE_LABELS, SYMBOL_GLOSSARY } from '../../core/constants/game.constants';
import { GameConnectionService } from '../../core/services/game-connection.service';

@Component({
  selector: 'app-wheels-panel',
  imports: [Button, Tag],
  templateUrl: './wheels-panel.component.html',
  styleUrl: './wheels-panel.component.scss',
})
export class WheelsPanelComponent {
  readonly conn = inject(GameConnectionService);

  readonly player = computed(() => this.conn.myPlayer());
  readonly phaseLabel = computed(() => {
    const phase = this.player()?.turn?.phase;
    return phase ? (PHASE_LABELS[phase] ?? phase) : '—';
  });

  symbolMeta(symbol: string) {
    return (
      SYMBOL_GLOSSARY[symbol as keyof typeof SYMBOL_GLOSSARY] ?? {
        icon: 'fa-solid fa-question',
        color: '#8b9cb3',
        label: symbol,
      }
    );
  }

  toggleLock(index: number, locked: boolean) {
    if (locked) {
      this.conn.unlockWheel(index);
    } else {
      this.conn.lockWheel(index);
    }
  }
}
