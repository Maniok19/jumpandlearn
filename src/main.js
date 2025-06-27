// main.js
import Level1Scene from './level1scene.js';
import Level2Scene from './level2scene.js';

class ControlsManager {
  static getControls() {
      return JSON.parse(localStorage.getItem('gameControls')) || {
          jump: 'ArrowUp',
          left: 'ArrowLeft',
          right: 'ArrowRight'
      };
  }

  static createKeys(scene) {
      const controls = this.getControls();
      
      // Conversion des codes en keycodes Phaser
      const keyMap = {
          'Space': Phaser.Input.Keyboard.KeyCodes.SPACE,
          'ArrowLeft': Phaser.Input.Keyboard.KeyCodes.LEFT,
          'ArrowRight': Phaser.Input.Keyboard.KeyCodes.RIGHT,
          'ArrowUp': Phaser.Input.Keyboard.KeyCodes.UP,
          'ArrowDown': Phaser.Input.Keyboard.KeyCodes.DOWN,
          'KeyW': Phaser.Input.Keyboard.KeyCodes.W,
          'KeyA': Phaser.Input.Keyboard.KeyCodes.A,
          'KeyS': Phaser.Input.Keyboard.KeyCodes.S,
          'KeyD': Phaser.Input.Keyboard.KeyCodes.D,
          'KeyQ': Phaser.Input.Keyboard.KeyCodes.Q,
          'KeyZ': Phaser.Input.Keyboard.KeyCodes.Z,
          'KeyE': Phaser.Input.Keyboard.KeyCodes.E,
          'KeyR': Phaser.Input.Keyboard.KeyCodes.R,
          'KeyT': Phaser.Input.Keyboard.KeyCodes.T,
          'KeyY': Phaser.Input.Keyboard.KeyCodes.Y,
          'KeyU': Phaser.Input.Keyboard.KeyCodes.U,
          'KeyI': Phaser.Input.Keyboard.KeyCodes.I,
          'KeyO': Phaser.Input.Keyboard.KeyCodes.O,
          'KeyP': Phaser.Input.Keyboard.KeyCodes.P,
          'KeyF': Phaser.Input.Keyboard.KeyCodes.F,
          'KeyG': Phaser.Input.Keyboard.KeyCodes.G,
          'KeyH': Phaser.Input.Keyboard.KeyCodes.H,
          'KeyJ': Phaser.Input.Keyboard.KeyCodes.J,
          'KeyK': Phaser.Input.Keyboard.KeyCodes.K,
          'KeyL': Phaser.Input.Keyboard.KeyCodes.L,
          'KeyX': Phaser.Input.Keyboard.KeyCodes.X,
          'KeyC': Phaser.Input.Keyboard.KeyCodes.C,
          'KeyV': Phaser.Input.Keyboard.KeyCodes.V,
          'KeyB': Phaser.Input.Keyboard.KeyCodes.B,
          'KeyN': Phaser.Input.Keyboard.KeyCodes.N,
          'KeyM': Phaser.Input.Keyboard.KeyCodes.M,
          'Digit1': Phaser.Input.Keyboard.KeyCodes.ONE,
          'Digit2': Phaser.Input.Keyboard.KeyCodes.TWO,
          'Digit3': Phaser.Input.Keyboard.KeyCodes.THREE,
          'Digit4': Phaser.Input.Keyboard.KeyCodes.FOUR,
          'Digit5': Phaser.Input.Keyboard.KeyCodes.FIVE,
          'Digit6': Phaser.Input.Keyboard.KeyCodes.SIX,
          'Digit7': Phaser.Input.Keyboard.KeyCodes.SEVEN,
          'Digit8': Phaser.Input.Keyboard.KeyCodes.EIGHT,
          'Digit9': Phaser.Input.Keyboard.KeyCodes.NINE,
          'Digit0': Phaser.Input.Keyboard.KeyCodes.ZERO
      };

      return {
          jumpKey: scene.input.keyboard.addKey(keyMap[controls.jump] || controls.jump),
          leftKey: scene.input.keyboard.addKey(keyMap[controls.left] || controls.left),
          rightKey: scene.input.keyboard.addKey(keyMap[controls.right] || controls.right),
          escapeKey: scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC)
      };
  }
}

