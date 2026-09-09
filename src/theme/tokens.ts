export const colors = {
  background: '#080D18',
  panel: '#101A2A',
  panelLight: '#172438',
  border: '#233148',
  text: '#F3F6FC',
  muted: '#8F9EB6',
  accent: '#B9F78B',
  cyan: '#87E8EC',
  danger: '#FF8D9B',
};
export type SpaceTheme = 'nebula' | 'aurora' | 'solar';
export const spaceThemes: Record<
  SpaceTheme,
  {
    name: string;
    subtitle: string;
    color: string;
    planet: string;
    tile: string;
    trail: readonly string[];
  }
> = {
  nebula: {
    name: 'Deep space',
    subtitle: 'Quiet skies. Infinite possibility.',
    color: '#B9F78B',
    planet: '#46507E',
    tile: '#233747',
    trail: ['#B9F78B', '#68EDCC', '#65CFFD', '#A899FF', '#F49EDD'],
  },
  aurora: {
    name: 'Aurora drift',
    subtitle: 'Follow the northern lights.',
    color: '#8DEAF0',
    planet: '#226D75',
    tile: '#1E3A4B',
    trail: ['#8DEAF0', '#6AC5FF', '#9699FF', '#CC9CF6', '#F5B5EC'],
  },
  solar: {
    name: 'Solar dusk',
    subtitle: 'A little closer to the sun.',
    color: '#FFC492',
    planet: '#925844',
    tile: '#493644',
    trail: ['#FFE39B', '#FFC492', '#FF9E98', '#EF88BF', '#B797F6'],
  },
};
export const fonts = {
  regular: 'SpaceGrotesk_400Regular',
  medium: 'SpaceGrotesk_500Medium',
  bold: 'SpaceGrotesk_700Bold',
};
