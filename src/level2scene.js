import { saveUserProgress, ControlsManager, InGameSettingsManager } from './main.js';
import { PendulumObstacles } from './PendulumObstacles.js';
import { MovingPlatforms } from './MovingPlatforms.js';

export default class Level2Scene extends Phaser.Scene {
	constructor() {
		super('Level2Scene');
		this.score = 0;
		this.scoreText = null;
		this.startX= 0;
		this.isDead = false;
	}

	init(data) {
		this.level = data.level || 2;
	}

	preload() {
		this.load.image('tileset_spring', 'assets/tilesets/spring_tileset.png');
		this.load.image('tileset_world', 'assets/tilesets/world_tileset.png');
		this.load.tilemapTiledJSON('level2', 'assets/maps/level2.json');
		this.load.spritesheet('player', 'assets/personnage/personnage.png', { frameWidth: 32, frameHeight: 32 });
	}

	create() {
		this.setupInput();
		const controls = ControlsManager.createKeys(this);
        this.jumpKey = controls.jumpKey;
        this.leftKey = controls.leftKey;
        this.rightKey = controls.rightKey;

		this.isDead = false; // Réinitialise l'état de mort
		const map = this.make.tilemap({ key: 'level2' });
		document.querySelectorAll('.question-ui').forEach(el => el.remove());
		const dangerLayer = map.getObjectLayer('danger');
		this.dangerZones = this.physics.add.staticGroup();
	  
		dangerLayer.objects.forEach(obj => {
		  const zone = this.add.rectangle(obj.x + obj.width / 2, obj.y + obj.height / 2, obj.width, obj.height);
		  this.physics.add.existing(zone, true); // true = static
		  this.dangerZones.add(zone);
		});
	  
		// Collision avec la zone de danger = mort
	  
		const tilesetWorld = map.addTilesetImage('tileset_world', 'tileset_world');
		const tilesetspring = map.addTilesetImage('tileset_spring', 'tileset_spring');
	  
		const background = map.createLayer('ciel', tilesetWorld);
		const collision = map.createLayer('colision', [tilesetWorld, tilesetspring]);
		collision.setCollisionByProperty({ collision: true });
	  
		this.physics.world.setBounds(0, 0, map.widthInPixels, map.heightInPixels);
		this.player = this.physics.add.sprite(100, 100, 'player');
		this.player.setCollideWorldBounds(true);
		this.player.setSize(15, 15);
		this.player.setOffset(10, 10);

		this.physics.add.collider(this.player, collision);
	  
		this.physics.add.overlap(this.player, this.endZone, this.onLevelComplete, null, this);
		this.physics.add.overlap(this.player, this.dangerZones, () => {
			this.score = 0; // Réinitialise le score
			this.showGameOverUI(); // Affiche l'UI Game Over
		});

		this.questionZonesData = [
			{ x: 400, y: 150, width: 50, height: 300, questionId: "53f42b04-48f2-4892-8029-0556d535d6fd" },
			{ x: 900, y: 150, width: 50, height: 300, questionId: "b2475722-4796-40ef-a548-8968fbb1dfd2" }
		  ];
		
		this.questionZones = this.physics.add.staticGroup();
		this.questionZonesData.forEach(data => {
		  const zone = this.add.rectangle(data.x, data.y, data.width, data.height, 0x00ff00, 0);
		  zone.questionId = data.questionId;
		  this.physics.add.existing(zone, true);
		  this.questionZones.add(zone);
		});

		this.physics.add.overlap(this.player, this.questionZones, (player, zone) => {
		  this.showQuestionUI(zone.questionId);
		  zone.destroy(); // Optionnel : pour ne pas re-déclencher la même question
		});
		
		this.anims.create({
		  key: 'idle',
		  frames: this.anims.generateFrameNumbers('player', { start: 0, end: 8 }),
		  frameRate: 5,
		  repeat: -1
		})
	  
		this.anims.create({
		  key: 'run',
		  frames: this.anims.generateFrameNumbers('player', { start: 9, end: 14 }),
		  frameRate: 10,
		  repeat: -1
		})
	  
		this.anims.create({
		  key: 'jump',
		  frames: this.anims.generateFrameNumbers('player', { start: 15, end: 15 }),
		  frameRate: 1,
		  repeat: 0
		})

		this.anims.create({
			key: 'death',
			frames: this.anims.generateFrameNumbers('player', { start: 16, end: 20 }),
			frameRate: 10,
			repeat: 0
		})

		this.score = 0;
		this.startX = this.player.x;
		this.maxDistance = 0;

        this.scoreText = this.add.text(
            16, 16, 
            'Score: 0', 
            { fontFamily: '"Press Start 2P"', fontSize: '16px', fill: '#2c3e95' }
        ).setScrollFactor(0).setDepth(100);
	  
		this.cameras.main.setBounds(0, 0, map.widthInPixels, map.heightInPixels);
		this.cameras.main.startFollow(this.player, true, 0.1, 0.1);	  
	}

