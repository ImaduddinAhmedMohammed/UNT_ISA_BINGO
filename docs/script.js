// Global variables
let socket;
let currentGameId = null;
let currentRoomCode = null;
let playerName = null;
let bingoCard = [];
let markedNumbers = [];
let bingoLetters = ['B', 'I', 'N', 'G', 'O'];
let completedLines = 0;
let isHost = false;
let persistentMarking = false;
let calledNumbers = [];
let gamePaused = false;

// DOM elements
const screens = {
    home: document.getElementById('homeScreen'),
    hostCreation: document.getElementById('hostCreationScreen'),
    host: document.getElementById('hostScreen'),
    join: document.getElementById('joinScreen'),
    player: document.getElementById('playerScreen'),
    loading: document.getElementById('loadingScreen')
};

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    initializeSocket();
    setupEventListeners();
    showScreen('home');
});

// Initialize Socket.IO connection
function initializeSocket() {
    socket = io();
    
    socket.on('connect', () => {
        console.log('Connected to server');
        hideLoading();
    });
    
    socket.on('disconnect', () => {
        console.log('Disconnected from server');
        showNotification('Connection lost. Please refresh the page.', 'error');
    });
    
    // Host events
    socket.on('gameCreated', handleGameCreated);
    socket.on('gameCreationError', handleGameCreationError);
    socket.on('playerJoined', handlePlayerJoined);
    socket.on('bingoLetter', handleBingoLetter);
    socket.on('winner', handleWinner);
    socket.on('playerLeft', handlePlayerLeft);
    socket.on('hostLeft', handleHostLeft);
    socket.on('settingsUpdated', handleSettingsUpdated);
    socket.on('gamePaused', handleGamePaused);
    socket.on('gameResumed', handleGameResumed);
    socket.on('gameEnded', handleGameEnded);
    
    // Player events
    socket.on('gameJoined', handleGameJoined);
    socket.on('joinError', handleJoinError);
    socket.on('gameStarted', handleGameStarted);
    socket.on('numberCalled', handleNumberCalled);
    socket.on('numberMarked', handleNumberMarked);
}

// Setup event listeners
function setupEventListeners() {
    // Home screen
    document.getElementById('hostBtn').addEventListener('click', () => showScreen('hostCreation'));
    document.getElementById('joinBtn').addEventListener('click', () => showScreen('join'));
    
    // Host creation screen
    document.getElementById('createGameBtn').addEventListener('click', createGame);
    document.getElementById('backToHomeCreation').addEventListener('click', () => showScreen('home'));
    
    // Host screen
    document.getElementById('startGameBtn').addEventListener('click', startGame);
    document.getElementById('pauseGameBtn').addEventListener('click', pauseGame);
    document.getElementById('resumeGameBtn').addEventListener('click', resumeGame);
    document.getElementById('callNumberBtn').addEventListener('click', callNumber);
    document.getElementById('endGameBtn').addEventListener('click', endGame);
    document.getElementById('newGameBtn').addEventListener('click', startNewGame);
    document.getElementById('copyCode').addEventListener('click', copyRoomCode);
    document.getElementById('backToHomeHost').addEventListener('click', () => showScreen('home'));
    document.getElementById('persistentMarkingToggle').addEventListener('change', updateSettings);
    
    // Join screen
    document.getElementById('joinGameBtn').addEventListener('click', joinGame);
    document.getElementById('backToHomeJoin').addEventListener('click', () => showScreen('home'));
    
    // Player screen
    document.getElementById('backToHomePlayer').addEventListener('click', () => showScreen('home'));
    
    // Form inputs
    document.getElementById('roomCodeInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') joinGame();
    });
    document.getElementById('playerNameInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') joinGame();
    });
    document.getElementById('customRoomCode').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') createGame();
    });
}

// Screen management
function showScreen(screenName) {
    Object.values(screens).forEach(screen => {
        screen.classList.remove('active');
    });
    screens[screenName].classList.add('active');
}

function showLoading() {
    screens.loading.classList.add('active');
}

function hideLoading() {
    screens.loading.classList.remove('active');
}

// Notification system
function showNotification(message, type = 'info') {
    const notification = document.getElementById('notification');
    notification.textContent = message;
    notification.className = `notification ${type} show`;
    
    setTimeout(() => {
        notification.classList.remove('show');
    }, 3000);
}

