<script lang="ts">
  import { onDestroy } from 'svelte';
  import {
    COLUMN_COUNT,
    PLAYERS,
    type Cell,
    type Player,
  } from './lib/connectFour';
  import {
    createGameSession,
    type GameMode,
    type GameSessionController,
    type GameSessionState,
  } from './lib/gameSession';

  export let session: GameSessionController = createGameSession();

  const title = 'Connect Four';
  const columns = Array.from({ length: COLUMN_COUNT }, (_, column) => column);
  let selectedMode: GameMode = 'one-player';
  let selectedColour: Player = PLAYERS.RED;
  let sessionState: GameSessionState;
  let previousBoard: Cell[][] | null = null;
  let fallingChip: { row: number; column: number } | null = null;

  const unsubscribe = session.subscribe((state) => {
    if (previousBoard !== state.game.board) {
      fallingChip = previousBoard
        ? findPlacedChip(previousBoard, state.game.board)
        : null;
      previousBoard = state.game.board;
    }

    sessionState = state;
  });

  onDestroy(() => {
    unsubscribe();
    session.destroy();
  });

  function startGame(): void {
    if (selectedMode === 'two-player') {
      session.startTwoPlayer();
      return;
    }

    session.startOnePlayer(selectedColour);
  }

  function statusMessage(state: GameSessionState): string {
    if (state.game.status === 'won' && state.game.winner) {
      if (state.mode === 'one-player') {
        return state.game.winner === state.humanPlayer
          ? 'You win!'
          : 'Computer wins.';
      }

      return `${playerName(state.game.winner)} wins!`;
    }

    if (state.game.status === 'draw') {
      return 'It’s a draw.';
    }

    if (state.isComputerThinking) {
      return 'Computer is thinking…';
    }

    if (state.mode === 'one-player') {
      return state.game.currentPlayer === state.humanPlayer
        ? `Your turn — ${playerName(state.game.currentPlayer)}`
        : `Computer’s turn — ${playerName(state.game.currentPlayer)}`;
    }

    return `${playerName(state.game.currentPlayer)}’s turn`;
  }

  function playerName(player: Player): string {
    return player === PLAYERS.RED ? 'Red' : 'Yellow';
  }

  function cellLabel(cell: Cell): string {
    return cell === null ? 'Empty' : `${playerName(cell)} disc`;
  }

  function findPlacedChip(
    previous: Cell[][],
    current: Cell[][],
  ): { row: number; column: number } | null {
    for (let row = 0; row < current.length; row += 1) {
      for (let column = 0; column < current[row].length; column += 1) {
        if (previous[row][column] === null && current[row][column] !== null) {
          return { row, column };
        }
      }
    }

    return null;
  }

  function columnDisabled(
    state: GameSessionState,
    column: number,
  ): boolean {
    return (
      state.game.status !== 'playing' ||
      state.game.board[0][column] !== null ||
      state.isComputerThinking ||
      (state.mode === 'one-player' &&
        state.game.currentPlayer === state.computerPlayer)
    );
  }
</script>

<svelte:head>
  <title>{title}</title>
</svelte:head>

