# Game Lobby
> A real-time tic-tac-toe lobby with JWT-authenticated Socket.IO sessions, server-side move validation, rematches, forfeits, and disconnect recovery.

[![Vue.js](https://img.shields.io/badge/Vue.js-35495E?style=for-the-badge&logo=vuedotjs&logoColor=4FC08D)](https://vuejs.org/) [![Pinia](https://img.shields.io/badge/Pinia-F1C40F?style=for-the-badge&logo=pinia&logoColor=black)](https://pinia.vuejs.org/) [![Sass](https://img.shields.io/badge/Sass-CC6699?style=for-the-badge&logo=sass&logoColor=white)](https://sass-lang.com/)
[![Node](https://img.shields.io/badge/Node.js-43853D?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org/) [![Express](https://img.shields.io/badge/Express-000000?style=for-the-badge&logo=express&logoColor=white)](https://expressjs.com/) [![Socket.io](https://img.shields.io/badge/Socket.io-black?style=for-the-badge&logo=socket.io&badgeColor=010101)](https://socket.io/) 
[![Prisma](https://img.shields.io/badge/Prisma-3982CE?style=for-the-badge&logo=Prisma&logoColor=white)](https://www.prisma.io/) 

## Links
- **🌐 [Live Site](https://gamelobby.io)**
- **🎥 [Demo Video](https://michaelgreenl.net/#projects?slug=game-lobby&autoplay=true)**
- **💼 [Portfolio Link](https://michaelgreenl.net/#projects?slug=game-lobby&autoplay=false)** 

## Overview
Game Lobby is a two-player tic-tac-toe app where authenticated players create open games, join another player's game, and play through Socket.IO events.

The Vue 3/Vite client uses Pinia and Vue Router for auth state, lobby state, active-game redirects, and game-screen rendering. The Node.js/Express server stores users and game records in PostgreSQL through Prisma while keeping active boards, turn order, rematch requests, and connected sockets in memory during a match.

## Technical Highlights
**Authenticated Sessions:** REST `/auth/register` and `/auth/login` routes hash passwords with `bcryptjs` and issue one-day JWTs. Socket.IO middleware verifies the JWT during the handshake before registering game handlers.

**Lobby and Active-Game Recovery:** The lobby receives open games through `updateGameList`. `checkActiveGame` and `fetchGameState` reconnect authenticated players to active games after refreshes or route changes.

**Server-Side Game Validation:** `makeMove` accepts moves only from the current player and only into empty cells, then the server checks win/draw state before broadcasting `updateBoard` or `gameOver`.

**Disconnect Recovery:** Each user maps to a set of socket IDs for multi-tab sessions. Hidden tabs wait five seconds before disconnecting, and in-progress disconnects start a 30-second auto-forfeit timer that is cleared on reconnect.

**Game Controls:** Players can cancel waiting games, forfeit in-progress games, and start rematches after both players request one.

**Server Tests:** Vitest tests cover invalid socket tokens, create/join flow, wins, draws, rematches, cancel, forfeit, and first-disconnect notification.

## Architecture & Design Decisions 
**Active vs. Persistent State:** Active board state lives in the server's `games` object so moves do not write to the database. Prisma persists users and game lifecycle/result fields when games are created, joined, cancelled, finished, or forfeited.

**Client as Event Emitter:** The Vue client renders server state and emits game intents such as `createGame`, `joinGame`, `makeMove`, `forfeitGame`, and `playerReadyForRematch`. Server handlers decide whether each state change is valid.

## Tech Stack
- **Frontend:** Vue 3 (Composition API), Vite, Vue Router, Pinia, Socket.IO client, Sass (SCSS)
- **Backend:** Node.js, Express 5, Socket.IO 4, JSON Web Tokens, bcryptjs
- **Database:** PostgreSQL, Prisma ORM
- **Local/dev/deploy:** Docker Compose for PostgreSQL, Vitest server tests, GitHub Actions workflow for GitHub Pages client deployment

## Run Locally
- Start PostgreSQL: `docker compose up -d db`.
- Server: set `DATABASE_URL`, `JWT_SECRET`, and `FRONTEND_URL`, then run `cd server && npm install && npm run build && npm run dev`.
- Client: set `VITE_API_URL`, then run `cd client && npm install && npm run dev`.
- Server tests: `cd server && npm test`.
