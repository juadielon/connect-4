import {
  COLUMN_COUNT,
  dropDisc,
  PLAYERS,
  ROW_COUNT,
  type Board,
  type GameState,
  type Player,
} from './connectFour';

const SEARCH_DEPTH = 4;
const WIN_SCORE = 1_000_000;
const CENTRE_COLUMN = Math.floor(COLUMN_COUNT / 2);
const MOVE_ORDER = Array.from({ length: COLUMN_COUNT }, (_, column) => column).sort(
  (left, right) =>
    Math.abs(left - CENTRE_COLUMN) - Math.abs(right - CENTRE_COLUMN) ||
    left - right,
);

const WINDOW_SCORES = [0, 2, 12, 80, WIN_SCORE] as const;

export function chooseComputerMove(
  state: GameState,
  computerPlayer: Player,
): number | null {
  if (
    state.status !== 'playing' ||
    state.currentPlayer !== computerPlayer
  ) {
    return null;
  }

  const legalColumns = getLegalColumns(state.board);

  if (legalColumns.length === 0) {
    return null;
  }

  for (const column of legalColumns) {
    const result = dropDisc(state, column);

    if (result.accepted && result.state.winner === computerPlayer) {
      return column;
    }
  }

  const opponent = otherPlayer(computerPlayer);
  const immediateBlocks = getImmediateWinningColumns(state, opponent);
  const candidateColumns =
    immediateBlocks.length === 1 ? immediateBlocks : legalColumns;

  let bestColumn = candidateColumns[0];
  let bestScore = Number.NEGATIVE_INFINITY;
  let alpha = Number.NEGATIVE_INFINITY;

  for (const column of candidateColumns) {
    const result = dropDisc(state, column);

    if (!result.accepted) {
      continue;
    }

    const score = minimax(
      result.state,
      SEARCH_DEPTH - 1,
      alpha,
      Number.POSITIVE_INFINITY,
      computerPlayer,
    );

    if (score > bestScore) {
      bestScore = score;
      bestColumn = column;
    }

    alpha = Math.max(alpha, bestScore);
  }

  return bestColumn;
}

function minimax(
  state: GameState,
  depth: number,
  alpha: number,
  beta: number,
  computerPlayer: Player,
): number {
  if (state.status !== 'playing') {
    return scoreTerminalState(state, depth, computerPlayer);
  }

  if (depth === 0) {
    return evaluateState(state, computerPlayer);
  }

  const legalColumns = getLegalColumns(state.board);
  const maximising = state.currentPlayer === computerPlayer;
  let bestScore = maximising
    ? Number.NEGATIVE_INFINITY
    : Number.POSITIVE_INFINITY;

  for (const column of legalColumns) {
    const result = dropDisc(state, column);

    if (!result.accepted) {
      continue;
    }

    const score = minimax(
      result.state,
      depth - 1,
      alpha,
      beta,
      computerPlayer,
    );

    if (maximising) {
      bestScore = Math.max(bestScore, score);
      alpha = Math.max(alpha, bestScore);
    } else {
      bestScore = Math.min(bestScore, score);
      beta = Math.min(beta, bestScore);
    }

    if (alpha >= beta) {
      break;
    }
  }

  return bestScore;
}

function scoreTerminalState(
  state: GameState,
  depth: number,
  computerPlayer: Player,
): number {
  if (state.status === 'draw') {
    return 0;
  }

  return state.winner === computerPlayer
    ? WIN_SCORE + depth
    : -WIN_SCORE - depth;
}

function evaluateState(state: GameState, computerPlayer: Player): number {
  const opponent = otherPlayer(computerPlayer);
  let score = 0;

  for (let row = 0; row < ROW_COUNT; row += 1) {
    if (state.board[row][CENTRE_COLUMN] === computerPlayer) {
      score += 6;
    } else if (state.board[row][CENTRE_COLUMN] === opponent) {
      score -= 6;
    }
  }

  forEachWindow(state.board, (window) => {
    score += scoreWindow(window, computerPlayer, opponent);
  });

  score += getImmediateWinningColumns(state, computerPlayer).length * 500;
  score -= getImmediateWinningColumns(state, opponent).length * 600;

  return score;
}

function scoreWindow(
  window: Board[number],
  computerPlayer: Player,
  opponent: Player,
): number {
  let computerCount = 0;
  let opponentCount = 0;

  for (const cell of window) {
    if (cell === computerPlayer) {
      computerCount += 1;
    } else if (cell === opponent) {
      opponentCount += 1;
    }
  }

  if (computerCount > 0 && opponentCount > 0) {
    return 0;
  }

  if (computerCount > 0) {
    return WINDOW_SCORES[computerCount];
  }

  if (opponentCount > 0) {
    return -WINDOW_SCORES[opponentCount];
  }

  return 0;
}

function forEachWindow(
  board: Board,
  visit: (window: Board[number]) => void,
): void {
  for (let row = 0; row < ROW_COUNT; row += 1) {
    for (let column = 0; column <= COLUMN_COUNT - 4; column += 1) {
      visit(board[row].slice(column, column + 4));
    }
  }

  for (let row = 0; row <= ROW_COUNT - 4; row += 1) {
    for (let column = 0; column < COLUMN_COUNT; column += 1) {
      visit(Array.from({ length: 4 }, (_, offset) => board[row + offset][column]));
    }
  }

  for (let row = 0; row <= ROW_COUNT - 4; row += 1) {
    for (let column = 0; column <= COLUMN_COUNT - 4; column += 1) {
      visit(
        Array.from(
          { length: 4 },
          (_, offset) => board[row + offset][column + offset],
        ),
      );
    }
  }

  for (let row = 3; row < ROW_COUNT; row += 1) {
    for (let column = 0; column <= COLUMN_COUNT - 4; column += 1) {
      visit(
        Array.from(
          { length: 4 },
          (_, offset) => board[row - offset][column + offset],
        ),
      );
    }
  }
}

function getImmediateWinningColumns(
  state: GameState,
  player: Player,
): number[] {
  const playerState: GameState = {
    ...state,
    currentPlayer: player,
  };

  return getLegalColumns(state.board).filter((column) => {
    const result = dropDisc(playerState, column);
    return result.accepted && result.state.winner === player;
  });
}

function getLegalColumns(board: Board): number[] {
  return MOVE_ORDER.filter((column) => board[0][column] === null);
}

function otherPlayer(player: Player): Player {
  return player === PLAYERS.RED ? PLAYERS.YELLOW : PLAYERS.RED;
}