	update() {
		if (this.isDead) return;
    
		const player = this.player;

		        // Gère la touche Échap pour les settings
        if (this.escapeKey && Phaser.Input.Keyboard.JustDown(this.escapeKey)) {
            InGameSettingsManager.showSettings(this);
            return;
        }
		
		if (this.leftKey.isDown) {
			player.setVelocityX(-160);
			player.anims.play('run', true);
			player.setFlipX(true);
		} else if (this.rightKey.isDown) {
			player.setVelocityX(400);
			player.anims.play('run', true);
			player.setFlipX(false);
		} else {
			player.setVelocityX(0);
			player.anims.play('idle', true);
		}
		
		if (this.jumpKey.isDown && player.body.onFloor()) {
			player.setVelocityY(-300);
			player.anims.play('jump', true);
		}

		const distance = Math.max(0, player.x - this.startX);
		if (distance > this.maxDistance) {
			this.maxDistance = distance;
		}
		this.score = Math.floor(this.maxDistance) * 10;
		this.scoreText.setText('Score: ' + this.score);
	}
	async showQuestionUI(questionId) {
		// Récupère la question depuis l’API

		this.physics.world.pause();
		this.input.keyboard.enabled = false; // Désactive les contrôles du joueur

		const res = await fetch(`http://localhost:5000/api/v1/questions/${questionId}`);
		if (!res.ok) return;
		const q = await res.json();
	
		const ui = document.createElement('div');
		ui.className = 'question-ui';
		ui.innerHTML = `
		  <div class="question-text">${q.text}</div>
		  <div class="question-choices">
			${q.choices.map((c, i) => `<button data-index="${i}">${c}</button>`).join('')}
		  </div>
		`;
		document.body.appendChild(ui);
		
		ui.querySelectorAll('button').forEach(btn => {
		  btn.onclick = () => {
			const idx = parseInt(btn.dataset.index, 10);
			if (idx === q.correct) {
			  alert('Bonne réponse !');
			  ui.remove();
			  this.physics.world.resume(); // Reprend le jeu
			  this.input.keyboard.enabled = true; // Réactive les contrôles du joueur
			} else {
			  ui.remove();
			  this.showGameOverUI(); // Affiche l'UI Game Over si mauvaise réponse
			}
		  };
		});
	}
	showGameOverUI() {
		this.isDead = true; // Marque le joueur comme mort
		this.physics.world.pause();
		this.input.keyboard.enabled = false;
	
		// Joue l'animation de mort et attend la fin
		this.player.once('animationcomplete-death', () => {
			// Crée l'UI Game Over
			const ui = document.createElement('div');
			ui.className = 'question-ui';
			ui.innerHTML = `
			  <div class="question-text">Game Over</div>
			  <div class="question-choices">
				<button id="retry-btn">Retry</button>
				<button id="quit-btn">Quit</button>
			  </div>
			`;
			document.body.appendChild(ui);
	
			document.getElementById('retry-btn').onclick = () => {
				ui.remove();
				this.physics.world.resume();
				this.input.keyboard.enabled = true;
				this.scene.restart();
			};
			document.getElementById('quit-btn').onclick = () => {
				ui.remove();
				window.location.href = "/";
			};
		});
	
		this.player.anims.play('death', true);
	}
	showVictoryUI() {
		// Pause le jeu si besoin
		this.physics.world.pause();
		this.input.keyboard.enabled = false;
	
		// Crée l'UI de victoire
		const ui = document.createElement('div');
		ui.className = 'question-ui'; // Réutilise le style popup
		ui.innerHTML = `
		  <div class="question-text">Well done ! Level completed</div>
		  <div class="question-choices">
			<button id="next-level-btn">Next level</button>
		  </div>
		`;
		document.body.appendChild(ui);
	
		document.getElementById('next-level-btn').onclick = async () => {
			ui.remove();
			// Transition visuelle
			this.cameras.main.fadeOut(800, 0, 0, 0);
			this.cameras.main.once('camerafadeoutcomplete', async () => {
				await saveUserProgress(this.level + 1);
				this.scene.start('Level2Scene', { level: this.level + 1 });
			});
		};
	}

    setupInput() {
        // Utilise directement ControlsManager
        const controls = ControlsManager.createKeys(this);
        this.jumpKey = controls.jumpKey;
        this.leftKey = controls.leftKey;
        this.rightKey = controls.rightKey;
        this.escapeKey = controls.escapeKey;
    }	
}