<main class="app-shell">
  <section class="game-card" aria-labelledby="game-title">
    <header class="brand">
      <span class="brand-mark" aria-hidden="true">
        <span class="mini-disc red">R</span>
        <span class="mini-disc yellow">Y</span>
      </span>
      <div>
        <p class="eyebrow">Classic strategy</p>
        <h1 id="game-title">{title}</h1>
      </div>
    </header>

    {#if sessionState.phase === 'setup'}
      <form class="setup" on:submit|preventDefault={startGame}>
        <div>
          <p class="step-label">1. Choose your game</p>
          <fieldset class="choice-grid" role="radiogroup">
            <legend class="sr-only">Game mode</legend>
            <label class:selected={selectedMode === 'one-player'}>
              <input
                type="radio"
                name="mode"
                value="one-player"
                bind:group={selectedMode}
              />
              <span class="choice-title">Play the computer</span>
              <span class="choice-detail">Take on a thoughtful opponent.</span>
            </label>
            <label class:selected={selectedMode === 'two-player'}>
              <input
                type="radio"
                name="mode"
                value="two-player"
                bind:group={selectedMode}
              />
              <span class="choice-title">Two players</span>
              <span class="choice-detail">Share this device and take turns.</span>
            </label>
          </fieldset>
        </div>

        {#if selectedMode === 'one-player'}
          <div>
            <p class="step-label">2. Choose your colour</p>
            <fieldset class="colour-choices" role="radiogroup">
              <legend class="sr-only">Your colour</legend>
              <label class:selected={selectedColour === PLAYERS.RED}>
                <input
                  type="radio"
                  name="colour"
                  value={PLAYERS.RED}
                  bind:group={selectedColour}
                />
                <span class="colour-dot red" aria-hidden="true">R</span>
                <span>
                  <strong>Red</strong>
                  <small>You go first</small>
                </span>
              </label>
              <label class:selected={selectedColour === PLAYERS.YELLOW}>
                <input
                  type="radio"
                  name="colour"
                  value={PLAYERS.YELLOW}
                  bind:group={selectedColour}
                />
                <span class="colour-dot yellow" aria-hidden="true">Y</span>
                <span>
                  <strong>Yellow</strong>
                  <small>Computer goes first</small>
                </span>
              </label>
            </fieldset>
          </div>
        {/if}

        <button class="primary-button" type="submit">Start game</button>
      </form>
    {:else}
      <div class="game">
        <div class="game-heading">
          <div>
            <p class="mode-label">
              {sessionState.mode === 'one-player'
                ? `You are ${playerName(sessionState.humanPlayer ?? PLAYERS.RED)}`
                : 'Two-player game'}
            </p>
            <p class="status" role="status" aria-live="polite">
              {statusMessage(sessionState)}
            </p>
          </div>
          <div
            class:yellow-turn={sessionState.game.currentPlayer === PLAYERS.YELLOW}
            class="turn-disc"
            aria-hidden="true"
          >
            {sessionState.game.currentPlayer === PLAYERS.RED ? 'R' : 'Y'}
          </div>
        </div>

        <div class="board-wrap">
          <div class="column-controls" aria-label="Column controls">
            {#each columns as column}
              <button
                type="button"
                aria-label={`Drop disc in column ${column + 1}`}
                disabled={columnDisabled(sessionState, column)}
                on:click={() => session.playColumn(column)}
              >
                <span aria-hidden="true">▼</span>
              </button>
            {/each}
          </div>

          <div class="board" role="grid" aria-label="Connect Four board">
            {#each sessionState.game.board as row, rowIndex}
              <div class="board-row" role="row">
                {#each row as cell, columnIndex}
                  <div
                    class:occupied={cell !== null}
                    class:red={cell === PLAYERS.RED}
                    class:yellow={cell === PLAYERS.YELLOW}
                    class="cell"
                    role="gridcell"
                    aria-label={`Row ${rowIndex + 1}, column ${columnIndex + 1}: ${cellLabel(cell)}`}
                  >
                    {#if cell !== null}
                      <span
                        class:falling={fallingChip?.row === rowIndex &&
                          fallingChip?.column === columnIndex}
                        class="chip"
                        style:--fall-rows={rowIndex + 1}
                        aria-hidden="true"
                      >
                        {cell === PLAYERS.RED ? 'R' : 'Y'}
                      </span>
                    {/if}
                  </div>
                {/each}
              </div>
            {/each}
          </div>
        </div>

        <div class="game-actions">
          <button class="secondary-button" type="button" on:click={session.changeMode}>
            Change mode
          </button>
          <button class="primary-button" type="button" on:click={session.newGame}>
            New game
          </button>
        </div>
      </div>
    {/if}
  </section>
</main>
