# Connect 4

A beginner-friendly Connect 4 game for one or two players. Open it in a web
browser, choose a mode, and take turns dropping counters into the board.

## Features

- Play against the computer or another person.
- Choose the human player's colour in one-player mode.
- Clear turn, win, draw, and restart controls.
- Runs entirely through Docker Compose.

## Game modes

### One player

Choose your colour, then play against the computer. The human and computer take
turns until either player wins or the board is full.

### Two players

Two people share the same device and take turns using the two colours.

## Rules

Connect 4 uses a board with seven columns and six rows.

1. Players take turns dropping one counter into any column that is not full.
2. The counter falls into the lowest available space in that column.
3. The first player to connect four counters horizontally, vertically, or
   diagonally wins.
4. If the board fills before anyone connects four, the game is a draw.

## Prerequisite

Install [Docker Desktop](https://www.docker.com/products/docker-desktop/) or
another Docker installation that includes Docker Compose.

Node.js, npm, and the project dependencies are **not installed on the host**.
Docker installs and runs everything required inside containers.

## Install, build, and run

From the project directory, build the game image and start the `game` service:

```sh
docker compose up --build game
```

Open <http://localhost:8080> in a browser.

Stop the game and remove its containers:

```sh
docker compose down
```

## Test

Run the test suite in the dedicated `test` service:

```sh
docker compose run --rm test
```

## Technology

The game uses Svelte and TypeScript, with Vite for development and builds,
Vitest for testing, and Docker Compose for the local workflow.
