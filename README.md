# 🎮 Jump and Learn

An educational platformer game developed with Phaser.js and Flask, combining action and learning in a pixel art gaming experience.

![Jump and Learn](https://img.shields.io/badge/Status-In%20Development-yellow)
![Version](https://img.shields.io/badge/Version-1.0.0-blue)
![Phaser](https://img.shields.io/badge/Phaser-3.90.0-orange)
![Flask](https://img.shields.io/badge/Flask-Backend-green)

## 📋 Table of Contents

- [Description](#description)
- [Features](#features)
- [Technologies Used](#technologies-used)
- [Installation](#installation)
- [Project Structure](#project-structure)
- [Game Guide](#game-guide)
- [API Documentation](#api-documentation)
- [License](#license)

## 🎯 Description

Jump and Learn is a 2D platformer game where players must navigate through different levels while answering educational questions. The game combines advanced platformer mechanics (jumping, double jumping, wall jumping) with an interactive question system to create an engaging learning experience.

## ✨ Features

### 🎮 Gameplay
- **Advanced platformer mechanics**: Simple jump, double jump, wall jumping
- **Interactive objects**: Moving platforms, pendulums, pushable obstacles
- **Dynamic enemies**: Bees and bombs with patrol AI
- **Question system**: Educational questions integrated into gameplay
- **Visual and sound effects**: Particles, animations, synthetic sounds

### 🔧 Management System
- **User authentication**: Registration/login with JWT
- **Saved progression**: Tracking of completed levels
- **Timer system**: Performance timing
- **Leaderboard**: Best times ranking
- **Customizable controls**: Key configuration
- **Audio settings**: Music and sound effects volume

### 🎨 User Interface
- **Pixel art design**: Complete retro interface
- **Responsive design**: Mobile and desktop compatible
- **Animated main menu**: Parallax effects and animations
- **In-game settings**: Access to settings during gameplay

## 🛠 Technologies Used

### Frontend
- **Phaser.js 3.90.0** - Game framework
- **HTML5 Canvas** - Graphics rendering
- **CSS3** - Styles and animations
- **JavaScript ES6+** - Client logic
- **Web Audio API** - Synthetic sound effects

### Backend
- **Flask** - Python web framework
- **SQLAlchemy** - Database ORM
- **Flask-JWT-Extended** - JWT authentication
- **Flask-CORS** - Cross-origin request management
- **SQLite** - Database (development)

### Assets
- **Tiled Map Editor** - Level creation
- **Pixel art tilesets** - Retro graphics
- **Animated spritesheets** - Characters and enemies

## 📦 Installation

### Prerequisites
- Python 3.8+
- Git

### Backend Installation

```bash
# Clone the repository
git clone https://github.com/sebgrgs/jumpandlearn.git
cd jumpandlearn

# Configure Python environment
cd server
python -m venv venv
source venv/bin/activate  # Linux/Mac
# or
venv\Scripts\activate     # Windows

# Install dependencies
pip install -r requirements.txt

# Initialize database
python seed_questions.py

# Start server
python run.py
```

### Frontend Installation

```bash
# Return to root folder
cd ..

# Install dependencies
npm install

# Start local server (optional)
npx http-server . -p 8080
```

### Configuration

1. **Database**: SQLite database is created automatically
2. **Environment variables**: Configurable in `server/config.py`
3. **Assets**: All assets are included in the `assets/` folder

## 🗂 Project Structure

```
jumpandlearn/
├── 📁 server/                 # Flask backend
│   ├── 📁 app/
│   │   ├── 📁 api/           # API routes
│   │   ├── 📁 models/        # Data models
│   │   └── 📁 services/      # Business services
│   ├── config.py             # Configuration
│   ├── requirements.txt      # Python dependencies
│   └── run.py               # Server entry point
├── 📁 src/                   # Phaser.js frontend
│   ├── level1scene.js       # Level 1
│   ├── level2scene.js       # Level 2
│   ├── main.js              # Phaser configuration
│   ├── script.js            # Landing page logic
│   ├── Bee.js               # Bee enemy class
│   ├── Bomb.js              # Bomb enemy class
│   ├── MovingPlatforms.js   # Moving platforms
│   └── PendulumObstacles.js # Pendulum obstacles
├── 📁 assets/               # Game resources
│   ├── 📁 maps/            # Tiled maps
│   ├── 📁 tilesets/        # Textures
│   ├── 📁 personnage/      # Character sprites
│   └── 📁 song/            # Music
├── index.html              # Main page
├── game.html              # Game page
├── style.css              # Landing page styles
├── game.css               # Game styles
└── README.md              # Documentation
```

## 🎮 Game Guide

### Default Controls
- **Arrow keys**: Movement
- **Up arrow**: Jump / Double jump
- **Escape**: Settings menu (in-game)

### Game Mechanics
1. **Navigation**: Use controls to move through levels
2. **Questions**: Answer questions correctly to progress
3. **Obstacles**: Avoid enemies and use interactive objects
4. **Objective**: Reach the end of the level as quickly as possible

### Advanced Features
- **Wall Jump**: Jump against a wall to bounce off
- **Coyote Time**: Brief delay to jump after leaving a platform
- **Jump Buffer**: Jump inputs are briefly memorized
- **Pushable objects**: Move blocks to solve puzzles

## 📡 API Documentation

### Authentication
```http
POST /api/v1/auth/register
Content-Type: application/json

{
    "email": "user@example.com",
    "username": "username",
    "password": "password"
}
```

```http
POST /api/v1/auth/login
Content-Type: application/json

{
    "email": "user@example.com",
    "password": "password"
}
```

### Progress
```http
GET /api/v1/progress/
Authorization: Bearer <token>
```

```http
POST /api/v1/progress/
Authorization: Bearer <token>
Content-Type: application/json

{
    "level": 2,
    "completion_time": 45230
}
```

### Questions
```http
GET /api/v1/questions/<id>
```

### Leaderboard
```http
GET /api/v1/progress/leaderboard/
```

## 🎯 Roadmap

### Version 1.1 (Next)
- [ ] New levels with unique mechanics
- [ ] Achievement system

### Version 1.2 (Future)
- [ ] Cloud save
- [ ] Story mode with narration
- [ ] Character customization

## 🐛 Known Issues

- Reduced performance on some mobile browsers
- Audio may not work on some browsers (autoplay policy)
- Some visual effects automatically disabled on mobile


## 📄 License

This project is under ISC license. See the `LICENSE` file for more details.

---

<div align="center">

**🎮 Have fun with Jump and Learn! 🎮**

[🌟 Give a star if you like the project!](https://github.com/sebgrgs/jumpandlearn)

</div>