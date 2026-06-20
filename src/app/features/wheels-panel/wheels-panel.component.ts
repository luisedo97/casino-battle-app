import {
  Component,
  effect,
  inject,
  input,
  OnDestroy,
  signal,
  untracked,
} from '@angular/core';
import { Button } from 'primeng/button';
import { Tag } from 'primeng/tag';
import {
  PHASE_LABELS,
  SYMBOL_GLOSSARY,
  WheelSymbol,
} from '../../core/constants/game.constants';
import { WheelState } from '../../core/models/game.models';
import { GameConnectionService } from '../../core/services/game-connection.service';

const SPIN_SYMBOLS = Object.keys(SYMBOL_GLOSSARY) as WheelSymbol[];
const SPIN_MS = 920;
const SPIN_TICK_MS = 70;
const WHEEL_STAGGER_MS = 90;

interface DisplayWheel extends WheelState {
  spinning: boolean;
  displaySymbol: string;
}

@Component({
  selector: 'app-wheels-panel',
  imports: [Button, Tag],
  templateUrl: './wheels-panel.component.html',
  styleUrl: './wheels-panel.component.scss',
})
export class WheelsPanelComponent implements OnDestroy {
  readonly wheels = input<WheelState[]>([]);
  readonly interactive = input(true);
  readonly compact = input(false);
  readonly inverted = input(false);
  readonly phase = input<string | undefined>(undefined);
  readonly spinsRemaining = input<number | undefined>(undefined);

  readonly conn = inject(GameConnectionService);

  readonly displayWheels = signal<DisplayWheel[]>([]);

  private spinTimers = new Map<number, ReturnType<typeof setInterval>>();
  private settleTimers = new Map<number, ReturnType<typeof setTimeout>>();
  private initialized = false;

  private syncEffect = effect(() => {
    const incoming = this.wheels();
    untracked(() => this.syncWheels(incoming));
  });

  ngOnDestroy() {
    this.clearAllTimers();
  }

  phaseLabel() {
    const phase = this.phase();
    return phase ? (PHASE_LABELS[phase] ?? phase) : '—';
  }

  symbolMeta(symbol: string) {
    return (
      SYMBOL_GLOSSARY[symbol as WheelSymbol] ?? {
        icon: 'fa-solid fa-question',
        color: '#8b9cb3',
        label: symbol,
      }
    );
  }

  toggleLock(index: number, locked: boolean) {
    if (!this.interactive()) return;

    if (locked) {
      this.conn.unlockWheel(index);
    } else {
      this.conn.lockWheel(index);
    }
  }

  private syncWheels(incoming: WheelState[]) {
    if (!incoming.length) {
      this.displayWheels.set([]);
      this.initialized = false;
      return;
    }

    const current = this.displayWheels();

    if (!this.initialized || current.length !== incoming.length) {
      this.initialized = true;
      this.displayWheels.set(
        incoming.map((wheel) => ({
          ...wheel,
          spinning: false,
          displaySymbol: wheel.symbol,
        }))
      );
      return;
    }

    incoming.forEach((wheel, index) => {
      const prev = current[index];
      if (!prev) return;

      if (prev.symbol !== wheel.symbol && !wheel.locked) {
        this.animateWheel(index, wheel);
        return;
      }

      this.patchWheel(index, {
        ...wheel,
        spinning: false,
        displaySymbol: wheel.symbol,
      });
    });
  }

  private animateWheel(index: number, target: WheelState) {
    this.clearWheelTimers(index);

    this.patchWheel(index, {
      ...target,
      spinning: true,
      displaySymbol: this.randomSymbol(),
    });

    const tick = setInterval(() => {
      this.patchWheel(index, {
        ...this.displayWheels()[index],
        displaySymbol: this.randomSymbol(),
      });
    }, SPIN_TICK_MS);
    this.spinTimers.set(index, tick);

    const settle = setTimeout(() => {
      this.clearWheelTimers(index);
      this.patchWheel(index, {
        ...target,
        spinning: false,
        displaySymbol: target.symbol,
      });
    }, SPIN_MS + index * WHEEL_STAGGER_MS);
    this.settleTimers.set(index, settle);
  }

  private patchWheel(index: number, wheel: DisplayWheel) {
    this.displayWheels.update((items) => {
      const next = [...items];
      next[index] = wheel;
      return next;
    });
  }

  private randomSymbol() {
    return SPIN_SYMBOLS[Math.floor(Math.random() * SPIN_SYMBOLS.length)];
  }

  private clearWheelTimers(index: number) {
    const tick = this.spinTimers.get(index);
    if (tick) {
      clearInterval(tick);
      this.spinTimers.delete(index);
    }

    const settle = this.settleTimers.get(index);
    if (settle) {
      clearTimeout(settle);
      this.settleTimers.delete(index);
    }
  }

  private clearAllTimers() {
    for (const index of this.spinTimers.keys()) {
      this.clearWheelTimers(index);
    }
    for (const index of this.settleTimers.keys()) {
      this.clearWheelTimers(index);
    }
  }
}
