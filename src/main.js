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
          rightKey: scene.input.keyboard.addKey(keyMap[controls.right] || controls.right)
      };
  }
}

// Exporte la classe pour l'utiliser dans les scènes
export { ControlsManager };

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
  scene: [
	BootScene,    // Cette scène démarre automatiquement en premier
	Level1Scene,
	Level2Scene,
  ]
};

const game = new Phaser.Game(config);

// Passer le niveau à la BootScene qui prendra la décision
game.scene.start('BootScene', { level: level });