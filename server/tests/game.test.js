import { startServer, stopServer } from "../index.js";
import { io as Client } from "socket.io-client";

const TEST_PORT = 4004; // Use a fresh port
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

describe("Game Actions", () => {
  let server;

  beforeAll(async () => {
    process.env.FRONTEND_URL = SERVER_URL;
    process.env.JWT_SECRET = "testsecret";
    server = await startServer(TEST_PORT);
  });

  afterAll(async () => {
    await stopServer();
  });

  test("Player can cancel a game they created", (done) => {
    const client = new Client(SERVER_URL, {
      auth: { token: "p1-cancel" },
      transports: ["websocket"],
      forceNew: true,
    });

    client.on("gameCreated", (game) => {
      client.emit("cancelGame", game.id);
    });

    client.on("gameCancelled", () => {
      client.disconnect();
      done();
    });

    client.emit("createGame");
  });

  test("Player can forfeit a game", (done) => {
    const p1 = new Client(SERVER_URL, { auth: { token: "p1-forfeit" } });
    const p2 = new Client(SERVER_URL, { auth: { token: "p2-forfeit" } });
    let gameId;

    p1.on("gameCreated", (game) => {
      gameId = game.id;
      p2.emit("joinGame", gameId);
    });

    p2.on("gameStart", () => {
      p1.emit("forfeitGame", gameId);
    });

    p2.on("gameOver", (game) => {
      expect(game.winner).toBe("p2-forfeit");
      p1.disconnect();
      p2.disconnect();
      done();
    });

    p1.emit("createGame");
  });
});
