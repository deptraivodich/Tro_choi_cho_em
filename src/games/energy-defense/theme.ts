export const defense = {
  ink: '#183E43', muted: '#688486', teal: '#087F80', deep: '#123D43',
  mint: '#DFF5ED', aqua: '#57E0D0', violet: '#7956CB', gold: '#E9AF45',
  paper: '#F8FCFA', line: '#D5E7E2', danger: '#CA5665',
};

export const MODES = [
  { id: 'easy', label: 'Khởi động', mark: 'I' },
  { id: 'medium', label: 'Rèn luyện', mark: 'II' },
  { id: 'hard', label: 'Thử thách', mark: 'III' },
] as const;

export type DefenseMode = typeof MODES[number]['id'];
export type DefenseCreep = {
  id: number; type: 'scout' | 'slime' | 'golem';
  x: number; y: number; hp: number; maxHp: number; speed: number;
};
export const formatEnergy = (value: number) => (Math.round(value * 1000) / 1000).toString().replace('.', ',');
export const formatTime = (value: number) => `${Math.floor(Math.max(0, value) / 60)}:${Math.floor(Math.max(0, value) % 60).toString().padStart(2, '0')}`;
