import { Component } from '@angular/core';
import { SYMBOL_GLOSSARY } from '../../core/constants/game.constants';
import { GameLogComponent } from '../game-log/game-log.component';
import { GamePanelComponent } from '../game-panel/game-panel.component';
import { LobbyPanelComponent } from '../lobby-panel/lobby-panel.component';

@Component({
  selector: 'app-shell',
  imports: [LobbyPanelComponent, GamePanelComponent, GameLogComponent],
  templateUrl: './shell.component.html',
  styleUrl: './shell.component.scss',
})
export class ShellComponent {
  readonly symbols = Object.entries(SYMBOL_GLOSSARY);
}
