export const checkWin = (board) => {
  const WINNING_COMBINATIONS = [
    // Rows
    [0, 1, 2],
    [3, 4, 5],
    [6, 7, 8],
    // Columns
    [0, 3, 6],
    [1, 4, 7],
    [2, 5, 8],
    // Diagonals
    [0, 4, 8],
    [2, 4, 6],
  ];

  for (const combination of WINNING_COMBINATIONS) {
    const [a, b, c] = combination;
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return board[a]; // Returns 'X' or 'O'
    }
  }

  return null;
};

export const checkDraw = (board) => {
  return board.every((cell) => cell !== null);
};

export const resetGameForRematch = (game) => {
  // Swap the starting player
  const player1 = game.players[0];
  const player2 = game.players[1];

  if (game.currentPlayer === player1.playerId) {
    game.currentPlayer = player2.playerId;
  } else {
    game.currentPlayer = player1.playerId;
  }

  // Reset game state
  game.board = Array(9).fill(null);
  game.winner = null;
  game.state = "in_progress";
  game.rematchRequestedBy = [];
};
