# ISA Bingo - Multiplayer Game

A real-time multiplayer Bingo game that supports 100+ simultaneous players. Built with Node.js, Express, Socket.IO, and modern web technologies.

## Features

- **Multiplayer Support**: Up to 100+ simultaneous players
- **Real-time Communication**: Instant updates using Socket.IO
- **Host Mode**: Create games and manage players
- **Player Mode**: Join games with room codes
- **Interactive Bingo Cards**: Click to mark numbers
- **BINGO Letter System**: Strike off letters as you complete lines
- **Winner Tracking**: See who wins in order
- **Responsive Design**: Works on desktop and mobile devices
- **Beautiful UI**: Modern gradient design with smooth animations
- **Custom Room Codes**: Hosts can set custom room codes
- **Persistent Marking**: Option to allow marking any previously called number
- **New Game Feature**: Start new games in the same room after a winner
- **Continuous Number Generation**: Numbers continue until a player wins

## Game Rules

1. **Setup**: Each player gets a 5x5 bingo card with random numbers from 1-100
2. **Gameplay**: Host calls random numbers from 1-100
3. **Marking**: Players click numbers on their cards if they match the called number
4. **BINGO Lines**: When a player gets 5 consecutive numbers (horizontally, vertically, or diagonally), a letter from "BINGO" is struck off
5. **Winning**: First player to strike off all 5 letters wins

## New Features

### Host Features:
- **Custom Room Codes**: Set your own room code (3-8 characters) or use auto-generated ones
- **Persistent Marking Toggle**: Enable/disable the ability for players to mark any previously called number
- **New Game Button**: Start a new game in the same room after someone wins
- **Game Settings Panel**: Real-time control over game settings
- **Continuous Number Generation**: Numbers continue until a player wins (no 100 number limit)

### Player Features:
- **Persistent Marking**: When enabled, players can mark any number that was previously called
- **Called Numbers Display**: See all numbers that have been called during the game
- **Enhanced Feedback**: Better visual feedback for marking attempts

## Installation

1. **Clone or download the project**
2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Start the server**:
   ```bash
   npm start
   ```

4. **Open your browser** and go to `http://localhost:3000`

## How to Play

### As a Host:
1. Click "Host Game" on the home screen
2. **Optional**: Enter a custom room code (3-8 characters)
3. **Optional**: Enable persistent marking for more flexible gameplay
4. Click "Create Game" to generate the room
5. Share the room code with players
6. Click "Start Game" when ready
7. Click "Call Number" to generate random numbers
8. Monitor players and winners in real-time
9. After a winner, click "New Game" to start another round

### As a Player:
1. Click "Join Game" on the home screen
2. Enter the room code and your name
3. Wait for the host to start the game
4. Click numbers on your bingo card when they match the called number
5. **With persistent marking**: Mark any previously called number at any time
6. Complete 5 lines to win!

## Game Modes

### Standard Mode (Default):
- Players can only mark the currently called number
- More challenging and requires quick reflexes

### Persistent Marking Mode:
- Players can mark any number that was previously called
- More relaxed gameplay, suitable for larger groups
- Better for players who might miss numbers

## Technical Details

### Backend (Node.js + Express + Socket.IO)
- **Real-time communication** using Socket.IO
- **Game state management** with in-memory storage
- **Custom room code generation** with validation
- **Player tracking** and winner management
- **Bingo pattern detection** for win conditions
- **Settings management** for game customization

### Frontend (HTML + CSS + JavaScript)
- **Responsive design** with CSS Grid and Flexbox
- **Modern UI** with gradients and animations
- **Real-time updates** without page refresh
- **Interactive bingo cards** with click events
- **Notification system** for user feedback
- **Custom form validation** for room codes

### Key Features:
- **Scalable Architecture**: Can handle 100+ concurrent players
- **Error Handling**: Graceful handling of disconnections and errors
- **Mobile Responsive**: Works on all device sizes
- **Accessibility**: Keyboard navigation and screen reader friendly
- **Performance Optimized**: Efficient DOM updates and minimal re-renders
- **Flexible Gameplay**: Multiple game modes and settings

## File Structure

```
Bingo/
├── server.js          # Main server file
├── package.json       # Dependencies and scripts
├── README.md         # This file
└── public/           # Frontend files
    ├── index.html    # Main HTML file
    ├── styles.css    # CSS styles
    └── script.js     # Client-side JavaScript
```

## Dependencies

- **express**: Web server framework
- **socket.io**: Real-time communication
- **cors**: Cross-origin resource sharing
- **uuid**: Unique identifier generation

## Development

To run in development mode with auto-restart:
```bash
npm run dev
```

## Deployment

The application can be deployed to any Node.js hosting platform:

1. **Heroku**: Connect your GitHub repository
2. **Vercel**: Deploy with Vercel CLI
3. **Railway**: Connect and deploy automatically
4. **DigitalOcean**: Deploy to App Platform

## Browser Support

- Chrome 60+
- Firefox 55+
- Safari 12+
- Edge 79+

## Contributing

Feel free to submit issues and enhancement requests!

## License

MIT License - feel free to use this project for educational or commercial purposes.