// Host functions
function createGame() {
    const customRoomCode = document.getElementById('customRoomCode').value.trim().toUpperCase();
    const persistentMarkingEnabled = document.getElementById('persistentMarking').checked;
    
    if (customRoomCode && (customRoomCode.length < 3 || customRoomCode.length > 8)) {
        showNotification('Room code must be between 3 and 8 characters', 'error');
        return;
    }
    
    showLoading();
    socket.emit('createGame', { 
        roomCode: customRoomCode || null,
        persistentMarking: persistentMarkingEnabled
    });
}

function handleGameCreated(data) {
    hideLoading();
    currentGameId = data.gameId;
    currentRoomCode = data.roomCode;
    persistentMarking = data.persistentMarking;
    isHost = true;
    
    document.getElementById('roomCode').textContent = data.roomCode;
    document.getElementById('persistentMarkingToggle').checked = data.persistentMarking;
    updateGameStatus('waiting', 'Waiting for players...');
    showScreen('host');
    showNotification('Game created! Share the room code with players.', 'success');
}

function handleGameCreationError(data) {
    hideLoading();
    showNotification(data.message, 'error');
}

function startGame() {
    socket.emit('startGame', { gameId: currentGameId });
    document.getElementById('startGameBtn').style.display = 'none';
    document.getElementById('pauseGameBtn').style.display = 'inline-flex';
    document.getElementById('resumeGameBtn').style.display = 'none';
    document.getElementById('callNumberBtn').disabled = false;
    document.getElementById('newGameBtn').style.display = 'none';
    document.getElementById('endGameBtn').style.display = 'inline-flex';
    updateGameStatus('playing', 'Game in progress');
    
    // Reset called numbers display
    resetCalledNumbersDisplay();
    
    showNotification('Game started!', 'success');
}

function startNewGame() {
    socket.emit('startGame', { gameId: currentGameId });
    document.getElementById('startGameBtn').style.display = 'none';
    document.getElementById('pauseGameBtn').style.display = 'inline-flex';
    document.getElementById('resumeGameBtn').style.display = 'none';
    document.getElementById('callNumberBtn').disabled = false;
    document.getElementById('newGameBtn').style.display = 'none';
    document.getElementById('endGameBtn').style.display = 'inline-flex';
    updateGameStatus('playing', 'Game in progress');
    
    // Reset called numbers display
    resetCalledNumbersDisplay();
    
    showNotification('New game started!', 'success');
}

function pauseGame() {
    socket.emit('pauseGame', { gameId: currentGameId });
    document.getElementById('pauseGameBtn').style.display = 'none';
    document.getElementById('resumeGameBtn').style.display = 'inline-flex';
    document.getElementById('callNumberBtn').disabled = true;
    document.getElementById('endGameBtn').style.display = 'inline-flex';
    updateGameStatus('paused', 'Game paused');
    showNotification('Game paused! Players can still join.', 'info');
}

function resumeGame() {
    socket.emit('resumeGame', { gameId: currentGameId });
    document.getElementById('pauseGameBtn').style.display = 'inline-flex';
    document.getElementById('resumeGameBtn').style.display = 'none';
    document.getElementById('callNumberBtn').disabled = false;
    document.getElementById('endGameBtn').style.display = 'inline-flex';
    updateGameStatus('playing', 'Game in progress');
    showNotification('Game resumed!', 'success');
}

function callNumber() {
    socket.emit('callNumber', { gameId: currentGameId });
}

function endGame() {
    socket.emit('endGame', { gameId: currentGameId });
    document.getElementById('startGameBtn').style.display = 'inline-flex';
    document.getElementById('pauseGameBtn').style.display = 'none';
    document.getElementById('resumeGameBtn').style.display = 'none';
    document.getElementById('callNumberBtn').disabled = true;
    document.getElementById('newGameBtn').style.display = 'none';
    updateGameStatus('ended', 'Game ended');
    showNotification('Game ended by host', 'info');
}

function copyRoomCode() {
    navigator.clipboard.writeText(currentRoomCode).then(() => {
        showNotification('Room code copied to clipboard!', 'success');
    }).catch(() => {
        showNotification('Failed to copy room code', 'error');
    });
}

function updateSettings() {
    const persistentMarkingEnabled = document.getElementById('persistentMarkingToggle').checked;
    socket.emit('updateSettings', { 
        gameId: currentGameId, 
        persistentMarking: persistentMarkingEnabled 
    });
}

function updateGameStatus(status, text) {
    const statusElement = document.getElementById('gameStatus');
    const statusTextElement = statusElement.querySelector('.status-text');
    
    statusElement.className = `status-indicator ${status}`;
    statusTextElement.textContent = text;
}

