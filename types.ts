export interface GameState {
  pagesCollected: number;
  isGameOver: boolean;
  isWon: boolean;
  flashlightOn: boolean;
  staticIntensity: number;
  lastMessage: string;
  gameStarted: boolean;
}

export interface Page {
  id: string;
  position: [number, number, number];
  collected: boolean;
}

export enum GameStatus {
  MENU = 'MENU',
  PLAYING = 'PLAYING',
  PAUSED = 'PAUSED',
  GAME_OVER = 'GAME_OVER',
  VICTORY = 'VICTORY'
}
