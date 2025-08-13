const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Game state storage
const games = new Map();
const players = new Map();

// Generate random numbers for bingo cards
function generateBingoCard() {
  const numbers = [];
  const usedNumbers = new Set();
  
  while (numbers.length < 25) {
    const num = Math.floor(Math.random() * 100) + 1;
    if (!usedNumbers.has(num)) {
      numbers.push(num);
      usedNumbers.add(num);
    }
  }
  
  return numbers;
}

// Check for BINGO patterns
function checkBingoPattern(card, markedNumbers, completedPatterns) {
  const patterns = [
    // Rows
    [0, 1, 2, 3, 4], [5, 6, 7, 8, 9], [10, 11, 12, 13, 14], [15, 16, 17, 18, 19], [20, 21, 22, 23, 24],
    // Columns
    [0, 5, 10, 15, 20], [1, 6, 11, 16, 21], [2, 7, 12, 17, 22], [3, 8, 13, 18, 23], [4, 9, 14, 19, 24],
    // Diagonals
    [0, 6, 12, 18, 24], [4, 8, 12, 16, 20]
  ];
  
  // Check if any new pattern is completed
  for (let i = 0; i < patterns.length; i++) {
    const pattern = patterns[i];
    if (pattern.every(index => markedNumbers.includes(card[index]))) {
      // This pattern is complete, check if it's a new completion
      if (!completedPatterns.includes(i)) {
        return { newLine: true, patternIndex: i };
      }
    }
  }
  return { newLine: false, patternIndex: -1 };
}

