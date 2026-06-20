import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Button } from 'primeng/button';
import { InputText } from 'primeng/inputtext';
import { Select } from 'primeng/select';
import { Tag } from 'primeng/tag';
import { HERO_LABELS, HERO_TYPES, HeroType } from '../../core/constants/game.constants';
import { RoomListing } from '../../core/models/game.models';
import { ApiService } from '../../core/services/api.service';
import { GameConnectionService } from '../../core/services/game-connection.service';

@Component({
  selector: 'app-lobby-panel',
  imports: [FormsModule, Button, InputText, Select, Tag],
  templateUrl: './lobby-panel.component.html',
  styleUrl: './lobby-panel.component.scss',
})
export class LobbyPanelComponent {
  private api = inject(ApiService);
  readonly conn = inject(GameConnectionService);

  roomIdInput = '';
  playerName = '';
  heroLeft: HeroType = 'mage';
  heroRight: HeroType = 'warrior';
  rooms = signal<RoomListing[]>([]);
  loading = signal(false);
  error = signal('');

  readonly heroOptions = HERO_TYPES.map((value) => ({
    label: HERO_LABELS[value],
    value,
  }));

  async createRoom() {
    this.loading.set(true);
    this.error.set('');
    try {
      const roomId = await this.conn.createAndJoinLobby(this.playerName.trim() || undefined);
      this.roomIdInput = roomId;
      await this.refreshRooms();
    } catch (e) {
      this.error.set(e instanceof Error ? e.message : 'Error al crear sala');
    } finally {
      this.loading.set(false);
    }
  }

  async joinRoom() {
    const roomId = this.roomIdInput.trim();
    if (!roomId) {
      this.error.set('Ingresa un roomId');
      return;
    }

    this.loading.set(true);
    this.error.set('');
    try {
      await this.conn.joinLobby(roomId, this.playerName.trim() || undefined);
    } catch (e) {
      this.error.set(e instanceof Error ? e.message : 'Error al unirse');
    } finally {
      this.loading.set(false);
    }
  }

  async refreshRooms() {
    try {
      this.rooms.set(await this.api.listRooms('lobby'));
    } catch (e) {
      this.error.set(e instanceof Error ? e.message : 'Error al listar salas');
    }
  }

  selectRoom(roomId: string) {
    this.roomIdInput = roomId;
  }

  sendSelection() {
    this.conn.selectCharacter([this.heroLeft, this.heroRight]);
  }

  sendReady() {
    this.conn.ready();
  }

  async leave() {
    await this.conn.leave();
  }
}
