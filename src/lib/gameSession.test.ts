import { describe, expect, it, vi } from 'vitest';
import { PLAYERS } from './connectFour';
import {
  createGameSession,
  type ComputerTurnScheduler,
  type GameSessionState,
} from './gameSession';

function observeSession(
  options: Parameters<typeof createGameSession>[0] = {},
): {
  session: ReturnType<typeof createGameSession>;
  getState: () => GameSessionState;
} {
  const session = createGameSession(options);
  let state!: GameSessionState;
  session.subscribe((nextState) => {
    state = nextState;
  });

  return {
    session,
    getState: () => state,
  };
}

function createManualScheduler(): {
  schedule: ComputerTurnScheduler;
  callbacks: Array<() => void>;
  cancellations: Array<ReturnType<typeof vi.fn>>;
  delays: number[];
} {
  const callbacks: Array<() => void> = [];
  const cancellations: Array<ReturnType<typeof vi.fn>> = [];
  const delays: number[] = [];

  return {
    callbacks,
    cancellations,
    delays,
    schedule: (callback, delayMilliseconds) => {
      callbacks.push(callback);
      delays.push(delayMilliseconds);
      const cancellation = vi.fn();
      cancellations.push(cancellation);
      return cancellation;
    },
  };
}

describe('createGameSession', () => {
  it('starts in setup and configures either supported mode', () => {
    const { session, getState } = observeSession();

    expect(getState().phase).toBe('setup');

    session.startTwoPlayer();
    expect(getState()).toMatchObject({
      phase: 'playing',
      mode: 'two-player',
      humanPlayer: null,
      computerPlayer: null,
    });

    session.changeMode();
    session.startOnePlayer(PLAYERS.RED);
    expect(getState()).toMatchObject({
      phase: 'playing',
      mode: 'one-player',
      humanPlayer: PLAYERS.RED,
      computerPlayer: PLAYERS.YELLOW,
      isComputerThinking: false,
    });
  });

  it('lets the computer open after a delay when the human chooses yellow', () => {
    const scheduler = createManualScheduler();
    const chooseMove = vi.fn(() => 3);
    const { session, getState } = observeSession({
      chooseMove,
      scheduleComputerTurn: scheduler.schedule,
    });

    session.startOnePlayer(PLAYERS.YELLOW);

    expect(getState().game.currentPlayer).toBe(PLAYERS.RED);
    expect(getState().isComputerThinking).toBe(true);
    expect(scheduler.callbacks).toHaveLength(1);
    expect(scheduler.delays).toEqual([500]);
    expect(session.playColumn(0)).toEqual({
      accepted: false,
      reason: 'computer-thinking',
    });

    scheduler.callbacks[0]();

    expect(chooseMove).toHaveBeenCalledOnce();
    expect(getState().game.board[5][3]).toBe(PLAYERS.RED);
    expect(getState().game.currentPlayer).toBe(PLAYERS.YELLOW);
    expect(getState().isComputerThinking).toBe(false);
  });

  it('still prevents a human move if a computer callback produces no move', () => {
    const scheduler = createManualScheduler();
    const { session, getState } = observeSession({
      chooseMove: () => null,
      scheduleComputerTurn: scheduler.schedule,
    });

    session.startOnePlayer(PLAYERS.YELLOW);
    scheduler.callbacks[0]();

    expect(getState().isComputerThinking).toBe(false);
    expect(session.playColumn(0)).toEqual({
      accepted: false,
      reason: 'computer-turn',
    });
  });

  it('alternates shared-device turns for two humans', () => {
    const { session, getState } = observeSession();
    session.startTwoPlayer();

    expect(session.playColumn(2)).toEqual({ accepted: true });
    expect(getState().game.board[5][2]).toBe(PLAYERS.RED);
    expect(getState().game.currentPlayer).toBe(PLAYERS.YELLOW);

    expect(session.playColumn(2)).toEqual({ accepted: true });
    expect(getState().game.board[4][2]).toBe(PLAYERS.YELLOW);
    expect(getState().game.currentPlayer).toBe(PLAYERS.RED);
  });

  it('rejects invalid columns, full columns, setup moves and post-win moves', () => {
    const { session } = observeSession();

    expect(session.playColumn(0)).toEqual({
      accepted: false,
      reason: 'not-playing',
    });

    session.startTwoPlayer();
    expect(session.playColumn(-1)).toEqual({
      accepted: false,
      reason: 'invalid-column',
    });

    [0, 0, 0, 0, 0, 0].forEach((column) => {
      expect(session.playColumn(column)).toEqual({ accepted: true });
    });
    expect(session.playColumn(0)).toEqual({
      accepted: false,
      reason: 'column-full',
    });

    session.newGame();
    [0, 0, 1, 1, 2, 2, 3].forEach((column) => {
      expect(session.playColumn(column)).toEqual({ accepted: true });
    });
    expect(session.playColumn(4)).toEqual({
      accepted: false,
      reason: 'game-over',
    });
  });

  it('locks the board after a draw', () => {
    const { session, getState } = observeSession();
    session.startTwoPlayer();

    [
      0, 1, 2, 3, 4, 5, 6, 0, 1, 2, 3, 4, 5, 6, 1, 0, 3, 2, 5, 4, 6, 1, 0,
      3, 2, 5, 4, 6, 0, 1, 2, 3, 4, 5, 6, 0, 1, 2, 3, 4, 5, 6,
    ].forEach((column) => {
      expect(session.playColumn(column)).toEqual({ accepted: true });
    });

    expect(getState().game.status).toBe('draw');
    expect(session.playColumn(0)).toEqual({
      accepted: false,
      reason: 'game-over',
    });
  });

  it('keeps mode and colour when starting a new game', () => {
    const scheduler = createManualScheduler();
    const { session, getState } = observeSession({
      chooseMove: () => 3,
      scheduleComputerTurn: scheduler.schedule,
    });

    session.startOnePlayer(PLAYERS.YELLOW);
    scheduler.callbacks[0]();
    session.playColumn(1);
    expect(getState().game.moves).toBe(2);

    session.newGame();

    expect(getState()).toMatchObject({
      phase: 'playing',
      mode: 'one-player',
      humanPlayer: PLAYERS.YELLOW,
      computerPlayer: PLAYERS.RED,
      isComputerThinking: true,
    });
    expect(getState().game.moves).toBe(0);
    expect(scheduler.cancellations[1]).toHaveBeenCalledOnce();
    expect(scheduler.callbacks).toHaveLength(3);
  });

  it('ignores stale computer callbacks after reset or mode change', () => {
    const scheduler = createManualScheduler();
    const chooseMove = vi.fn(() => 3);
    const { session, getState } = observeSession({
      chooseMove,
      scheduleComputerTurn: scheduler.schedule,
    });

    session.startOnePlayer(PLAYERS.YELLOW);
    const beforeReset = scheduler.callbacks[0];
    session.newGame();
    const afterReset = scheduler.callbacks[1];

    expect(scheduler.cancellations[0]).toHaveBeenCalledOnce();
    beforeReset();
    expect(getState().game.moves).toBe(0);
    expect(chooseMove).not.toHaveBeenCalled();

    session.changeMode();
    expect(scheduler.cancellations[1]).toHaveBeenCalledOnce();
    afterReset();

    expect(getState().phase).toBe('setup');
    expect(getState().game.moves).toBe(0);
    expect(chooseMove).not.toHaveBeenCalled();
  });
});
