import { Component, inject } from '@angular/core';
import { Button } from 'primeng/button';
import { ScrollPanel } from 'primeng/scrollpanel';
import { GameConnectionService } from '../../core/services/game-connection.service';

@Component({
  selector: 'app-game-log',
  imports: [Button, ScrollPanel],
  templateUrl: './game-log.component.html',
  styleUrl: './game-log.component.scss',
})
export class GameLogComponent {
  readonly conn = inject(GameConnectionService);

  logClass(type: string) {
    return `log-line log-${type}`;
  }
}