function handleSettingsUpdated(data) {
    persistentMarking = data.persistentMarking;
    showNotification('Settings updated!', 'success');
}

function handleGamePaused() {
    if (isHost) {
        document.getElementById('pauseGameBtn').style.display = 'none';
        document.getElementById('resumeGameBtn').style.display = 'inline-flex';
        document.getElementById('callNumberBtn').disabled = true;
        updateGameStatus('paused', 'Game paused');
    } else {
        updatePlayerGameStatus('Game paused');
    }
    showNotification('Game paused by host', 'info');
}

function handleGameResumed() {
    if (isHost) {
        document.getElementById('pauseGameBtn').style.display = 'inline-flex';
        document.getElementById('resumeGameBtn').style.display = 'none';
        document.getElementById('callNumberBtn').disabled = false;
        updateGameStatus('playing', 'Game in progress');
    } else {
        updatePlayerGameStatus('Game in progress');
    }
    showNotification('Game resumed by host', 'success');
}

function handleGameEnded(data) {
    if (data.forceExit) {
        // Force exit - room terminated
        showNotification('Game ended by host - Room terminated', 'error');
        setTimeout(() => {
            showScreen('home');
            resetGame();
        }, 2000);
    } else {
        if (isHost) {
            document.getElementById('startGameBtn').style.display = 'inline-flex';
            document.getElementById('pauseGameBtn').style.display = 'none';
            document.getElementById('resumeGameBtn').style.display = 'none';
            document.getElementById('callNumberBtn').disabled = true;
            document.getElementById('newGameBtn').style.display = 'none';
            updateGameStatus('ended', 'Game ended');
            showNotification('Game ended by host', 'info');
        } else {
            updatePlayerGameStatus('Game ended');
        }
    }
}

function handlePlayerJoined(data) {
    updatePlayerCount(data.playerCount);
    addPlayerToList(data.playerName);
    showNotification(`${data.playerName} joined the game!`, 'info');
}

function handleBingoLetter(data) {
    addBingoLetter(data.playerName, data.letter, data.completedLines);
    showNotification(`${data.playerName} got ${data.letter}!`, 'info');
}

function handleWinner(data) {
    addWinner(data.playerName, data.position);
    document.getElementById('callNumberBtn').disabled = true;
    document.getElementById('pauseGameBtn').style.display = 'none';
    document.getElementById('resumeGameBtn').style.display = 'none';
    document.getElementById('endGameBtn').style.display = 'none';
    document.getElementById('newGameBtn').style.display = 'inline-flex';
    updateGameStatus('ended', 'Game ended - Winner found!');
    showNotification(`${data.playerName} won the game!`, 'success');
}

function handlePlayerLeft(data) {
    updatePlayerCount(data.playerCount);
    showNotification('A player left the game', 'info');
}

function handleHostLeft() {
    showNotification('Host left the game', 'error');
    showScreen('home');
}

// Player functions
function joinGame() {
    const roomCode = document.getElementById('roomCodeInput').value.trim().toUpperCase();
    const name = document.getElementById('playerNameInput').value.trim();
    
    if (!roomCode || !name) {
        showNotification('Please enter both room code and name', 'error');
        return;
    }
    
    if (name.length < 2) {
        showNotification('Name must be at least 2 characters', 'error');
        return;
    }
    
    showLoading();
    socket.emit('joinGame', { roomCode, playerName: name });
}

function handleGameJoined(data) {
    hideLoading();
    currentGameId = data.gameId;
    currentRoomCode = data.roomCode;
    bingoCard = data.bingoCard;
    persistentMarking = data.persistentMarking;
    calledNumbers = data.calledNumbers || [];
    gamePaused = data.gamePaused || false;
    playerName = document.getElementById('playerNameInput').value.trim();
    isHost = false;
    
    document.getElementById('playerRoomCode').textContent = data.roomCode;
    document.getElementById('playerName').textContent = playerName;
    
    createBingoCard();
    createBingoLetters();
    updatePlayerCalledNumbers();
    
    if (gamePaused) {
        updatePlayerGameStatus('Game paused');
    } else {
        updatePlayerGameStatus('Waiting for game to start...');
    }
    
    showScreen('player');
    showNotification('Successfully joined the game!', 'success');
}

function handleJoinError(data) {
    hideLoading();
    showNotification(data.message, 'error');
}