// Generate room code
function generateRoomCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);
  
  // Host creates a new game
  socket.on('createGame', (data) => {
    const customRoomCode = data?.roomCode?.trim().toUpperCase();
    let roomCode;
    
    if (customRoomCode && customRoomCode.length >= 3 && customRoomCode.length <= 8) {
      // Check if custom room code is already in use
      let codeExists = false;
      for (let [gameId, game] of games) {
        if (game.roomCode === customRoomCode) {
          codeExists = true;
          break;
        }
      }
      
      if (codeExists) {
        socket.emit('gameCreationError', { message: 'Room code already exists' });
        return;
      }
      
      roomCode = customRoomCode;
    } else {
      roomCode = generateRoomCode();
    }
    
    const gameId = uuidv4();
    
    const game = {
      id: gameId,
      roomCode: roomCode,
      host: socket.id,
      players: new Map(),
      calledNumbers: [],
      winners: [],
      gameStarted: false,
      gamePaused: false,
      gameEnded: false,
      currentNumber: null,
      persistentMarking: data?.persistentMarking || false
    };
    
    games.set(gameId, game);
    socket.join(gameId);
    socket.emit('gameCreated', { roomCode, gameId, persistentMarking: game.persistentMarking });
    
    console.log(`Game created: ${roomCode} by ${socket.id}`);
  });
  
  // Player joins a game
  socket.on('joinGame', (data) => {
    const { roomCode, playerName } = data;
    
    // Find game by room code
    let targetGame = null;
    for (let [gameId, game] of games) {
      if (game.roomCode === roomCode) {
        targetGame = game;
        break;
      }
    }
    
    if (!targetGame) {
      socket.emit('joinError', { message: 'Room not found' });
      return;
    }
    
    if (targetGame.gameStarted && !targetGame.gamePaused && !targetGame.gameEnded) {
      socket.emit('joinError', { message: 'Game already in progress' });
      return;
    }
    
    // Check for duplicate usernames in the same game
    const existingPlayerNames = Array.from(targetGame.players.values()).map(p => p.name.toLowerCase());
    if (existingPlayerNames.includes(playerName.toLowerCase())) {
      socket.emit('joinError', { message: 'Username already taken in this game' });
      return;
    }
    
    // Generate bingo card for player
    const bingoCard = generateBingoCard();
    const player = {
      id: socket.id,
      name: playerName,
      bingoCard: bingoCard,
      markedNumbers: [],
      bingoLetters: ['B', 'I', 'N', 'G', 'O'],
      completedLines: 0,
      completedPatterns: [] // Track which patterns have been completed
    };
    
    targetGame.players.set(socket.id, player);
    players.set(socket.id, targetGame.id);
    
    socket.join(targetGame.id);
    socket.emit('gameJoined', { 
      gameId: targetGame.id, 
      bingoCard: bingoCard,
      roomCode: roomCode,
      persistentMarking: targetGame.persistentMarking,
      calledNumbers: targetGame.calledNumbers,
      gamePaused: targetGame.gamePaused
    });
    
    // Notify host about new player
    socket.to(targetGame.id).emit('playerJoined', { 
      playerName, 
      playerCount: targetGame.players.size 
    });
    
    console.log(`Player ${playerName} joined game ${roomCode}`);
  });
  
  // Host starts the game
  socket.on('startGame', (data) => {
    const { gameId } = data;
    const game = games.get(gameId);
    
    if (game && game.host === socket.id) {
      game.gameStarted = true;
      game.gamePaused = false;
      game.gameEnded = false;
      game.winners = [];
      game.calledNumbers = [];
      game.currentNumber = null;
      
      // Reset all players
      for (let [playerId, player] of game.players) {
        player.markedNumbers = [];
        player.bingoLetters = ['B', 'I', 'N', 'G', 'O'];
        player.completedLines = 0;
        player.completedPatterns = []; // Reset completed patterns
      }
      
      io.to(gameId).emit('gameStarted');
      console.log(`Game ${game.roomCode} started`);
    }
  });
  
  // Host pauses the game
  socket.on('pauseGame', (data) => {
    const { gameId } = data;
    const game = games.get(gameId);
    
    if (game && game.host === socket.id && game.gameStarted && !game.gameEnded) {
      game.gamePaused = true;
      io.to(gameId).emit('gamePaused');
      console.log(`Game ${game.roomCode} paused`);
    }
  });
  
  // Host resumes the game
  socket.on('resumeGame', (data) => {
    const { gameId } = data;
    const game = games.get(gameId);
    
    if (game && game.host === socket.id && game.gameStarted && game.gamePaused) {
      game.gamePaused = false;
      io.to(gameId).emit('gameResumed');
      console.log(`Game ${game.roomCode} resumed`);
    }
  });
  
  // Host ends the game
  socket.on('endGame', (data) => {
    const { gameId } = data;
    const game = games.get(gameId);
    
    if (game && game.host === socket.id && game.gameStarted) {
      game.gameEnded = true;
      game.gamePaused = false;
      
      // Force all players to exit the game
      io.to(gameId).emit('gameEnded', {
        message: 'Game ended by host - Room terminated',
        winners: game.winners,
        forceExit: true
      });
      
      // Destroy the game and room
      games.delete(gameId);
      
      // Remove all players from the game
      for (let [playerId, player] of game.players) {
        players.delete(playerId);
      }
      
      console.log(`Game ${game.roomCode} ended by host - Room terminated`);
    }
  });
  
  // Host calls a number
  socket.on('callNumber', (data) => {
    const { gameId } = data;
    const game = games.get(gameId);
    
    if (game && game.host === socket.id && game.gameStarted && !game.gamePaused && !game.gameEnded) {
      let newNumber;
      do {
        newNumber = Math.floor(Math.random() * 100) + 1;
      } while (game.calledNumbers.includes(newNumber));
      
      game.calledNumbers.push(newNumber);
      game.currentNumber = newNumber;
      
      io.to(gameId).emit('numberCalled', { number: newNumber });
      console.log(`Number called in ${game.roomCode}: ${newNumber}`);
    }
  });
  
  // Player marks a number
  socket.on('markNumber', (data) => {
    const { number, gameId } = data;
    const game = games.get(gameId);
    const player = game?.players.get(socket.id);
    
    if (!game || !player || game.gameEnded || game.gamePaused) {
      console.log(`Cannot mark number ${number}: game=${!!game}, player=${!!player}, ended=${game?.gameEnded}, paused=${game?.gamePaused}`);
      return;
    }
    
    // Check if number is in called numbers
    const isCalledNumber = game.calledNumbers.includes(number);
    
    // Only allow marking if the number has been called by the host
    if (isCalledNumber && player.bingoCard.includes(number)) {
      // Correct number
      if (!player.markedNumbers.includes(number)) {
        player.markedNumbers.push(number);
        console.log(`Player ${player.name} marked number ${number} in game ${game.roomCode}`);
        
        // Check for BINGO patterns
        const { newLine, patternIndex } = checkBingoPattern(player.bingoCard, player.markedNumbers, player.completedPatterns);
        
        if (newLine) {
          player.completedLines++;
          player.completedPatterns.push(patternIndex); // Track this pattern as completed
          
          if (player.completedLines <= 5) {
            player.bingoLetters[player.completedLines - 1] = null;
            
            // Notify host about BINGO letter
            socket.to(gameId).emit('bingoLetter', {
              playerName: player.name,
              letter: ['B', 'I', 'N', 'G', 'O'][player.completedLines - 1],
              completedLines: player.completedLines
            });
            
            // Check for winner
            if (player.completedLines === 5) {
              game.winners.push({
                name: player.name,
                position: game.winners.length + 1
              });
              
              game.gameEnded = true;
              
              io.to(gameId).emit('winner', {
                playerName: player.name,
                position: game.winners.length,
                winners: game.winners
              });
              
              console.log(`Winner in ${game.roomCode}: ${player.name}`);
            }
          }
        }
        
        socket.emit('numberMarked', { 
          number, 
          correct: true, 
          markedNumbers: player.markedNumbers,
          bingoLetters: player.bingoLetters,
          completedLines: player.completedLines
        });
      } else {
        // Number already marked
        socket.emit('numberMarked', { 
          number, 
          correct: true, 
          markedNumbers: player.markedNumbers,
          bingoLetters: player.bingoLetters,
          completedLines: player.completedLines
        });
      }
    } else {
      // Wrong number or not called
      console.log(`Player ${player.name} tried to mark wrong number ${number} in game ${game.roomCode}. Called: ${isCalledNumber}, OnCard: ${player.bingoCard.includes(number)}`);
      socket.emit('numberMarked', { 
        number, 
        correct: false 
      });
    }
  });
  
  // Host updates game settings
  socket.on('updateSettings', (data) => {
    const { gameId, persistentMarking } = data;
    const game = games.get(gameId);
    
    if (game && game.host === socket.id) {
      game.persistentMarking = persistentMarking;
      io.to(gameId).emit('settingsUpdated', { persistentMarking });
      console.log(`Settings updated in ${game.roomCode}: persistentMarking=${persistentMarking}`);
    }
  });
  
  // Get game status
  socket.on('getGameStatus', (data) => {
    const { gameId } = data;
    const game = games.get(gameId);
    
    if (game) {
      const playerList = Array.from(game.players.values()).map(p => ({
        name: p.name,
        completedLines: p.completedLines
      }));
      
      socket.emit('gameStatus', {
        players: playerList,
        calledNumbers: game.calledNumbers,
        currentNumber: game.currentNumber,
        winners: game.winners,
        gameEnded: game.gameEnded,
        gamePaused: game.gamePaused,
        persistentMarking: game.persistentMarking
      });
    }
  });
  
  // Disconnect handling
  socket.on('disconnect', () => {
    const gameId = players.get(socket.id);
    if (gameId) {
      const game = games.get(gameId);
      if (game) {
        game.players.delete(socket.id);
        players.delete(socket.id);
        
        // Notify other players
        socket.to(gameId).emit('playerLeft', { 
          playerCount: game.players.size 
        });
        
        // If host left, destroy the game and room code
        if (game.host === socket.id) {
          io.to(gameId).emit('hostLeft');
          games.delete(gameId);
          console.log(`Game ${game.roomCode} destroyed - host left`);
        }
      }
    }
    
    console.log('User disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`ISA Bingo server running on port ${PORT}`);
});
