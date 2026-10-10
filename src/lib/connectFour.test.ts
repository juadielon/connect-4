import { describe, expect, it } from 'vitest';
import {
  COLUMN_COUNT,
  createGame,
  dropDisc,
  PLAYERS,
  ROW_COUNT,
  type GameState,
} from './connectFour';

function play(columns: number[]): GameState {
  return columns.reduce((state, column) => {
    const result = dropDisc(state, column);
    expect(result.accepted).toBe(true);
    return result.state;
  }, createGame());
}

describe('createGame', () => {
  it('creates an empty 7 by 6 board with red to play', () => {
    const game = createGame();

    expect(game.board).toHaveLength(ROW_COUNT);
    expect(game.board.every((row) => row.length === COLUMN_COUNT)).toBe(true);
    expect(game.board.flat().every((cell) => cell === null)).toBe(true);
    expect(game.currentPlayer).toBe(PLAYERS.RED);
    expect(game.status).toBe('playing');
    expect(game.winningCells).toEqual([]);
  });
});

describe('dropDisc', () => {
  it('drops discs into the lowest empty cell and alternates players', () => {
    const initial = createGame();
    const first = dropDisc(initial, 3);
    expect(first.accepted).toBe(true);

    if (!first.accepted) {
      return;
    }

    expect(first.row).toBe(5);
    expect(first.state.board[5][3]).toBe(PLAYERS.RED);
    expect(first.state.currentPlayer).toBe(PLAYERS.YELLOW);
    expect(first.state.winningCells).toEqual([]);
    expect(initial.board[5][3]).toBeNull();

    const second = dropDisc(first.state, 3);
    expect(second.accepted).toBe(true);

    if (!second.accepted) {
      return;
    }

    expect(second.row).toBe(4);
    expect(second.state.board[4][3]).toBe(PLAYERS.YELLOW);
  });

  it.each([-1, 7, 1.5, Number.NaN])(
    'rejects invalid column %s without changing state',
    (column) => {
      const game = createGame();
      const result = dropDisc(game, column);

      expect(result).toEqual({
        accepted: false,
        reason: 'invalid-column',
        state: game,
      });
    },
  );

  it('rejects a full column', () => {
    const game = play([0, 0, 0, 0, 0, 0]);
    const result = dropDisc(game, 0);

    expect(result).toEqual({
      accepted: false,
      reason: 'column-full',
      state: game,
    });
  });

  it('detects a horizontal win', () => {
    const game = play([0, 0, 1, 1, 2, 2, 3]);

    expect(game.status).toBe('won');
    expect(game.winner).toBe(PLAYERS.RED);
    expect(game.winningCells).toEqual(
      [0, 1, 2, 3].map((column) => ({ row: 5, column })),
    );
  });

  it('detects a vertical win', () => {
    const game = play([0, 1, 0, 1, 0, 1, 0]);

    expect(game.status).toBe('won');
    expect(game.winner).toBe(PLAYERS.RED);
    expect(game.winningCells).toEqual(
      [2, 3, 4, 5].map((row) => ({ row, column: 0 })),
    );
  });

  it('detects a win for yellow', () => {
    const game = play([6, 0, 6, 1, 5, 2, 5, 3]);

    expect(game.status).toBe('won');
    expect(game.winner).toBe(PLAYERS.YELLOW);
    expect(game.winningCells).toEqual(
      [0, 1, 2, 3].map((column) => ({ row: 5, column })),
    );
  });

  it('detects a rising diagonal win', () => {
    const game = play([0, 1, 1, 2, 4, 2, 2, 3, 4, 3, 4, 3, 3]);

    expect(game.status).toBe('won');
    expect(game.winner).toBe(PLAYERS.RED);
    expect(game.winningCells).toEqual([
      { row: 2, column: 3 },
      { row: 3, column: 2 },
      { row: 4, column: 1 },
      { row: 5, column: 0 },
    ]);
  });

  it('detects a falling diagonal win', () => {
    const game = play([3, 2, 2, 1, 4, 1, 1, 0, 4, 0, 4, 0, 0]);

    expect(game.status).toBe('won');
    expect(game.winner).toBe(PLAYERS.RED);
    expect(game.winningCells).toEqual([
      { row: 2, column: 0 },
      { row: 3, column: 1 },
      { row: 4, column: 2 },
      { row: 5, column: 3 },
    ]);
  });

  it('includes the full connected line when a move fills a gap', () => {
    const game = play([0, 0, 1, 1, 3, 3, 4, 4, 2]);

    expect(game.status).toBe('won');
    expect(game.winningCells).toEqual(
      [0, 1, 2, 3, 4].map((column) => ({ row: 5, column })),
    );
  });

  it('detects a draw when the final cell is filled without a winner', () => {
    const game = play([
      0, 1, 2, 3, 4, 5, 6, 0, 1, 2, 3, 4, 5, 6, 1, 0, 3, 2, 5, 4, 6, 1, 0,
      3, 2, 5, 4, 6, 0, 1, 2, 3, 4, 5, 6, 0, 1, 2, 3, 4, 5, 6,
    ]);

    expect(game.status).toBe('draw');
    expect(game.winner).toBeNull();
    expect(game.winningCells).toEqual([]);
    expect(game.moves).toBe(ROW_COUNT * COLUMN_COUNT);
  });

  it('rejects moves after the game has ended', () => {
    const game = play([0, 0, 1, 1, 2, 2, 3]);
    const result = dropDisc(game, 4);

    expect(result).toEqual({
      accepted: false,
      reason: 'game-over',
      state: game,
    });
  });
});
