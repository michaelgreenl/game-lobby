import { beforeAll, afterAll, describe, it, expect, vi } from "vitest";
import { createServer } from "node:http";
import { Server } from "socket.io";
import { io as ioc } from "socket.io-client";
import { handleConnection } from "../socket/connectionHandlers.js";

vi.mock("../db/index.js", () => ({
  prisma: {
    game: {
      create: vi.fn().mockImplementation((data) => Promise.resolve({ id: "game1", ...data.data })),
      update: vi.fn().mockResolvedValue({}),
    },
    user: {
      findUnique: vi.fn(),
    },
  },
}));

describe("Disconnect Bug", () => {
  let io, client1, client2, httpServer, games, disconnectTimeouts;

  beforeAll(() => {
    return new Promise((resolve) => {
      httpServer = createServer();
      io = new Server(httpServer);

      games = {};
      disconnectTimeouts = new Map();

      io.use((socket, next) => {
        socket.playerId = socket.handshake.auth.token;
        next();
      });

      io.on("connection", (socket) => {
        handleConnection(io, socket, games, disconnectTimeouts);
      });

      httpServer.listen(() => {
        const port = httpServer.address().port;
        client1 = ioc(`http://localhost:${port}`, { auth: { token: "player1" } });
        client2 = ioc(`http://localhost:${port}`, { auth: { token: "player2" } });

        let connected = 0;
        const onConnect = () => {
          connected++;
          if (connected === 2) resolve();
        }
        client1.on("connect", onConnect);
        client2.on("connect", onConnect);
      });
    });
  });

  afterAll(() => {
    io.close();
    httpServer.close();
    client1.disconnect();
    client2.disconnect();
    vi.restoreAllMocks();
  });

  it("should notify the remaining player when an opponent disconnects for the first time", async () => {
    let gameId;

    // 1. Create and join a game
    client1.emit("createGame");
    await new Promise(res => {
      client1.on("gameCreated", (game) => {
        gameId = game.id;
        client2.emit("joinGame", gameId);
        res();
      });
    });
    await new Promise(res => client1.on("gameStart", res));
    await new Promise(res => client2.on("gameStart", res));

    // 2. Set up a listener for the disconnect event on client1
    const disconnectHandler = vi.fn();
    client1.on("playerDisconnected", disconnectHandler);

    // 3. Disconnect client2
    client2.disconnect();

    // 4. Wait for the event to be processed and assert
    await new Promise(res => setTimeout(res, 200));

    expect(disconnectHandler).toHaveBeenCalledOnce();
    expect(disconnectHandler).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "Opponent disconnected. You will win in 30 seconds if they don't reconnect.",
        gameId: gameId,
      })
    );
  });
});
