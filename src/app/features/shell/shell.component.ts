import { Component, inject } from '@angular/core';
import { SYMBOL_GLOSSARY } from '../../core/constants/game.constants';
import { GameConnectionService } from '../../core/services/game-connection.service';
import { GamePanelComponent } from '../game-panel/game-panel.component';
import { LobbyPanelComponent } from '../lobby-panel/lobby-panel.component';

@Component({
  selector: 'app-shell',
  imports: [LobbyPanelComponent, GamePanelComponent],
  templateUrl: './shell.component.html',
  styleUrl: './shell.component.scss',
})
export class ShellComponent {
  readonly conn = inject(GameConnectionService);
  readonly symbols = Object.entries(SYMBOL_GLOSSARY);
}
