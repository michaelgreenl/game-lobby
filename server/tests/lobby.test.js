import { startServer, stopServer } from "../index.js";
import { io as Client } from "socket.io-client";
import jwt from "jsonwebtoken";

const TEST_PORT = 4003; // Use a fresh port
const SERVER_URL = `http://localhost:${TEST_PORT}`;

vi.mock("jsonwebtoken", () => ({
  ...vi.importActual("jsonwebtoken"),
  verify: (token, secret, cb) => {
    if (token === "invalid") {
      return cb(new Error("Invalid token"));
    }
    cb(null, { userId: token });
  },
}));

describe("Authentication", () => {
  let server;

  beforeAll(async () => {
    process.env.FRONTEND_URL = SERVER_URL;
    process.env.JWT_SECRET = "testsecret";
    server = await startServer(TEST_PORT);
  });

  afterAll(async () => {
    await stopServer();
  });

  test("Client with invalid token should be disconnected", (done) => {
    // Add a small delay to ensure the server is ready
    setTimeout(() => {
      const client = new Client(SERVER_URL, {
        auth: { token: "invalid" },
        transports: ["websocket"],
        forceNew: true,
      });

      client.on("connect_error", (err) => {
        expect(err.message).toBe("Authentication error: Invalid token");
        client.disconnect();
        done();
      });
    }, 100);
  });

  test("Game Lifecycle: P1 creates, P2 joins, both get start event", (done) => {
    const client1 = new Client(SERVER_URL, {
      auth: { token: "p1" },
      transports: ["websocket"],
      forceNew: true,
    });
    const client2 = new Client(SERVER_URL, {
      auth: { token: "p2" },
      transports: ["websocket"],
      forceNew: true,
    });
    let gameId;

    client1.on("connect", () => client1.emit("createGame"));
    client1.on("gameCreated", (game) => {
      gameId = game.id;
      client2.emit("joinGame", gameId);
    });

    const onGameStart = () => {
      expect(gameId).toBeDefined();
      client1.disconnect();
      client2.disconnect();
      done();
    };

    client2.on("gameStart", onGameStart);
  });

  describe("In-Game Actions", () => {
    let p1, p2, gameId;

    beforeEach((done) => {
      p1 = new Client(SERVER_URL, { auth: { token: "player1-ingame" } });
      p2 = new Client(SERVER_URL, { auth: { token: "player2-ingame" } });
      p1.on("gameCreated", (game) => {
        gameId = game.id;
        p2.emit("joinGame", gameId);
      });
      p2.on("gameStart", () => done());
      p1.emit("createGame");
    });

    afterEach(() => {
      p1.disconnect();
      p2.disconnect();
    });

    test("Win condition", (done) => {
      p1.emit("makeMove", { gameId, index: 0 }); // P1
      p2.on("updateBoard", () => p2.emit("makeMove", { gameId, index: 4 }));
      p1.on("updateBoard", () => p1.emit("makeMove", { gameId, index: 1 }));
      p2.on("updateBoard", () => p2.emit("makeMove", { gameId, index: 5 }));
      p1.on("updateBoard", () => p1.emit("makeMove", { gameId, index: 2 }));

      p1.on("gameOver", (game) => {
        expect(game.winner).toBe("player1-ingame");
        done();
      });
    });

    test("Draw condition", (done) => {
      p1.emit("makeMove", { gameId, index: 0 });
      p2.on("updateBoard", () => p2.emit("makeMove", { gameId, index: 1 }));
      p1.on("updateBoard", () => p1.emit("makeMove", { gameId, index: 2 }));
      p2.on("updateBoard", () => p2.emit("makeMove", { gameId, index: 5 }));
      p1.on("updateBoard", () => p1.emit("makeMove", { gameId, index: 3 }));
      p2.on("updateBoard", () => p2.emit("makeMove", { gameId, index: 4 }));
      p1.on("updateBoard", () => p1.emit("makeMove", { gameId, index: 8 }));
      p2.on("updateBoard", () => p2.emit("makeMove", { gameId, index: 7 }));
      p1.on("updateBoard", () => p1.emit("makeMove", { gameId, index: 6 }));

      p1.on("gameOver", (game) => {
        expect(game.state).toBe("game_over_draw");
        done();
      });
    });
  });

  describe("Disconnection and State", () => {
    test("Game is cancelled if creator disconnects", (done) => {
      const creator = new Client(SERVER_URL, { auth: { token: "creator" } });
      const joiner = new Client(SERVER_URL, { auth: { token: "joiner" } });
      let gameId;

      creator.on("gameCreated", (game) => {
        gameId = game.id;
        creator.disconnect();
      });

      creator.on("disconnect", () => {
        joiner.emit("joinGame", gameId);
        setTimeout(() => {
          // No gameStart should be emitted
          joiner.disconnect();
          done();
        }, 200);
      });

      joiner.on("gameStart", () =>
        done(new Error("Game should have been cancelled")),
      );
      creator.emit("createGame");
    });

    test("Full rematch flow", (done) => {
      const p1 = new Client(SERVER_URL, { auth: { token: "p1-rematch" } });
      const p2 = new Client(SERVER_URL, { auth: { token: "p2-rematch" } });
      let firstGameId;

      p1.on("gameCreated", (game) => {
        firstGameId = game.id;
        p2.emit("joinGame", firstGameId);
      });

      p2.on("gameStart", () => {
        // End the first game quickly to test rematch
        p1.emit("makeMove", { gameId: firstGameId, index: 0 }); // P1
        p2.on("updateBoard", () =>
          p2.emit("makeMove", { gameId: firstGameId, index: 4 }),
        );
        p1.on("updateBoard", () =>
          p1.emit("makeMove", { gameId: firstGameId, index: 1 }),
        );
        p2.on("updateBoard", () =>
          p2.emit("makeMove", { gameId: firstGameId, index: 5 }),
        );
        p1.on("updateBoard", () =>
          p1.emit("makeMove", { gameId: firstGameId, index: 2 }),
        );
      });

      p1.on("gameOver", () => {
        p1.emit("playerReadyForRematch", { gameId: firstGameId });
        p2.emit("playerReadyForRematch", { gameId: firstGameId });
      });

      const onRematchStart = (newGame) => {
        expect(newGame.id).not.toBe(firstGameId);
        p1.disconnect();
        p2.disconnect();
        done();
      };

      p1.on("gameStart", onRematchStart);
      p1.emit("createGame");
    });
  });
});