import { chooseComputerMove } from './computerOpponent';
import {
  createGame,
  dropDisc,
  PLAYERS,
  type DropResult,
  type GameState,
  type Player,
} from './connectFour';

export type GameMode = 'one-player' | 'two-player';
export type SessionPhase = 'setup' | 'playing';

export interface GameSessionState {
  phase: SessionPhase;
  mode: GameMode | null;
  humanPlayer: Player | null;
  computerPlayer: Player | null;
  game: GameState;
  isComputerThinking: boolean;
}

export type SessionMoveResult =
  | {
      accepted: true;
    }
  | {
      accepted: false;
      reason:
        | Extract<DropResult, { accepted: false }>['reason']
        | 'not-playing'
        | 'computer-thinking'
        | 'computer-turn';
    };

export type CancelScheduledTurn = () => void;
export type ComputerTurnScheduler = (
  callback: () => void,
  delayMilliseconds: number,
) => CancelScheduledTurn;

export interface GameSessionOptions {
  computerDelayMilliseconds?: number;
  chooseMove?: typeof chooseComputerMove;
  scheduleComputerTurn?: ComputerTurnScheduler;
}

export interface GameSessionController {
  subscribe: (subscriber: (state: GameSessionState) => void) => () => void;
  startOnePlayer: (humanPlayer: Player) => void;
  startTwoPlayer: () => void;
  playColumn: (column: number) => SessionMoveResult;
  newGame: () => void;
  changeMode: () => void;
  destroy: () => void;
}

const DEFAULT_COMPUTER_DELAY_MILLISECONDS = 500;

export function createGameSession(
  options: GameSessionOptions = {},
): GameSessionController {
  const chooseMove = options.chooseMove ?? chooseComputerMove;
  const computerDelayMilliseconds =
    options.computerDelayMilliseconds ?? DEFAULT_COMPUTER_DELAY_MILLISECONDS;
  const scheduleComputerTurn =
    options.scheduleComputerTurn ??
    ((callback, delayMilliseconds) => {
      const timeout = setTimeout(callback, delayMilliseconds);
      return () => clearTimeout(timeout);
    });
  const subscribers = new Set<(state: GameSessionState) => void>();

  let state: GameSessionState = createSetupState();
  let cancelScheduledTurn: CancelScheduledTurn | null = null;
  let turnGeneration = 0;

  function subscribe(
    subscriber: (state: GameSessionState) => void,
  ): () => void {
    subscribers.add(subscriber);
    subscriber(state);

    return () => subscribers.delete(subscriber);
  }

  function publish(nextState: GameSessionState): void {
    state = nextState;
    subscribers.forEach((subscriber) => subscriber(state));
  }

  function cancelComputerTurn(): void {
    turnGeneration += 1;
    cancelScheduledTurn?.();
    cancelScheduledTurn = null;
  }

  function startOnePlayer(humanPlayer: Player): void {
    cancelComputerTurn();
    const computerPlayer =
      humanPlayer === PLAYERS.RED ? PLAYERS.YELLOW : PLAYERS.RED;

    publish({
      phase: 'playing',
      mode: 'one-player',
      humanPlayer,
      computerPlayer,
      game: createGame(),
      isComputerThinking: false,
    });
    scheduleComputerMoveIfNeeded();
  }

  function startTwoPlayer(): void {
    cancelComputerTurn();
    publish({
      phase: 'playing',
      mode: 'two-player',
      humanPlayer: null,
      computerPlayer: null,
      game: createGame(),
      isComputerThinking: false,
    });
  }

  function playColumn(column: number): SessionMoveResult {
    if (state.phase !== 'playing') {
      return { accepted: false, reason: 'not-playing' };
    }

    if (state.isComputerThinking) {
      return { accepted: false, reason: 'computer-thinking' };
    }

    if (
      state.mode === 'one-player' &&
      state.game.currentPlayer === state.computerPlayer
    ) {
      return { accepted: false, reason: 'computer-turn' };
    }

    const result = dropDisc(state.game, column);

    if (!result.accepted) {
      return { accepted: false, reason: result.reason };
    }

    publish({
      ...state,
      game: result.state,
    });
    scheduleComputerMoveIfNeeded();

    return { accepted: true };
  }

  function newGame(): void {
    if (state.phase !== 'playing' || state.mode === null) {
      return;
    }

    cancelComputerTurn();
    publish({
      ...state,
      game: createGame(),
      isComputerThinking: false,
    });
    scheduleComputerMoveIfNeeded();
  }

  function changeMode(): void {
    cancelComputerTurn();
    publish(createSetupState());
  }

  function scheduleComputerMoveIfNeeded(): void {
    if (
      state.phase !== 'playing' ||
      state.mode !== 'one-player' ||
      state.game.status !== 'playing' ||
      state.game.currentPlayer !== state.computerPlayer ||
      state.computerPlayer === null
    ) {
      return;
    }

    const scheduledGeneration = turnGeneration + 1;
    turnGeneration = scheduledGeneration;
    const computerPlayer = state.computerPlayer;

    publish({
      ...state,
      isComputerThinking: true,
    });

    cancelScheduledTurn = scheduleComputerTurn(() => {
      if (scheduledGeneration !== turnGeneration) {
        return;
      }

      cancelScheduledTurn = null;

      if (
        state.phase !== 'playing' ||
        state.mode !== 'one-player' ||
        state.game.status !== 'playing' ||
        state.game.currentPlayer !== computerPlayer ||
        state.computerPlayer !== computerPlayer
      ) {
        return;
      }

      const column = chooseMove(state.game, computerPlayer);
      const result = column === null ? null : dropDisc(state.game, column);

      publish({
        ...state,
        game: result?.accepted ? result.state : state.game,
        isComputerThinking: false,
      });
    }, computerDelayMilliseconds);
  }

  function destroy(): void {
    cancelComputerTurn();
    subscribers.clear();
  }

  return {
    subscribe,
    startOnePlayer,
    startTwoPlayer,
    playColumn,
    newGame,
    changeMode,
    destroy,
  };
}

function createSetupState(): GameSessionState {
  return {
    phase: 'setup',
    mode: null,
    humanPlayer: null,
    computerPlayer: null,
    game: createGame(),
    isComputerThinking: false,
  };
}