function handleGameStarted() {
    // Reset player state for new game
    markedNumbers = [];
    bingoLetters = ['B', 'I', 'N', 'G', 'O'];
    completedLines = 0;
    calledNumbers = [];
    gamePaused = false;
    
    createBingoCard();
    createBingoLetters();
    updatePlayerCalledNumbers();
    updateMarkedNumbers();
    updatePlayerGameStatus('Game in progress');
    
    showNotification('Game started!', 'info');
}

function handleNumberCalled(data) {
    const currentNumberElement = isHost ? 
        document.getElementById('currentNumber') : 
        document.getElementById('playerCurrentNumber');
    
    currentNumberElement.textContent = data.number;
    currentNumberElement.style.animation = 'pulse 0.5s ease-in-out';
    
    setTimeout(() => {
        currentNumberElement.style.animation = '';
    }, 500);
    
    if (isHost) {
        addCalledNumber(data.number);
    } else {
        calledNumbers.push(data.number);
        updatePlayerCalledNumbers();
    }
}

function handleNumberMarked(data) {
    if (data.correct) {
        markedNumbers = data.markedNumbers;
        bingoLetters = data.bingoLetters;
        completedLines = data.completedLines;
        
        updateBingoCard();
        updateBingoLetters();
        updateMarkedNumbers();
        
        if (completedLines === 5) {
            showNotification('Congratulations! You won!', 'success');
        }
    } else {
        // Show wrong number animation
        const cell = document.querySelector(`[data-number="${data.number}"]`);
        if (cell) {
            cell.classList.add('wrong');
            setTimeout(() => {
                cell.classList.remove('wrong');
            }, 3000);
        }
    }
}

function updatePlayerGameStatus(text) {
    const statusElement = document.getElementById('playerGameStatus');
    const statusTextElement = statusElement.querySelector('.status-text');
    statusTextElement.textContent = text;
}

// UI update functions
function updatePlayerCount(count) {
    document.getElementById('playerCount').textContent = count;
}

function addPlayerToList(name) {
    const playersList = document.getElementById('playersList');
    const playerItem = document.createElement('div');
    playerItem.className = 'player-item';
    playerItem.innerHTML = `
        <span>${name}</span>
        <span>0 lines</span>
    `;
    playersList.appendChild(playerItem);
}

function addBingoLetter(playerName, letter, completedLines) {
    const playersList = document.getElementById('playersList');
    const playerItems = playersList.querySelectorAll('.player-item');
    
    for (let item of playerItems) {
        if (item.querySelector('span').textContent === playerName) {
            item.querySelector('span:last-child').textContent = `${completedLines} lines`;
            break;
        }
    }
    
    // Update BINGO letters display
    const bingoLettersDisplay = document.getElementById('bingoLetters');
    const letterElements = bingoLettersDisplay.querySelectorAll('.bingo-letter');
    const letterIndex = ['B', 'I', 'N', 'G', 'O'].indexOf(letter);
    
    if (letterElements[letterIndex]) {
        letterElements[letterIndex].classList.add('struck');
    }
}

function addWinner(name, position) {
    const winnersList = document.getElementById('winnersList');
    const winnerItem = document.createElement('div');
    winnerItem.className = 'winner-item';
    winnerItem.innerHTML = `
        <span>${position}. ${name}</span>
        <span>🏆</span>
    `;
    winnersList.appendChild(winnerItem);
}

function addCalledNumber(number) {
    const calledNumbersElement = document.getElementById('calledNumbers');
    const numberItem = document.createElement('div');
    numberItem.className = 'number-item called';
    numberItem.textContent = number;
    calledNumbersElement.appendChild(numberItem);
}

function updatePlayerCalledNumbers() {
    const calledNumbersElement = document.getElementById('playerCalledNumbers');
    calledNumbersElement.innerHTML = '';
    
    calledNumbers.forEach(number => {
        const numberItem = document.createElement('div');
        numberItem.className = 'number-item called';
        numberItem.textContent = number;
        calledNumbersElement.appendChild(numberItem);
    });
}

function createBingoCard() {
    const bingoCardElement = document.getElementById('bingoCard');
    bingoCardElement.innerHTML = '';
    
    bingoCard.forEach((number, index) => {
        const cell = document.createElement('div');
        cell.className = 'bingo-cell';
        cell.textContent = number;
        cell.setAttribute('data-number', number);
        cell.addEventListener('click', () => markNumber(number));
        bingoCardElement.appendChild(cell);
    });
}

