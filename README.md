# Game Lobby 👾
> A real-time multiplayer game platform with Socket.IO-powered live lobbies, JWT-secured sessions, and server-authoritative in-memory match state for responsive gameplay.

[![Vue.js](https://img.shields.io/badge/Vue.js-35495E?style=for-the-badge&logo=vuedotjs&logoColor=4FC08D)](https://vuejs.org/) [![Pinia](https://img.shields.io/badge/Pinia-F1C40F?style=for-the-badge&logo=pinia&logoColor=black)](https://pinia.vuejs.org/) [![Sass](https://img.shields.io/badge/Sass-CC6699?style=for-the-badge&logo=sass&logoColor=white)](https://sass-lang.com/)
[![Node](https://img.shields.io/badge/Node.js-43853D?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org/) [![Express](https://img.shields.io/badge/Express-000000?style=for-the-badge&logo=express&logoColor=white)](https://expressjs.com/) [![Socket.io](https://img.shields.io/badge/Socket.io-black?style=for-the-badge&logo=socket.io&badgeColor=010101)](https://socket.io/) 
[![Prisma](https://img.shields.io/badge/Prisma-3982CE?style=for-the-badge&logo=Prisma&logoColor=white)](https://www.prisma.io/) [![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org/)

## 🔗 Links
- **🚀 [Live Site](https://gamelobby.io)**
- **🎥 [Demo Video](https://michaelgreenl.net/#projects?slug=game-lobby&autoplay=true)**
- **💼 [Portfolio Link](https://michaelgreenl.net/#projects?slug=game-lobby&autoplay=false)** 

## 📖 Overview
> A resilient, real-time multiplayer gaming platform that eliminates connection-drop frustrations through a custom socket synchronization engine designed to handle tab switching and network instability seamlessly  

This project leverages a Vue 3 (Vite) frontend paired with a Node.js/Express backend, using Socket.IO for low-latency bidirectional communication. The architecture adopts a hybrid state strategy, interacting with PostgreSQL (via Prisma) for persistent records while utilizing high-performance in-memory structures for active game loops.

## ⚡ Technical Highlights
**Adaptive Connection Persistence:** Implemented a "soft-disconnect" pattern using the Page Visibility API (`visibilitychange`) to prevent instant game forfeiture when users switch tabs or minimize browsers, solving a common mobile web gaming pitfall.

**Global Socket-Session Mapping:** Engineered a `userSockets` registry on the server to track multiple socket IDs per user ID. This enables multi-tab support where a user remains "online" as long as at least one client instance is active.

**Secure WebSocket Handshakes:** Extended strict JWT authentication into the Socket.IO connection phase, validating credentials during the initial handshake request rather than relying solely on message-level checks.

**Optimized In-Memory Game State:** Decoupled the active game loop from the database layer, performing game logic updates in memory for sub-millisecond response times and only committing final results to PostgreSQL.

## 🏗️ Architecture & Design Decisions 
**Active vs. Persistent Data Separation:** To maximize performance, the system avoids database writes during gameplay. The "source of truth" shifts temporarily to the server's memory during a match and syncs back to PostgreSQL only when the game concludes (Win/Loss), significantly reducing database I/O overhead.

**Client-Authority Rejection:** All game logic is centralized on the server to prevent cheating. The client acts strictly as a rendering engine and input emitter, ensuring the integrity of the game state regardless of client-side manipulation attempts.

## 🛠️ Tech Stack
- **Frontend:** Vue 3 (Composition API), Pinia, Sass (SCSS) 
- **Backend:** Node.js, Express, Socket.IO
- **Database:** PostgreSQL, Prisma ORM
- **Infrastructure:** Docker, Render, Github Pages, Github Actions