// Nouvelle classe pour gérer les settings in-game
class InGameSettingsManager {
    static showSettings(scene) {
        // Pause le jeu
        scene.physics.world.pause();
        scene.input.keyboard.enabled = false;
        this.pauseTimer(scene);

        const settingsUI = document.createElement('div');
        settingsUI.className = 'in-game-settings-ui';
        settingsUI.innerHTML = `
            <div class="settings-inner">
                <div class="settings-title">⚙ SETTINGS ⚙</div>
                <div class="settings-content">
                    <div class="control-setting">
                        <label>Jump:</label>
                        <button class="control-key" id="gameJumpKey" data-control="jump">SPACE</button>
                    </div>
                    <div class="control-setting">
                        <label>Move Left:</label>
                        <button class="control-key" id="gameLeftKey" data-control="left">LEFT ARROW</button>
                    </div>
                    <div class="control-setting">
                        <label>Move Right:</label>
                        <button class="control-key" id="gameRightKey" data-control="right">RIGHT ARROW</button>
                    </div>
                    <div class="volume-setting">
                        <label>Music Volume:</label>
                        <input type="range" id="musicVolume" min="0" max="100" value="10" class="volume-slider">
                        <span id="volumeValue">10%</span>
                    </div>
                </div>
                <div class="settings-buttons">
                    <button class="pixel-button" id="resetGameControls">Reset Default</button>
                    <button class="pixel-button" id="resumeGame">Resume Game</button>
                    <button class="pixel-button" id="quitToMenu">Quit to Menu</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(settingsUI);
        
        // Charger les settings actuels
        this.loadControlSettings();
        this.loadVolumeSettings(scene);
        
        // Event listeners
        this.setupSettingsListeners(settingsUI, scene);
    }

    static loadControlSettings() {
        const controls = JSON.parse(localStorage.getItem('gameControls')) || {
            jump: 'ArrowUp',
            left: 'ArrowLeft', 
            right: 'ArrowRight'
        };
        
        document.getElementById('gameJumpKey').textContent = this.getKeyDisplayName(controls.jump);
        document.getElementById('gameLeftKey').textContent = this.getKeyDisplayName(controls.left);
        document.getElementById('gameRightKey').textContent = this.getKeyDisplayName(controls.right);
    }

    static loadVolumeSettings(scene) {
        const savedVolume = localStorage.getItem('musicVolume') || '10';
        const volumeSlider = document.getElementById('musicVolume');
        const volumeValue = document.getElementById('volumeValue');
        
        volumeSlider.value = savedVolume;
        volumeValue.textContent = savedVolume + '%';
        
        // Appliquer le volume à la musique si elle existe
        if (scene.backgroundMusic) {
            const volumeFloat = parseFloat(savedVolume) / 100;
            scene.backgroundMusic.setVolume(volumeFloat);
        }
    }

    static setupSettingsListeners(settingsUI, scene) {
        // Event listeners pour les contrôles
        document.querySelectorAll('#gameJumpKey, #gameLeftKey, #gameRightKey').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const control = e.target.dataset.control;
                e.target.textContent = 'Press key...';
                e.target.classList.add('listening');
                
                const handleKeyPress = (keyEvent) => {
                    keyEvent.preventDefault();
                    const newKey = keyEvent.code;
                    
                    // Sauvegarde le nouveau contrôle
                    const controls = JSON.parse(localStorage.getItem('gameControls')) || {};
                    controls[control] = newKey;
                    localStorage.setItem('gameControls', JSON.stringify(controls));
                    
                    // Met à jour l'affichage
                    e.target.textContent = this.getKeyDisplayName(newKey);
                    e.target.classList.remove('listening');
                    
                    // Recharge les contrôles dans le jeu
                    this.reloadControls(scene);
                    
                    // Retire l'écouteur
                    document.removeEventListener('keydown', handleKeyPress);
                };
                
                document.addEventListener('keydown', handleKeyPress);
            });
        });

        // Volume slider
        const volumeSlider = document.getElementById('musicVolume');
        const volumeValue = document.getElementById('volumeValue');
        
        volumeSlider.addEventListener('input', (e) => {
            const volume = e.target.value;
            volumeValue.textContent = volume + '%';
            localStorage.setItem('musicVolume', volume);
            
            if (scene.backgroundMusic) {
                scene.backgroundMusic.setVolume(parseFloat(volume) / 100);
            }
        });

        // Reset controls
        document.getElementById('resetGameControls').addEventListener('click', () => {
            const defaultControls = {
                jump: 'ArrowUp',
                left: 'ArrowLeft',
                right: 'ArrowRight'
            };
            localStorage.setItem('gameControls', JSON.stringify(defaultControls));
            this.loadControlSettings();
            this.reloadControls(scene);
        });

        // Resume game
        document.getElementById('resumeGame').addEventListener('click', () => {
            this.resumeFromSettings(settingsUI, scene);
        });

        // Quit to menu
        document.getElementById('quitToMenu').addEventListener('click', () => {
            settingsUI.remove();
            this.stopMusic(scene);
            window.location.href = "/";
        });

        // Échap pour fermer les settings
        const escapeHandler = (e) => {
            if (e.key === 'Escape') {
                this.resumeFromSettings(settingsUI, scene);
                document.removeEventListener('keydown', escapeHandler);
            }
        };
        document.addEventListener('keydown', escapeHandler);
    }

    static resumeFromSettings(settingsUI, scene) {
        settingsUI.remove();
        scene.input.keyboard.enabled = true;
        scene.physics.world.resume();
        this.resumeTimer(scene);
        this.resumeMusic(scene);
    }

    static reloadControls(scene) {
        // Recharge les contrôles depuis localStorage
        const controls = ControlsManager.createKeys(scene);
        scene.jumpKey = controls.jumpKey;
        scene.leftKey = controls.leftKey;
        scene.rightKey = controls.rightKey;
        scene.escapeKey = controls.escapeKey;
    }

    static getKeyDisplayName(key) {
        const keyNames = {
            'Space': 'SPACE',
            'Enter': 'ENTER',
            'Escape': 'ESC',
            'ArrowUp': 'UP ARROW',
            'ArrowDown': 'DOWN ARROW',
            'ArrowLeft': 'LEFT ARROW',
            'ArrowRight': 'RIGHT ARROW',
            'KeyA': 'A', 'KeyB': 'B', 'KeyC': 'C', 'KeyD': 'D', 'KeyE': 'E',
            'KeyF': 'F', 'KeyG': 'G', 'KeyH': 'H', 'KeyI': 'I', 'KeyJ': 'J',
            'KeyK': 'K', 'KeyL': 'L', 'KeyM': 'M', 'KeyN': 'N', 'KeyO': 'O',
            'KeyP': 'P', 'KeyQ': 'Q', 'KeyR': 'R', 'KeyS': 'S', 'KeyT': 'T',
            'KeyU': 'U', 'KeyV': 'V', 'KeyW': 'W', 'KeyX': 'X', 'KeyY': 'Y',
            'KeyZ': 'Z',
            'Digit0': '0', 'Digit1': '1', 'Digit2': '2', 'Digit3': '3', 'Digit4': '4',
            'Digit5': '5', 'Digit6': '6', 'Digit7': '7', 'Digit8': '8', 'Digit9': '9'
        };
        
        return keyNames[key] || key.replace('Key', '').replace('Digit', '').toUpperCase();
    }

    static pauseTimer(scene) {
        if (scene.pauseTimer && typeof scene.pauseTimer === 'function') {
            scene.pauseTimer();
        } else {
            scene.timerPaused = true;
            scene.pausedTime = scene.time.now;
        }
    }

    static resumeTimer(scene) {
        if (scene.resumeTimer && typeof scene.resumeTimer === 'function') {
            scene.resumeTimer();
        } else if (scene.timerPaused) {
            const pauseDuration = scene.time.now - scene.pausedTime;
            scene.startTime += pauseDuration;
            scene.timerPaused = false;
        }
    }

    static pauseMusic(scene) {
        if (scene.backgroundMusic && scene.backgroundMusic.isPlaying) {
            scene.backgroundMusic.pause();
        }
    }

    static resumeMusic(scene) {
        if (scene.backgroundMusic && scene.backgroundMusic.isPaused) {
            scene.backgroundMusic.resume();
        }
    }

    static stopMusic(scene) {
        if (scene.backgroundMusic && scene.backgroundMusic.isPlaying) {
            scene.backgroundMusic.stop();
        }
    }
}

// Classe de base pour tous les niveaux
class BaseGameScene extends Phaser.Scene {
    constructor(key) {
        super(key);
    }

    setupInput() {
        const controls = ControlsManager.createKeys(this);
        this.jumpKey = controls.jumpKey;
        this.leftKey = controls.leftKey;
        this.rightKey = controls.rightKey;
        this.escapeKey = controls.escapeKey;
    }

    update() {
        // Vérifier si Échap est pressé pour ouvrir les settings
        if (this.escapeKey && Phaser.Input.Keyboard.JustDown(this.escapeKey)) {
            InGameSettingsManager.showSettings(this);
            return;
        }

        // Appeler la méthode update spécifique au niveau si elle existe
        if (this.levelUpdate) {
            this.levelUpdate();
        }
    }
}

// Exporter les classes
export { ControlsManager, InGameSettingsManager, BaseGameScene };

async function getUserProgress() {
  const token = localStorage.getItem('token');
  const res = await fetch('http://localhost:5000/api/v1/progress/', {
	  headers: { 'Authorization': 'Bearer ' + token }
  });
  if (res.ok) {
	  const data = await res.json();
	  return data.level; // numéro de la map à charger
  }
  return 1; // Par défaut, map 1
}

export async function saveUserProgress(level, completionTime = null) {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
        const payload = { level };
        if (completionTime !== null) {
            payload.completion_time = completionTime;
        }

        const response = await fetch('http://localhost:5000/api/v1/progress/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(payload)
        });

        if (response.ok) {
            console.log('Progress saved successfully');
        }
    } catch (error) {
        console.error('Failed to save progress:', error);
    }
}

let selectedLevel = localStorage.getItem('selectedLevel');
let level;
if (selectedLevel) {
  level = parseInt(selectedLevel, 10);
  localStorage.removeItem('selectedLevel'); // Pour ne pas relancer toujours ce niveau
} else {
  level = await getUserProgress();
}

// Classe de démarrage qui décide de la première scène
class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }
  
  init(data) {
    this.userLevel = data.level || 1;
  }
  
  create() {
    // Optionnel : afficher un écran de chargement ou logo
    // this.add.text(300, 160, 'Chargement...', { fontSize: '32px', fill: '#000' });
    
    // Démarrer directement la bonne scène selon la progression
    if (this.userLevel === 1) {
      this.scene.start('Level1Scene', { level: 1 });
    } else if (this.userLevel === 2) {
      this.scene.start('Level2Scene', { level: 2 });
    }
    // La BootScene s'arrête automatiquement quand on démarre une autre scène
  }
}

const config = {
  type: Phaser.AUTO,
  scale: {
    parent: 'game-container',
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: 600,
    height: 320,
  },
  pixelArt: true,
  backgroundColor: '#5DACD8',
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { y: 800 },
      debug: true
    }
  },
  fps: {
    target: 60,      // Mets ici la valeur souhaitée (ex: 30 ou 60)
    forceSetTimeOut: true // Plus fiable pour forcer le cap sur certains navigateurs
  },
  scene: [
    BootScene,
    Level1Scene,
    Level2Scene,
  ]
};

const game = new Phaser.Game(config);

// Passer le niveau à la BootScene qui prendra la décision
game.scene.start('BootScene', { level: level });