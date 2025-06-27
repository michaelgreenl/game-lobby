import { startServer, stopServer } from "../index.js";
import { io as Client } from "socket.io-client";
import jwt from "jsonwebtoken";

const TEST_PORT = 4000;
const SERVER_URL = `http://localhost:${TEST_PORT}`;

// Mock JWT verification to always succeed for test tokens
vi.mock("jsonwebtoken", () => ({
  ...vi.importActual("jsonwebtoken"),
  verify: (token, secret, cb) => {
    cb(null, { userId: token }); // Use token as userId for test
  },
}));

describe("Game Lobby Integration", () => {
  let server;
  let client1, client2;

  beforeAll(async () => {
    process.env.FRONTEND_URL = SERVER_URL; // Allow CORS for test
    process.env.JWT_SECRET = "testsecret";
    server = await startServer(TEST_PORT);
  });

  afterAll(async () => {
    if (client1) client1.disconnect();
    if (client2) client2.disconnect();
    await stopServer();
  });

  test("Player 1 creates a game, Player 2 joins, both receive correct events", (done) => {
    // Use unique tokens for user IDs
    const player1Token = "player1";
    const player2Token = "player2";

    client1 = new Client(SERVER_URL, {
      auth: { token: player1Token },
      transports: ["websocket"],
      forceNew: true,
    });
    client2 = new Client(SERVER_URL, {
      auth: { token: player2Token },
      transports: ["websocket"],
      forceNew: true,
    });

    let gameId;
    let gotGameCreated = false;
    let gotGameStart1 = false;
    let gotGameStart2 = false;

    client1.on("connect", () => {
      client1.emit("createGame");
    });

    client1.on("gameCreated", (game) => {
      gotGameCreated = true;
      gameId = game.id;
      // Now player 2 joins
      client2.emit("joinGame", gameId);
    });

    client1.on("gameStart", (game) => {
      gotGameStart1 = true;
      checkDone();
    });

    client2.on("gameStart", (game) => {
      gotGameStart2 = true;
      checkDone();
    });

    function checkDone() {
      if (gotGameCreated && gotGameStart1 && gotGameStart2) {
        expect(gameId).toBeDefined();
        done();
      }
    }
  });
});

