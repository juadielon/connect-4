// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from '@testing-library/svelte';
import { tick } from 'svelte';
import { afterEach, describe, expect, it } from 'vitest';
import App from './App.svelte';
import { PLAYERS } from './lib/connectFour';
import {
  createGameSession,
  type ComputerTurnScheduler,
} from './lib/gameSession';

afterEach(() => {
  cleanup();
});

describe('App', () => {
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
