# Casino Battle — Frontend

Cliente web **Angular + PrimeNG + Font Awesome** para el servidor [casino-battle](https://github.com/luisedo97/casino-battle).

## Requisitos

- Node.js 20+
- Servidor API/Colyseus en ejecución (`npm run dev` en el repo padre, puerto **2567**)

## Desarrollo

```bash
npm install
npm start
```

Abre `http://localhost:4200`. El proxy reenvía `/create-room` y `/get-rooms` al backend.

WebSocket: `ws://localhost:2567` (configurable en `src/environments/environment.ts`).

## Build producción

```bash
npm run build
```

Salida en `dist/frontend/browser/`.

## Funcionalidades

- Crear / listar / unirse a lobby
- Selección de héroes y ready
- Transferencia automática a sala `game`
- Ruedas: girar, bloquear/desbloquear, saltar giros, confirmar turno
- Estado sincronizado (corona, bastión, héroes, turno)
- Log de resolución de turno (ruedas, combate, resumen)
- Diálogo de fin de partida (victoria / empate)
- Modo IA opcional (salta giros y confirma solo, por pestaña)

## Stack

- Angular 21
- PrimeNG 21 + PrimeUix Aura (tema oscuro)
- Font Awesome 7
- colyseus.js 0.15 (compatible con el servidor)