function createBingoLetters() {
    const bingoLettersElement = document.getElementById('playerBingoLetters');
    bingoLettersElement.innerHTML = '';
    
    bingoLetters.forEach(letter => {
        const letterElement = document.createElement('div');
        letterElement.className = 'bingo-letter';
        letterElement.textContent = letter;
        bingoLettersElement.appendChild(letterElement);
    });
}

function updateBingoCard() {
    const cells = document.querySelectorAll('.bingo-cell');
    cells.forEach(cell => {
        const number = parseInt(cell.getAttribute('data-number'));
        if (markedNumbers.includes(number)) {
            cell.classList.add('marked');
        }
    });
}

function updateBingoLetters() {
    const letterElements = document.querySelectorAll('#playerBingoLetters .bingo-letter');
    bingoLetters.forEach((letter, index) => {
        if (letter === null) {
            // Letter is struck - turn it green
            letterElements[index].classList.add('struck');
            letterElements[index].style.background = '#27ae60';
            letterElements[index].style.color = 'white';
            letterElements[index].style.borderColor = '#27ae60';
            letterElements[index].style.boxShadow = '0 0 15px rgba(39, 174, 96, 0.5)';
        } else {
            // Letter is not struck - reset to default
            letterElements[index].classList.remove('struck');
            letterElements[index].style.background = 'rgba(45, 27, 45, 0.8)';
            letterElements[index].style.color = '#ff6b35';
            letterElements[index].style.borderColor = '#ff6b35';
            letterElements[index].style.boxShadow = '0 0 10px rgba(255, 107, 53, 0.3)';
        }
    });
}

function updateMarkedNumbers() {
    const markedNumbersElement = document.getElementById('markedNumbers');
    markedNumbersElement.innerHTML = '';
    
    markedNumbers.forEach(number => {
        const numberItem = document.createElement('div');
        numberItem.className = 'number-item called';
        numberItem.textContent = number;
        markedNumbersElement.appendChild(numberItem);
    });
}

function markNumber(number) {
    if (!isHost && currentGameId && !gamePaused) {
        // Only allow marking if the number has been called by the host
        if (calledNumbers.includes(number)) {
            socket.emit('markNumber', { number, gameId: currentGameId });
            console.log('Marking number:', number, 'Called numbers:', calledNumbers);
        } else {
            // Show wrong number animation for uncalled numbers
            const cell = document.querySelector(`[data-number="${number}"]`);
            if (cell) {
                cell.classList.add('wrong');
                setTimeout(() => {
                    cell.classList.remove('wrong');
                }, 2000); // 2 seconds as requested
            }
            console.log('Cannot mark number:', number, 'Not in called numbers');
        }
    } else {
        console.log('Cannot mark number:', number, 'isHost:', isHost, 'currentGameId:', currentGameId, 'gamePaused:', gamePaused);
    }
}

// Utility functions
function resetGame() {
    currentGameId = null;
    currentRoomCode = null;
    playerName = null;
    bingoCard = [];
    markedNumbers = [];
    bingoLetters = ['B', 'I', 'N', 'G', 'O'];
    completedLines = 0;
    isHost = false;
    persistentMarking = false;
    calledNumbers = [];
    gamePaused = false;
    
    // Clear UI
    document.getElementById('roomCodeInput').value = '';
    document.getElementById('playerNameInput').value = '';
    document.getElementById('customRoomCode').value = '';
    document.getElementById('persistentMarking').checked = false;
    document.getElementById('playersList').innerHTML = '';
    document.getElementById('winnersList').innerHTML = '';
    document.getElementById('calledNumbers').innerHTML = '';
    document.getElementById('currentNumber').textContent = '-';
    document.getElementById('playerCurrentNumber').textContent = '-';
    document.getElementById('markedNumbers').innerHTML = '';
    document.getElementById('playerCalledNumbers').innerHTML = '';
    
    // Reset buttons
    document.getElementById('startGameBtn').style.display = 'inline-flex';
    document.getElementById('pauseGameBtn').style.display = 'none';
    document.getElementById('resumeGameBtn').style.display = 'none';
    document.getElementById('endGameBtn').style.display = 'none';
    document.getElementById('callNumberBtn').disabled = true;
    document.getElementById('newGameBtn').style.display = 'none';
}

function resetCalledNumbersDisplay() {
    const calledNumbersElement = document.getElementById('calledNumbers');
    calledNumbersElement.innerHTML = '';
}

// Add CSS animation for number calling
const style = document.createElement('style');
style.textContent = `
    @keyframes pulse {
        0% { transform: scale(1); }
        50% { transform: scale(1.1); }
        100% { transform: scale(1); }
    }
`;
document.head.appendChild(style);
