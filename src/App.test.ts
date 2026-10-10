// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from '@testing-library/svelte';
import { tick } from 'svelte';
import { afterEach, describe, expect, it } from 'vitest';
import App from './App.svelte';
import { PLAYERS, type Player } from './lib/connectFour';
import {
  createGameSession,
  type ComputerTurnScheduler,
  type GameMode,
} from './lib/gameSession';

afterEach(() => {
  cleanup();
});

describe('App', () => {
  const winningScenarios: Array<{
    mode: GameMode;
    humanPlayer: Player;
    winner: Player;
  }> = [
    { mode: 'two-player', humanPlayer: PLAYERS.RED, winner: PLAYERS.RED },
    { mode: 'two-player', humanPlayer: PLAYERS.RED, winner: PLAYERS.YELLOW },
    { mode: 'one-player', humanPlayer: PLAYERS.RED, winner: PLAYERS.RED },
    { mode: 'one-player', humanPlayer: PLAYERS.RED, winner: PLAYERS.YELLOW },
    { mode: 'one-player', humanPlayer: PLAYERS.YELLOW, winner: PLAYERS.RED },
    { mode: 'one-player', humanPlayer: PLAYERS.YELLOW, winner: PLAYERS.YELLOW },
  ];

  it.each(winningScenarios)(
    'highlights and labels $winner wins in $mode with $humanPlayer human, and clears on restart',
    async ({ mode, humanPlayer, winner }) => {
      const columns = winner === PLAYERS.RED
        ? [0, 1, 0, 1, 0, 1, 0]
        : [0, 1, 0, 1, 2, 1, 2, 1];
      const computerColumns = columns.filter((_, index) =>
        (index % 2 === 0 ? PLAYERS.RED : PLAYERS.YELLOW) !== humanPlayer,
      );
      const callbacks: Array<() => void> = [];
      let computerMove = 0;
      const session = createGameSession({
        chooseMove: () => computerColumns[computerMove++],
        scheduleComputerTurn: (callback) => {
          callbacks.push(callback);
          return () => undefined;
        },
      });
      render(App, { props: { session } });

      if (mode === 'two-player') {
        session.startTwoPlayer();
      } else {
        session.startOnePlayer(humanPlayer);
      }

      async function playWin(): Promise<void> {
        columns.forEach((column, index) => {
          const player = index % 2 === 0 ? PLAYERS.RED : PLAYERS.YELLOW;
          if (mode === 'one-player' && player !== humanPlayer) {
            const callback = callbacks.shift();
            expect(callback).toBeDefined();
            callback?.();
          } else {
            expect(session.playColumn(column).accepted).toBe(true);
          }
        });
        await tick();
      }

      await playWin();
      const colourName = winner === PLAYERS.RED ? 'Red' : 'Yellow';
      const winningColumn = winner === PLAYERS.RED ? 1 : 2;
      const cells = screen.getAllByRole('gridcell');
      expect(cells.filter((cell) => cell.classList.contains('winning'))).toHaveLength(4);
      for (const row of [3, 4, 5, 6]) {
        expect(screen.getByRole('gridcell', {
          name: `Row ${row}, column ${winningColumn}: ${colourName} disc, part of the winning line`,
        }).classList.contains('winning')).toBe(true);
      }
      for (const cell of cells.filter((cell) => !cell.classList.contains('winning'))) {
        expect(cell.getAttribute('aria-label')).not.toContain('winning line');
      }

      computerMove = 0;
      await fireEvent.click(screen.getByRole('button', { name: 'New game' }));
      expect(screen.getAllByRole('gridcell').every(
        (cell) => !cell.classList.contains('winning') &&
          !cell.getAttribute('aria-label')?.includes('winning line'),
      )).toBe(true);

      await playWin();
      await fireEvent.click(screen.getByRole('button', { name: 'Change mode' }));
      expect(screen.queryByRole('grid')).toBeNull();
      session.startTwoPlayer();
      await tick();
      expect(screen.getAllByRole('gridcell').every(
        (cell) => !cell.classList.contains('winning') &&
          !cell.getAttribute('aria-label')?.includes('winning line'),
      )).toBe(true);
    },
  );

  it('sets up a two-human game and exposes accessible board controls', async () => {
    render(App);

    expect(screen.getByRole('heading', { name: 'Connect Four' })).toBeTruthy();
    expect(screen.getByRole('radiogroup', { name: 'Game mode' })).toBeTruthy();

    await fireEvent.click(
      screen.getByRole('radio', { name: /Two players/i }),
    );
    await fireEvent.click(screen.getByRole('button', { name: 'Start game' }));

    expect(screen.getByRole('status').textContent).toContain('Red’s turn');
    expect(
      screen.getByRole('grid', { name: 'Connect Four board' }),
    ).toBeTruthy();
    expect(screen.getAllByRole('row')).toHaveLength(6);

    const firstColumn = screen.getByRole('button', {
      name: 'Drop disc in column 1',
    });
    await fireEvent.click(firstColumn);

    expect(screen.getByRole('status').textContent).toContain('Yellow’s turn');
    expect(
      screen.getByRole('gridcell', {
        name: 'Row 6, column 1: Red disc',
      }),
    ).toBeTruthy();
  });

  it('keeps independent row-aware animation hooks on consecutive chips', async () => {
    const session = createGameSession();
    render(App, { props: { session } });

    session.startTwoPlayer();
    session.playColumn(0);
    await tick();

    const redCell = screen.getByRole('gridcell', {
      name: 'Row 6, column 1: Red disc',
    });
    const redChip = redCell.querySelector('.chip');

    expect(redChip?.classList.contains('falling')).toBe(true);
    expect((redChip as HTMLElement).style.getPropertyValue('--fall-rows')).toBe(
      '6',
    );

    session.playColumn(0);
    await tick();

    const yellowCell = screen.getByRole('gridcell', {
      name: 'Row 5, column 1: Yellow disc',
    });
    const yellowChip = yellowCell.querySelector('.chip');

    expect(redChip?.classList.contains('falling')).toBe(true);
    expect(yellowChip?.classList.contains('falling')).toBe(true);
    expect(
      (yellowChip as HTMLElement).style.getPropertyValue('--fall-rows'),
    ).toBe('5');
  });

  it('shows thinking state and blocks controls while the computer opens', async () => {
    const callbacks: Array<() => void> = [];
    const scheduleComputerTurn: ComputerTurnScheduler = (callback) => {
      callbacks.push(callback);
      return () => undefined;
    };
    const session = createGameSession({
      chooseMove: () => 3,
      scheduleComputerTurn,
    });

    render(App, { props: { session } });

    await fireEvent.click(screen.getByRole('radio', { name: /Yellow/i }));
    await fireEvent.click(screen.getByRole('button', { name: 'Start game' }));

    expect(screen.getByRole('status').textContent).toContain(
      'Computer is thinking',
    );
    expect(
      (
        screen.getByRole('button', {
          name: 'Drop disc in column 1',
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(true);

    callbacks[0]();
    await tick();

    expect(screen.getByRole('status').textContent).toContain(
      'Your turn — Yellow',
    );
    expect(
      screen.getByRole('gridcell', {
        name: 'Row 6, column 4: Red disc',
      }),
    ).toBeTruthy();
  });

  it('keeps the selected mode on new game and returns to setup on change mode', async () => {
    render(App);

    await fireEvent.click(
      screen.getByRole('radio', { name: /Two players/i }),
    );
    await fireEvent.click(screen.getByRole('button', { name: 'Start game' }));
    await fireEvent.click(
      screen.getByRole('button', { name: 'Drop disc in column 2' }),
    );

    await fireEvent.click(screen.getByRole('button', { name: 'New game' }));
    expect(
      screen.getByRole('gridcell', {
        name: 'Row 6, column 2: Empty',
      }),
    ).toBeTruthy();
    expect(screen.getByText('Two-player game')).toBeTruthy();

    await fireEvent.click(screen.getByRole('button', { name: 'Change mode' }));

    expect(screen.getByRole('button', { name: 'Start game' })).toBeTruthy();
    expect(
      (screen.getByRole('radio', { name: /Two players/i }) as HTMLInputElement)
        .checked,
    ).toBe(true);
    expect(
      screen.queryByRole('grid', { name: 'Connect Four board' }),
    ).toBeNull();
  });

  it('announces a win and disables every column', async () => {
    const session = createGameSession();
    render(App, { props: { session } });

    await fireEvent.click(
      screen.getByRole('radio', { name: /Two players/i }),
    );
    await fireEvent.click(screen.getByRole('button', { name: 'Start game' }));

    for (const column of [1, 1, 2, 2, 3, 3, 4]) {
      await fireEvent.click(
        screen.getByRole('button', {
          name: `Drop disc in column ${column}`,
        }),
      );
    }
    await tick();

    expect(screen.getByRole('status').textContent).toContain('Red wins!');
    expect(
      Array.from({ length: 7 }, (_, index) => {
        const button = screen.getByRole('button', {
          name: `Drop disc in column ${index + 1}`,
        }) as HTMLButtonElement;
        return button.disabled;
      }),
    ).toEqual([true, true, true, true, true, true, true]);
  });

  it('labels both token colours independently of colour', async () => {
    const session = createGameSession();
    render(App, { props: { session } });

    session.startTwoPlayer();
    session.playColumn(0);
    session.playColumn(1);
    await tick();

    expect(
      screen.getByRole('gridcell', { name: 'Row 6, column 1: Red disc' })
        .textContent,
    ).toContain('R');
    expect(
      screen.getByRole('gridcell', { name: 'Row 6, column 2: Yellow disc' })
        .textContent,
    ).toContain('Y');
    expect(PLAYERS.RED).toBe('red');
  });
});
