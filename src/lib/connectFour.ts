export const COLUMN_COUNT = 7;
export const ROW_COUNT = 6;

export const PLAYERS = {
  RED: 'red',
  YELLOW: 'yellow',
} as const;

export type Player = (typeof PLAYERS)[keyof typeof PLAYERS];
export type Cell = Player | null;
export type Board = Cell[][];
export type GameStatus = 'playing' | 'won' | 'draw';

export interface CellPosition {
  row: number;
  column: number;
}

export interface GameState {
  board: Board;
  currentPlayer: Player;
  status: GameStatus;
  winner: Player | null;
  moves: number;
  winningCells: CellPosition[];
}

export type DropResult =
  | {
      accepted: true;
      row: number;
      column: number;
      state: GameState;
    }
  | {
      accepted: false;
      reason: 'invalid-column' | 'column-full' | 'game-over';
      state: GameState;
    };

const WIN_LENGTH = 4;
const DIRECTIONS = [
  [0, 1],
  [1, 0],
  [1, 1],
  [1, -1],
] as const;

export function createGame(): GameState {
  return {
    board: Array.from({ length: ROW_COUNT }, () =>
      Array<Cell>(COLUMN_COUNT).fill(null),
    ),
    currentPlayer: PLAYERS.RED,
    status: 'playing',
    winner: null,
    moves: 0,
    winningCells: [],
  };
}

export function dropDisc(state: GameState, column: number): DropResult {
  if (!Number.isInteger(column) || column < 0 || column >= COLUMN_COUNT) {
    return rejectDrop(state, 'invalid-column');
  }

  if (state.status !== 'playing') {
    return rejectDrop(state, 'game-over');
  }

  const row = findLowestEmptyRow(state.board, column);

  if (row === -1) {
    return rejectDrop(state, 'column-full');
  }

  const board = state.board.map((boardRow) => [...boardRow]);
  board[row][column] = state.currentPlayer;
  const moves = state.moves + 1;
  const winningCells = findWinningCells(board, row, column, state.currentPlayer);
  const won = winningCells.length > 0;
  const draw = !won && moves === ROW_COUNT * COLUMN_COUNT;

  return {
    accepted: true,
    row,
    column,
    state: {
      board,
      currentPlayer:
        won || draw ? state.currentPlayer : otherPlayer(state.currentPlayer),
      status: won ? 'won' : draw ? 'draw' : 'playing',
      winner: won ? state.currentPlayer : null,
      moves,
      winningCells,
    },
  };
}

function findLowestEmptyRow(board: Board, column: number): number {
  for (let row = ROW_COUNT - 1; row >= 0; row -= 1) {
    if (board[row][column] === null) {
      return row;
    }
  }

  return -1;
}

function findWinningCells(
  board: Board,
  row: number,
  column: number,
  player: Player,
): CellPosition[] {
  for (const [rowStep, columnStep] of DIRECTIONS) {
    const forward = countDirection(board, row, column, rowStep, columnStep, player);
    const backward = countDirection(board, row, column, -rowStep, -columnStep, player);
    const connected = 1 + forward + backward;

    if (connected >= WIN_LENGTH) {
      return Array.from({ length: connected }, (_, index) => ({
        row: row + (index - backward) * rowStep,
        column: column + (index - backward) * columnStep,
      }));
    }
  }

  return [];
}

function countDirection(
  board: Board,
  startRow: number,
  startColumn: number,
  rowStep: number,
  columnStep: number,
  player: Player,
): number {
  let connected = 0;
  let row = startRow + rowStep;
  let column = startColumn + columnStep;

  while (
    row >= 0 &&
    row < ROW_COUNT &&
    column >= 0 &&
    column < COLUMN_COUNT &&
    board[row][column] === player
  ) {
    connected += 1;
    row += rowStep;
    column += columnStep;
  }

  return connected;
}

function otherPlayer(player: Player): Player {
  return player === PLAYERS.RED ? PLAYERS.YELLOW : PLAYERS.RED;
}

function rejectDrop(
  state: GameState,
  reason: 'invalid-column' | 'column-full' | 'game-over',
): DropResult {
  return {
    accepted: false,
    reason,
    state,
  };
}
