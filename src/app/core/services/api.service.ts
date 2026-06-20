import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';
import { RoomListing } from '../models/game.models';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private baseUrl = environment.apiUrl;

  async createRoom(): Promise<string> {
    const res = await fetch(`${this.baseUrl}/create-room`, { method: 'POST' });
    if (!res.ok) {
      throw new Error('No se pudo crear la sala');
    }
    const data = (await res.json()) as { roomId: string };
    return data.roomId;
  }

  async listRooms(type: 'lobby' | 'game' | 'all' = 'lobby'): Promise<RoomListing[]> {
    const res = await fetch(`${this.baseUrl}/get-rooms?type=${type}`);
    if (!res.ok) {
      throw new Error('No se pudo listar salas');
    }
    return res.json() as Promise<RoomListing[]>;
  }
}
