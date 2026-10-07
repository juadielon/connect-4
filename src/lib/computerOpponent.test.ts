import { describe, expect, it } from 'vitest';
import {
  COLUMN_COUNT,
  createGame,
  dropDisc,
  PLAYERS,
  ROW_COUNT,
  type GameState,
} from './connectFour';
import { chooseComputerMove } from './computerOpponent';

function play(columns: number[]): GameState {
  return columns.reduce((state, column) => {
    const result = dropDisc(state, column);
    expect(result.accepted).toBe(true);
    return result.state;
  }, createGame());
}

describe('chooseComputerMove', () => {
  it('takes an immediate winning move', () => {
    const game = play([6, 0, 6, 1, 5, 2, 5]);

    expect(chooseComputerMove(game, PLAYERS.YELLOW)).toBe(3);
  });

  it('blocks an immediate loss', () => {
    const game = play([0, 6, 1, 6, 2]);

    expect(chooseComputerMove(game, PLAYERS.YELLOW)).toBe(3);
  });

  it('prefers the centre column on an empty board', () => {
    expect(chooseComputerMove(createGame(), PLAYERS.RED)).toBe(3);
  });

  it('chooses a legal move when a column is full', () => {
    const game = play([3, 3, 3, 3, 3, 3]);
    const column = chooseComputerMove(game, PLAYERS.RED);

    expect(column).not.toBeNull();
    expect(column).not.toBe(3);
    expect(column === null ? false : game.board[0][column] === null).toBe(true);
  });

  it('supports the computer playing red or yellow', () => {
    const redGame = createGame();
    const yellowGame = play([3]);

    expect(chooseComputerMove(redGame, PLAYERS.RED)).toBeGreaterThanOrEqual(0);
    expect(
      chooseComputerMove(yellowGame, PLAYERS.YELLOW),
    ).toBeGreaterThanOrEqual(0);
  });

  it('returns the same move for the same position', () => {
    const game = play([3, 2, 4, 3]);
    const moves = Array.from({ length: 5 }, () =>
      chooseComputerMove(game, PLAYERS.RED),
    );

    expect(new Set(moves).size).toBe(1);
  });

  it('returns null when no legal move remains', () => {
    const game = play([
      0, 1, 2, 3, 4, 5, 6, 0, 1, 2, 3, 4, 5, 6, 1, 0, 3, 2, 5, 4, 6, 1, 0,
      3, 2, 5, 4, 6, 0, 1, 2, 3, 4, 5, 6, 0, 1, 2, 3, 4, 5, 6,
    ]);

    expect(game.moves).toBe(ROW_COUNT * COLUMN_COUNT);
    expect(chooseComputerMove(game, game.currentPlayer)).toBeNull();
  });

  it('returns null when it is not the computer player turn', () => {
    expect(chooseComputerMove(createGame(), PLAYERS.YELLOW)).toBeNull();
  });

  it('never returns a column outside the board', () => {
    const column = chooseComputerMove(createGame(), PLAYERS.RED);

    expect(column).not.toBeNull();
    expect(column).toBeGreaterThanOrEqual(0);
    expect(column).toBeLessThan(COLUMN_COUNT);
  });
});
