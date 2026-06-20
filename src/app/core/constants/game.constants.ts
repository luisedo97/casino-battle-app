export const HERO_TYPES = [
  'assassin',
  'priest',
  'engineer',
  'mage',
  'warrior',
  'archer',
] as const;

export type HeroType = (typeof HERO_TYPES)[number];

export const HERO_LABELS: Record<HeroType, string> = {
  assassin: 'Asesino',
  priest: 'Sacerdote',
  engineer: 'Ingeniero',
  mage: 'Mago',
  warrior: 'Guerrero',
  archer: 'Arquero',
};

export const LEVEL_LABELS = ['Bronce', 'Plata', 'Oro'];

export const PHASE_LABELS: Record<string, string> = {
  idle: 'En espera',
  spinning: 'Girando ruedas',
  confirming: 'Confirmar turno',
  resolving: 'Resolviendo',
};

export const SYMBOL_GLOSSARY = {
  yellow: {
    icon: 'fa-solid fa-square',
    color: '#f0c040',
    label: 'Cuadrado amarillo',
    effect: 'Energía al héroe izquierdo',
  },
  blue: {
    icon: 'fa-solid fa-diamond',
    color: '#58a6ff',
    label: 'Diamante azul',
    effect: 'Energía al héroe derecho',
  },
  hammer: {
    icon: 'fa-solid fa-hammer',
    color: '#c9a227',
    label: 'Martillo',
    effect: 'Sube la altura del bastión',
  },
  panel_left: {
    icon: 'fa-solid fa-book-open',
    color: '#f0c040',
    label: 'Panel (izquierda)',
    effect: 'Energía (con amarillos) y +1 XP por panel',
  },
  panel_right: {
    icon: 'fa-solid fa-book-open',
    color: '#58a6ff',
    label: 'Panel (derecha)',
    effect: 'Energía (con azules) y +1 XP por panel',
  },
} as const;

export type WheelSymbol = keyof typeof SYMBOL_GLOSSARY;
