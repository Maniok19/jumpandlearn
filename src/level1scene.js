import { saveUserProgress, ControlsManager, InGameSettingsManager } from './main.js';
import { PendulumObstacles } from './PendulumObstacles.js';
import { MovingPlatforms } from './MovingPlatforms.js';
import Bee from './Bee.js';
import Bomb from './Bomb.js';

/**
 * Level 1 Scene - Main gameplay scene with enhanced platformer mechanics
 * Features: Enhanced jumping, wall jumping, moving platforms, pendulum obstacles, pushable objects
 */
export default class Level1Scene extends Phaser.Scene {
    constructor() {
        super('Level1Scene');
        this.initializeProperties();
        this.pendulumObstaclesManager = new PendulumObstacles(this);
        this.movingPlatformsManager = new MovingPlatforms(this);
        
        // Initialiser les tableaux des ennemis
        this.bees = [];
        this.bombs = []; // Nouveau tableau pour les bombes
    }

    /**
     * Initialize all scene properties
     */
    initializeProperties() {
        // Core game state
        this.score = 0;
        this.startX = 0;
        this.isDead = false;
        this.level = 1;

        // UI elements
        this.scoreText = null;
        this.timerText = null;

        // Timer properties
        this.startTime = 0;
        this.elapsedTime = 0;
        this.timerStopped = false;

        // Enhanced jump mechanics
        this.jumpForce = -250;
        this.minJumpForce = -100;
        this.coyoteTime = 150;
        this.jumpBuffer = 150;
        this.lastGroundedTime = 0;
        this.jumpBufferTime = 0;
        this.isJumping = false;
        this.jumpHeld = false;
        this.hasDoubleJump = false;
        this.usedDoubleJump = false;

        // Wall jumping mechanics
        this.wallJumpCooldown = 0;
        this.isWallSliding = false;
        this.wallSlidingSide = 0;
        this.wallSlideSpeed = 50;
        this.wallJumpForceX = 200;
        this.wallJumpForceY = -250;
        this.wallJumpTime = 300;
        this.wallJumpTimer = 0;
        this.wallJumpDirection = 0;

        // Question system
        this.questionZonesData = [];
        this.questionZones = null;
        this.answeredQuestions = new Set();

        // Interactive objects
        this.movingPlatforms = [];
        this.platformSprites = [];
        this.pushableObstacles = [];
        this.playerOnPlatform = false;
    }

    // ===========================================
    // PHASER LIFECYCLE METHODS
    // ===========================================

    init(data) {
        this.level = data.level || 1;
        this.initializeProperties();
    }

    preload() {
        // Load spritesheets for tiles and objects
        this.load.spritesheet('tileset_spring', 'assets/tilesets/spring_tileset.png', { 
            frameWidth: 16, frameHeight: 16 
        });
        this.load.spritesheet('staticObjects_', 'assets/tilesets/staticObjects_.png', { 
            frameWidth: 16, frameHeight: 16 
        });
        this.load.spritesheet('tileset_world', 'assets/tilesets/world_tileset.png', { 
            frameWidth: 16, frameHeight: 16 
        });
        
        // Load map and player
        this.load.tilemapTiledJSON('level1', 'assets/maps/level1.json');
        this.load.spritesheet('player', 'assets/personnage/personnage.png', { 
            frameWidth: 32, frameHeight: 32 
        });
        this.load.spritesheet('bee', 'assets/personnage/Bee_1.png', {
            frameWidth: 24, frameHeight: 24})

        this.load.spritesheet('bomb', 'assets/personnage/Bomb.png', {
            frameWidth: 24, frameHeight: 24
        });

        this.load.audio('level1_music', 'assets/song/level1_music.mp3');
    }

    create() {
        this.setupInput();
        this.setupMap();
        this.setupPlayer();
        this.setupQuestionZones();
        this.setupBee();
        this.setupBomb(); // Ajouter cette ligne
        this.setupAnimations();
        this.setupUI();
        this.setupCamera();
        this.createInteractiveObjects();
        this.setupMusic();
    }

    update() {
        if (this.isDead) return;

        // Gère la touche Échap pour les settings
        if (this.escapeKey && Phaser.Input.Keyboard.JustDown(this.escapeKey)) {
            InGameSettingsManager.showSettings(this);
            return;
        }

        // Le contenu spécifique au niveau 1
        this.levelUpdate();
    }

    levelUpdate() {
        // Le contenu spécifique au niveau 1
        this.updateTimer();
        this.updateInteractiveObjects();
        this.updatePlayerMovement();
        this.updateScore();
        this.updateBees();
        this.updateBombs(); // Ajouter cette ligne
    }

    updateBees() {
        // Mettre à jour toutes les abeilles
        this.bees.forEach(bee => {
            bee.update();
        });
    }

    updateBombs() {
        // Mettre à jour toutes les bombes
        this.bombs.forEach(bomb => {
            bomb.update();
        });
    }

    // ===========================================
    // SETUP METHODS
    // ===========================================

    setupInput() {
        // Utilise directement ControlsManager
        const controls = ControlsManager.createKeys(this);
        this.jumpKey = controls.jumpKey;
        this.leftKey = controls.leftKey;
        this.rightKey = controls.rightKey;
        this.escapeKey = controls.escapeKey;
    }

    setupMap() {
        this.map = this.make.tilemap({ key: 'level1' });
        
        // Setup tilesets
        const tilesetWorld = this.map.addTilesetImage('tileset_world', 'tileset_world');
        const tilesetspring = this.map.addTilesetImage('tileset_spring', 'tileset_spring');
        const tilesetStaticObjects = this.map.addTilesetImage('staticObjects_', 'staticObjects_');
        
        // Create layers
        const background = this.map.createLayer('ciel', tilesetWorld);
        const fakeground = this.map.createLayer('fakepike', tilesetStaticObjects);
        const collision = this.map.createLayer('colision', [tilesetWorld, tilesetspring, tilesetStaticObjects]);
        collision.setCollisionByProperty({ collision: true });
        
        // Setup world bounds
        this.physics.world.setBounds(0, 0, this.map.widthInPixels, this.map.heightInPixels);
        
        // Setup danger zones
        this.setupDangerZones();
        
        // Setup end zone
        this.endZone = this.add.rectangle(282 * 16 + 8, 12 * 16 + 8, 50, 50);
        this.physics.add.existing(this.endZone, true);
    }

    setupDangerZones() {
        const dangerLayer = this.map.getObjectLayer('danger');
        this.dangerZones = this.physics.add.staticGroup();
        
        dangerLayer.objects.forEach(obj => {
            const zone = this.add.rectangle(
                obj.x + obj.width / 2, 
                obj.y + obj.height / 2, 
                obj.width, 
                obj.height
            );
            this.physics.add.existing(zone, true);
            this.dangerZones.add(zone);
        });
    }

    setupPlayer() {
        this.player = this.physics.add.sprite(2 * 16 + 8, 29 * 16 + 8, 'player');
        this.player.setCollideWorldBounds(true);
        
        // Hitbox de base
        this.player.setSize(13, 15);
        this.player.setOffset(8, 10);
        
        // Stocker les paramètres de hitbox pour chaque direction
        this.hitboxParams = {
            right: { width: 13, height: 15, offsetX: 8, offsetY: 10 },
            left: { width: 13, height: 15, offsetX: 11, offsetY: 10 }  // Décalage ajusté pour la gauche
        };
        
        // Setup collisions
        this.physics.add.collider(this.player, this.map.getLayer('colision').tilemapLayer);
        this.physics.add.overlap(this.player, this.endZone, () => this.showVictoryUI());
        this.physics.add.overlap(this.player, this.dangerZones, () => {
            this.score = 0;
            this.showGameOverUI();
        });
    }

    setupQuestionZones() {
        this.questionZonesData = [
            { 
                x: 80 * 16 + 8, y: 7 * 16 + 7, width: 1 * 16, height: 1 * 16, 
                questionId: "8a9be0a0-b020-4027-a53c-286cbdfb6ca5",
                bridge: { 
                    startX: 82, endX: 89, y: 7, 
                    tileId: 10, tileset: 'tileset_world',
                    hasCollision: true
                }
            },
            { 
                x: 204 * 16 + 8, y: 22 * 16 + 7, width: 1 * 16, height: 1 * 16, 
                questionId: "2f305e18-fbfb-462d-9dc8-3bb56c60b269",
                bridge: { 
                    startX: 209, endX: 210, y: 22, 
                    tileId: 123, tileset: 'tileset_spring',
                    hasCollision: true
                }
            },
            { 
                x: 268 * 16 + 8, y: 7 * 16 + 7, width: 1 * 16, height: 1 * 16, 
                questionId: "561ff78b-f0b5-46cb-b84e-b78edb667096",
                bridge: { 
                    startX: 269, endX: 276, y: 6, 
                    tileId: 59, tileset: 'tileset_world',
                    hasCollision: false  // Pas de collision pour le bloc invisible
                }
            }
        ];

        this.questionZones = this.physics.add.staticGroup();
        this.questionZonesData.forEach(data => {
            const zone = this.add.rectangle(data.x, data.y, data.width, data.height, 0x00ff00, 0);
            zone.questionId = data.questionId;
            zone.bridgeConfig = data.bridge;
            this.physics.add.existing(zone, true);
            this.questionZones.add(zone);
        });

        this.physics.add.overlap(this.player, this.questionZones, (player, zone) => {
            if (!this.answeredQuestions.has(zone.questionId)) {
                this.showQuestionUI(zone.questionId, () => {
                    // Passer un tableau de layers au lieu d'un seul
                    const collisionLayers = [
                        this.map.getLayer('colision').tilemapLayer,
                        this.map.getLayer('fakepike').tilemapLayer  // Ajouter le deuxième layer
                    ];
                    this.startBridgeCreation(zone.bridgeConfig, collisionLayers);
                    this.answeredQuestions.add(zone.questionId);
                    zone.destroy();
                });
            }
        });
    }

    setupBee() {
        // Créer une ou plusieurs abeilles avec différentes configurations
        const beeConfigs = [
            {
                x: 99 * 16 + 8,
                y: 10 * 16 + 8,
                config: {
                    speed: 30,
                    patrolDistance: 6 * 16,
                    floatingAmplitude: 0.2
                }
            
            },
            {
                x: 99 * 16 + 8,
                y: 14 * 16 + 8,
                config: {
                    speed: 90,
                    patrolDistance: 6 * 16,
                    floatingAmplitude: 0.2
                }
            },
            {
                x: 26 * 16 + 8,
                y: 22 * 16 + 8,
                config: {
                    speed: 60,
                    patrolDistance: 6 * 16,
                    floatingAmplitude: 0.2
                }
            },
            {
                x: 162 * 16 + 8,
                y: 24 * 16 + 8,
                config: {
                    speed: 60,
                    patrolDistance: 6 * 16,
                    floatingAmplitude: 0.2
                }
            },
            {
                x: 162 * 16 + 8,
                y: 16 * 16 + 8,
                config: {
                    speed: 60,
                    patrolDistance: 6 * 16,
                    floatingAmplitude: 0.2
                }
            },
        ];

        beeConfigs.forEach(beeConfig => {
            const bee = new Bee(this, beeConfig.x, beeConfig.y, beeConfig.config);
            this.bees.push(bee);
        });
    }

    setupBomb() {
        // Créer une ou plusieurs bombes avec différentes configurations
        const bombConfigs = [
            {
                x: 15 * 16 + 8,
                y: 26 * 16 + 5,
                config: {
                    speed: 50,
                    patrolDistance: 4 * 16
                }
            },
            {
                x: 151 * 16 + 8,
                y: 30 * 16 + 5,
                config: {
                    speed: 50,
                    patrolDistance: 2 * 16
                }
            },
            {
                x: 143 * 16 + 8,
                y: 30 * 16 + 5,
                config: {
                    speed: 50,
                    patrolDistance: 4 * 16
                }
            },
            {
                x: 135 * 16 + 8,
                y: 30 * 16 + 5,
                config: {
                    speed: 50,
                    patrolDistance: 5 * 16
                }
            },
            {
                x: 125 * 16 + 8,
                y: 30 * 16 + 5,
                config: {
                    speed: 50,
                    patrolDistance: 5 * 16
                }
            },
            // Tu peux ajouter d'autres bombes ici
        ];

        bombConfigs.forEach(bombConfig => {
            const bomb = new Bomb(this, bombConfig.x, bombConfig.y, bombConfig.config);
            this.bombs.push(bomb);
        });
    }

    setupAnimations() {
        this.anims.create({
            key: 'idle',
            frames: this.anims.generateFrameNumbers('player', { start: 0, end: 8 }),
            frameRate: 5,
            repeat: -1
        });

        this.anims.create({
            key: 'run',
            frames: this.anims.generateFrameNumbers('player', { start: 9, end: 14 }),
            frameRate: 10,
            repeat: -1
        });

        this.anims.create({
            key: 'jump',
            frames: this.anims.generateFrameNumbers('player', { start: 15, end: 15 }),
            frameRate: 1,
            repeat: 0
        });

        this.anims.create({
            key: 'death',
            frames: this.anims.generateFrameNumbers('player', { start: 16, end: 20 }),
            frameRate: 10,
            repeat: 0
        });
        
        // Bee animations
        this.anims.create({
            key: 'bee_fly',
            frames: this.anims.generateFrameNumbers('bee', { start: 0, end: 9 }),
            frameRate: 8,
            repeat: -1
        });

        this.anims.create({
            key: 'bomb_walk',
            frames: this.anims.generateFrameNumbers('bomb', { start: 0, end: 4 }),
            frameRate: 8,
            repeat: -1
        });
    }

    setupUI() {
        this.score = 0;
        this.startX = this.player.x;
        this.maxDistance = 0;
        this.startTime = this.time.now;
        this.elapsedTime = 0;
        this.timerStopped = false;

        this.scoreText = this.add.text(
            16, 16, 
            'Score: 0', 
            { fontFamily: '"Press Start 2P"', fontSize: '16px', fill: '#ffd700' }
        ).setScrollFactor(0).setDepth(100);

        this.timerText = this.add.text(
            16, 40, 
            'Time: 00:00:000', 
            { fontFamily: '"Press Start 2P"', fontSize: '16px', fill: '#00ff00' }
        ).setScrollFactor(0).setDepth(100);
    }

    setupCamera() {
        this.cameras.main.setBounds(0, 0, this.map.widthInPixels, this.map.heightInPixels);
        this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
        this.cameras.main.setFollowOffset(0, 30);

        // Debug click handler for tile coordinates
        this.input.on('pointerdown', (pointer) => {
            const worldX = pointer.worldX;
            const worldY = pointer.worldY;
            const tileX = Math.floor(worldX / 16);
            const tileY = Math.floor(worldY / 16);
            console.log(`Tile position: x=${tileX}, y=${tileY}`);
        });
    }

    createInteractiveObjects() {
        this.movingPlatformsManager.createMovingPlatforms();
        this.pendulumObstaclesManager.createPendulumObstacles();
        this.createPushableObstacles();
    }

    // ===========================================
    // UPDATE METHODS
    // ===========================================

    pauseTimer() {
        this.timerPaused = true;
        this.pausedTime = this.time.now;
    }

    resumeTimer() {
        if (this.timerPaused) {
            const pauseDuration = this.time.now - this.pausedTime;
            this.startTime += pauseDuration;
            this.timerPaused = false;
        }
    }

    updateTimer() {
        if (!this.timerStopped && !this.timerPaused) {
            this.elapsedTime = this.time.now - this.startTime;
            this.updateTimerDisplay();
        }
    }

    updateTimerDisplay() {
        const totalMs = Math.floor(this.elapsedTime);
        const minutes = Math.floor(totalMs / 60000);
        const seconds = Math.floor((totalMs % 60000) / 1000);
        const milliseconds = totalMs % 1000;

        const formattedTime = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}:${milliseconds.toString().padStart(3, '0')}`;
        this.timerText.setText('Time: ' + formattedTime);
    }

    updateInteractiveObjects() {
        this.movingPlatformsManager.updateMovingPlatforms();
        this.pendulumObstaclesManager.updatePendulumObstacles();
        this.updatePushableObstacles();
    }
    updatePlayerMovement() {
        // Update wall jump timers
        if (this.wallJumpCooldown > 0) {
            this.wallJumpCooldown -= this.game.loop.delta;
        }
        if (this.wallJumpTimer > 0) {
            this.wallJumpTimer -= this.game.loop.delta;
        }

        this.updateWallSliding();
        this.updateJumpMechanics();
        this.handleMovementInput();
        this.handleJumpInput();
    }

    handleMovementInput() {
        const player = this.player;
        
        if (this.leftKey.isDown) {
            if (this.wallJumpTimer <= 0 || this.wallJumpDirection <= 0) {
                player.setVelocityX(-160);
                player.anims.play('run', true);
                player.setFlipX(true);
                
                // Ajuster la hitbox pour la direction gauche
                this.updatePlayerHitbox('left');
            }
        } else if (this.rightKey.isDown) {
            if (this.wallJumpTimer <= 0 || this.wallJumpDirection >= 0) {
                player.setVelocityX(160);
                player.anims.play('run', true);
                player.setFlipX(false);
                
                // Ajuster la hitbox pour la direction droite
                this.updatePlayerHitbox('right');
            }
        } else {
            if (this.wallJumpTimer <= 0) {
                player.setVelocityX(0);
                player.anims.play('idle', true);
            }
        }
    }

    updatePlayerHitbox(direction) {
        const params = this.hitboxParams[direction];
        this.player.setSize(params.width, params.height);
        this.player.setOffset(params.offsetX, params.offsetY);
    }

    updateScore() {
        const distance = Math.max(0, this.player.x - this.startX);
        if (distance > this.maxDistance) {
            this.maxDistance = distance;
        }
        this.score = Math.floor(this.maxDistance) * 10;
        this.scoreText.setText('Score: ' + this.score);
    }

    // ===========================================
    // PUSHABLE OBSTACLES SYSTEM
    // ===========================================

    createPushableObstacles() {
        this.pushableObstacles = [];
        
        const pushableConfigs = [
            {
                x: 120 * 16 + 8, y: 30 * 16 + 8,
                width: 16, height: 16, pushSpeed: 30,
                spriteConfig: { tileset: 'tileset_world', frameId: 55 }
            },
            /*{
                x: 218 * 16 + 8, y: 21 * 16 + 8,
                width: 16, height: 16, pushSpeed: 30,
                spriteConfig: { tileset: 'tileset_world', frameId: 55 }
            },*/
            {
                x: 220 * 16 + 8, y: 21 * 16 + 8,
                width: 16, height: 16, pushSpeed: 30,
                spriteConfig: { tileset: 'tileset_world', frameId: 55 }
            }
        ];

        pushableConfigs.forEach((config, index) => {
            this.createSinglePushableObstacle(config, index);
        });
    }

    createSinglePushableObstacle(config, index) {
        const obstacle = this.physics.add.sprite(config.x, config.y, config.spriteConfig.tileset);
        obstacle.setFrame(config.spriteConfig.frameId);
        obstacle.setSize(config.width, config.height);
        
        // Configure physics
        obstacle.body.setCollideWorldBounds(true);
        obstacle.body.setImmovable(false);
        obstacle.body.setMass(1);
        obstacle.body.setDrag(1000, 0);
        obstacle.body.setMaxVelocity(config.pushSpeed, 400);

        // Configure obstacle properties
        Object.assign(obstacle, {
            config,
            isPushable: true,
            isBeingPushed: false,
            pushDirection: 0
        });
        
        this.pushableObstacles.push(obstacle);
        this.setupPushableObstacleCollisions(obstacle);
    }

    setupPushableObstacleCollisions(obstacle) {
        // Collision with map
        this.physics.add.collider(obstacle, this.map.getLayer('colision').tilemapLayer);
        
        // Collision with other pushable obstacles
        this.pushableObstacles.forEach(otherObstacle => {
            if (otherObstacle !== obstacle) {
                this.physics.add.collider(obstacle, otherObstacle);
            }
        });
        
        // Collision with player
        this.physics.add.collider(this.player, obstacle, (player, obstacle) => {
            this.handlePlayerObstacleCollision(player, obstacle);
        });
        
        // Collision with moving platforms
        if (this.movingPlatforms) {
            this.movingPlatforms.forEach(platform => {
                this.physics.add.collider(obstacle, platform);
            });
        }
        
        // Overlap with danger zones
        // this.physics.add.overlap(obstacle, this.dangerZones, (obstacle, danger) => {
        //    this.resetPushableObstacle(obstacle);
        // });
    }

    updatePushableObstacles() {
        if (!this.pushableObstacles) return;
        
        this.pushableObstacles.forEach(obstacle => {
            this.updateObstacleState(obstacle);
            this.checkObstacleBounds(obstacle);
        });
    }

    updateObstacleState(obstacle) {
        const playerNearby = Phaser.Geom.Rectangle.Overlaps(
            this.player.body,
            new Phaser.Geom.Rectangle(
                obstacle.body.x - 5, obstacle.body.y, 
                obstacle.body.width + 10, obstacle.body.height
            )
        );
        
        if (!playerNearby || Math.abs(this.player.body.velocity.x) < 50) {
            obstacle.isBeingPushed = false;
            obstacle.body.setVelocityX(0);
        }
        
        if (!obstacle.isBeingPushed) {
            obstacle.body.setVelocityX(0);
        }
    }

    checkObstacleBounds(obstacle) {
        if (obstacle.y > this.map.heightInPixels + 100) {
            this.resetPushableObstacle(obstacle);
        }
    }

    handlePlayerObstacleCollision(player, obstacle) {
        if (!obstacle.isPushable) return;
        
        const playerCenter = player.body.center;
        const obstacleCenter = obstacle.body.center;
        
        // Check if player is on top
        const onTop = player.body.bottom <= obstacle.body.top + 8 && 
                     player.body.velocity.y >= 0 &&
                     Math.abs(playerCenter.x - obstacleCenter.x) < obstacle.body.width * 0.7;

        if (onTop) {
            obstacle.isBeingPushed = false;
            obstacle.body.setVelocityX(0);
            return;
        }
        
        // Handle horizontal pushing
        const horizontalOverlap = Math.abs(playerCenter.x - obstacleCenter.x) > 
                                 Math.abs(playerCenter.y - obstacleCenter.y);
    
        if (horizontalOverlap && player.body.onFloor() && obstacle.body.onFloor()) {
            const pushDirection = playerCenter.x < obstacleCenter.x ? 1 : -1;
            
            if ((pushDirection > 0 && player.body.velocity.x > 50) || 
                (pushDirection < 0 && player.body.velocity.x < -50)) {
                
                obstacle.isBeingPushed = true;
                obstacle.pushDirection = pushDirection;
                obstacle.body.setVelocityX(pushDirection * obstacle.config.pushSpeed);
                
                this.addPushEffect(obstacle);
                this.playPushSound();
            } else {
                obstacle.isBeingPushed = false;
                obstacle.body.setVelocityX(0);
            }
        } else {
            obstacle.isBeingPushed = false;
            obstacle.body.setVelocityX(0);
        }
    }

    addPushEffect(obstacle) {
        this.tweens.add({
            targets: obstacle,
            scaleX: 1.02,
            scaleY: 0.98,
            duration: 100,
            yoyo: true,
            ease: 'Power1'
        });
    }

    resetPushableObstacle(obstacle) {
        obstacle.setPosition(obstacle.config.x, obstacle.config.y);
        obstacle.body.setVelocity(0, 0);
        obstacle.isBeingPushed = false;
        
        this.tweens.add({
            targets: obstacle,
            alpha: 0.5,
            duration: 100,
            yoyo: true,
            repeat: 2,
            ease: 'Power2'
        });
    }

    // ===========================================
    // ENHANCED JUMP MECHANICS
    // ===========================================

    updateJumpMechanics() {
        const currentTime = this.time.now;
        const isGrounded = this.player.body.onFloor() || this.playerOnPlatform !== false;
        
        if (isGrounded) {
            this.lastGroundedTime = currentTime;
            this.usedDoubleJump = false;
            
            if (this.isJumping && this.player.body.velocity.y >= 0) {
                this.isJumping = false;
            }
        }
        
        // Handle variable jump height
        if (this.isJumping && !this.jumpKey.isDown && this.player.body.velocity.y < 0) {
            if (this.player.body.velocity.y < this.minJumpForce) {
                this.player.setVelocityY(this.minJumpForce);
            }
            this.isJumping = false;
        }
        
        // Track jump key state
        if (this.jumpKey.isDown && !this.jumpHeld) {
            this.jumpBufferTime = currentTime;
            this.jumpHeld = true;
        } else if (!this.jumpKey.isDown) {
            this.jumpHeld = false;
        }
    }

    handleJumpInput() {
        const currentTime = this.time.now;
        const jumpPressed = this.jumpKey.isDown && !this.jumpHeld;
        const jumpBuffered = this.jumpBufferTime > 0 && (currentTime - this.jumpBufferTime) <= this.jumpBuffer;
        
        if (jumpPressed || (jumpBuffered && this.jumpKey.isDown)) {
            const canCoyoteJump = (currentTime - this.lastGroundedTime) <= this.coyoteTime;
            const isGrounded = this.player.body.onFloor() || this.playerOnPlatform !== false;
            
            if (isGrounded || canCoyoteJump) {
                this.performJump();
                this.jumpBufferTime = 0;
            } else if (this.isWallSliding && this.wallJumpCooldown <= 0) {
                this.performWallJump();
                this.jumpBufferTime = 0;
            } else if (this.hasDoubleJump && !this.usedDoubleJump && !isGrounded) {
                this.performDoubleJump();
                this.jumpBufferTime = 0;
            }
        }
        
        // Clear old jump buffer
        if (jumpBuffered && (currentTime - this.jumpBufferTime) > this.jumpBuffer) {
            this.jumpBufferTime = 0;
        }
    }

    performJump() {
        this.player.setVelocityY(this.jumpForce);
        this.player.anims.play('jump', true);
        this.isJumping = true;
        this.playerOnPlatform = false;
        
        // this.addJumpEffect();
        this.playJumpSound();
    }

    performDoubleJump() {
        this.player.setVelocityY(this.jumpForce * 0.8);
        this.player.anims.play('jump', true);
        this.isJumping = true;
        this.usedDoubleJump = true;
        
        this.addDoubleJumpEffect();
        this.playDoubleJumpSound();
    }

    // ===========================================
    // WALL JUMPING MECHANICS
    // ===========================================

    checkWallCollision() {
        if (!this.player.body) return false;
        
        const playerBody = this.player.body;
        const tileSize = 16;
        const collisionLayer = this.map.getLayer('colision').tilemapLayer;
        
        const checkTopY = Math.floor((playerBody.top + 2) / tileSize);
        const checkBottomY = Math.floor((playerBody.bottom - 2) / tileSize);
        
        // Check left wall
        const leftTileX = Math.floor((playerBody.left - 1) / tileSize);
        let leftWallFound = false;
        for (let y = checkTopY; y <= checkBottomY; y++) {
            const tile = collisionLayer.getTileAt(leftTileX, y);
            if (tile && tile.collides) {
                leftWallFound = true;
                break;
            }
        }
        
        // Check right wall
        const rightTileX = Math.floor((playerBody.right + 1) / tileSize);
        let rightWallFound = false;
        for (let y = checkTopY; y <= checkBottomY; y++) {
            const tile = collisionLayer.getTileAt(rightTileX, y);
            if (tile && tile.collides) {
                rightWallFound = true;
                break;
            }
        }
        
        if (leftWallFound && this.leftKey.isDown) return -1;
        if (rightWallFound && this.rightKey.isDown) return 1;
        
        return 0;
    }

    updateWallSliding() {
        const wallSide = this.checkWallCollision();
        const canWallSlide = !this.player.body.onFloor() && 
                           this.player.body.velocity.y > 0 && 
                           wallSide !== 0 &&
                           this.wallJumpTimer <= 0;
        
        if (canWallSlide) {
            this.isWallSliding = true;
            this.wallSlidingSide = wallSide;
            
            if (this.player.body.velocity.y > this.wallSlideSpeed) {
                this.player.body.velocity.y = this.wallSlideSpeed;
            }
            
            this.addWallSlideEffect();
        } else {
            this.isWallSliding = false;
            this.wallSlidingSide = 0;
        }
    }

    performWallJump() {
        if (this.isWallSliding && this.wallJumpCooldown <= 0) {
            this.player.body.velocity.x = this.wallJumpForceX * -this.wallSlidingSide;
            this.player.body.velocity.y = this.wallJumpForceY;
            
            this.wallJumpTimer = this.wallJumpTime;
            this.wallJumpDirection = -this.wallSlidingSide;
            this.wallJumpCooldown = 200;
            
            this.isJumping = true;
            this.usedDoubleJump = false;
            this.isWallSliding = false;
            this.wallSlidingSide = 0;
            
            this.player.anims.play('jump', true);
            this.player.setFlipX(this.wallJumpDirection < 0);
            
            this.addWallJumpEffect();
            this.playWallJumpSound();
        }
    }

    // ===========================================
    // VISUAL AND AUDIO EFFECTS
    // ===========================================

    addJumpEffect() {
        const dustParticles = this.add.particles(this.player.x, this.player.y + 15, 'tileset_world', {
            frame: [8, 9, 10],
            scale: { start: 0.3, end: 0.1 },
            speed: { min: 20, max: 50 },
            lifespan: 300,
            quantity: 3,
            angle: { min: 260, max: 280 }
        });
        
        this.time.delayedCall(500, () => {
            if (dustParticles) dustParticles.destroy();
        });
    }
    
    addDoubleJumpEffect() {
        // More pronounced effect for double jump
        const sparkles = this.add.particles(this.player.x, this.player.y, 'staticObjects_', {
            frame: [26], // Use the ball sprite as sparkle
            scale: { start: 0.5, end: 0.1 },
            speed: { min: 30, max: 80 },
            lifespan: 400,
            quantity: 5,
            angle: { min: 0, max: 360 },
            tint: 0x00ffff // Blue tint for double jump
        });
        
        this.time.delayedCall(600, () => {
            if (sparkles) sparkles.destroy();
        });
    }

    addWallSlideEffect() {
        if (Math.random() < 0.1) {
            const offsetX = this.wallSlidingSide === -1 ? -8 : 8;
            const particle = this.add.circle(
                this.player.x + offsetX,
                this.player.y + Phaser.Math.Between(-10, 10),
                2, 0xcccccc
            );
            
            this.tweens.add({
                targets: particle,
                alpha: 0,
                x: particle.x + (this.wallSlidingSide * -10),
                y: particle.y + 20,
                duration: 400,
                ease: 'Power2',
                onComplete: () => particle.destroy()
            });
        }
    }

    addWallJumpEffect() {
        const offsetX = this.wallJumpDirection > 0 ? -12 : 12;
        
        for (let i = 0; i < 6; i++) {
            const particle = this.add.circle(
                this.player.x + offsetX, this.player.y, 3, 0xffffff
            );
            
            const angle = Phaser.Math.Between(-60, 60) * Phaser.Math.DEG_TO_RAD;
            const speed = Phaser.Math.Between(50, 100);
            
            this.tweens.add({
                targets: particle,
                alpha: 0,
                x: particle.x + Math.cos(angle + (this.wallJumpDirection > 0 ? 0 : Math.PI)) * speed,
                y: particle.y + Math.sin(angle) * speed,
                duration: 500,
                ease: 'Power2',
                onComplete: () => particle.destroy()
            });
        }
    }

    // ===========================================
    // AUDIO EFFECTS
    // ===========================================
    
    playJumpSound() {
        try {
            const savedVolume = localStorage.getItem('sfxVolume') || '50';
            const volumeValue = parseFloat(savedVolume) / 100;

            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            oscillator.frequency.setValueAtTime(200, audioContext.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(400, audioContext.currentTime + 0.1);
            
            gainNode.gain.setValueAtTime(0.2 * volumeValue, audioContext.currentTime); // Appliquer le volume
            gainNode.gain.exponentialRampToValueAtTime(0.01 * volumeValue, audioContext.currentTime + 0.15);
            
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.15);
        } catch (error) {
            console.log('Jump!');
        }
    }
    
    playDoubleJumpSound() {
        try {
            const savedVolume = localStorage.getItem('sfxVolume') || '50';
            const volumeValue = parseFloat(savedVolume) / 100;

            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            oscillator.frequency.setValueAtTime(300, audioContext.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(600, audioContext.currentTime + 0.08);
            oscillator.frequency.exponentialRampToValueAtTime(500, audioContext.currentTime + 0.12);
            
            gainNode.gain.setValueAtTime(0.15 * volumeValue, audioContext.currentTime); // Appliquer le volume
            gainNode.gain.exponentialRampToValueAtTime(0.01 * volumeValue, audioContext.currentTime + 0.2);
            
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.2);
        } catch (error) {
            console.log('Double Jump!');
        }
    }

    playWallJumpSound() {
        try {
            const savedVolume = localStorage.getItem('sfxVolume') || '50';
            const volumeValue = parseFloat(savedVolume) / 100;

            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);

            oscillator.frequency.setValueAtTime(600, audioContext.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(400, audioContext.currentTime + 0.1);
            gainNode.gain.setValueAtTime(0.1 * volumeValue, audioContext.currentTime); // Appliquer le volume
            gainNode.gain.exponentialRampToValueAtTime(0.01 * volumeValue, audioContext.currentTime + 0.1);

            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.1);
        } catch (e) {
            // Ignore audio errors
        }
    }

    playPushSound() {
        try {
            const savedVolume = localStorage.getItem('sfxVolume') || '50';
            const volumeValue = parseFloat(savedVolume) / 100;

            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);

            oscillator.frequency.setValueAtTime(200, audioContext.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(150, audioContext.currentTime + 0.05);
            gainNode.gain.setValueAtTime(0.05 * volumeValue, audioContext.currentTime); // Appliquer le volume
            gainNode.gain.exponentialRampToValueAtTime(0.01 * volumeValue, audioContext.currentTime + 0.05);

            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.05);
        } catch (e) {
            // Ignore audio errors
        }
    }

    playGameOverSound() {
        try {
            // Récupérer le volume sauvegardé (entre 0 et 100)
            const savedVolume = localStorage.getItem('sfxVolume') || '15';
            const volumeValue = parseFloat(savedVolume) / 100; // Convertir en 0.0-1.0

            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);

            oscillator.type = 'sawtooth';
            oscillator.frequency.setValueAtTime(400, audioContext.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(80, audioContext.currentTime + 0.5);

            gainNode.gain.setValueAtTime(0.2 * volumeValue, audioContext.currentTime); // Appliquer le volume
            gainNode.gain.exponentialRampToValueAtTime(0.01 * volumeValue, audioContext.currentTime + 0.5);

            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.5);
        } catch (e) {
            // Ignore audio errors
        }
    }

    playVictorySound() {
        try {
            // Récupérer le volume sauvegardé
            const savedVolume = localStorage.getItem('sfxVolume') || '50';
            const volumeValue = parseFloat(savedVolume) / 100;

            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);

            oscillator.type = 'triangle';
            oscillator.frequency.setValueAtTime(440, audioContext.currentTime);
            oscillator.frequency.linearRampToValueAtTime(660, audioContext.currentTime + 0.15);
            oscillator.frequency.linearRampToValueAtTime(880, audioContext.currentTime + 0.3);

            gainNode.gain.setValueAtTime(0.15 * volumeValue, audioContext.currentTime); // Appliquer le volume
            gainNode.gain.exponentialRampToValueAtTime(0.01 * volumeValue, audioContext.currentTime + 0.35);

            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.35);
        } catch (e) {
            // Ignore audio errors
        }
    }

    // ===========================================
    // UTILITY METHODS
    // ===========================================

    getTileGlobalId(tilesetName, localTileId) {
        const tileset = this.map.getTileset(tilesetName);
        if (!tileset) {
            console.error(`Tileset ${tilesetName} not found`);
            return null;
        }
        return tileset.firstgid + localTileId;
    }

    stopTimer() {
        this.timerStopped = true;
    }

    getFinalTime() {
        const totalMs = Math.floor(this.elapsedTime);
        const minutes = Math.floor(totalMs / 60000);
        const seconds = Math.floor((totalMs % 60000) / 1000);
        const milliseconds = totalMs % 1000;

        return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}:${milliseconds.toString().padStart(3, '0')}`;
    }

    // ===========================================
    // UI AND GAME STATE METHODS
    // ===========================================

    async showQuestionUI(questionId, onCorrect = null) {
        this.physics.world.pause();
        this.input.keyboard.enabled = false;

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
                ui.remove();

                if (idx === q.correct) {
                    if (typeof onCorrect === 'function') {
                        onCorrect();
                    }
                    //alert('Correct answer!');
                    this.input.keyboard.resetKeys();
                } else {
                    this.showGameOverUI();
                }
            };
        });
    }

    showGameOverUI() {
        this.isDead = true;
        this.stopTimer();
        this.stopMusic();
        this.playGameOverSound(); // <-- Ajout ici
        this.physics.world.pause();
        this.input.keyboard.enabled = false;

        this.player.once('animationcomplete-death', () => {
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
                this.isDead = false;
                this.input.keyboard.enabled = true;
                this.physics.world.resume();
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
        this.stopTimer();
        this.stopMusic();
        this.playVictorySound(); // <-- Ajout ici
        const finalTime = this.getFinalTime();
        const finalTimeMs = this.elapsedTime;
        
        this.physics.world.pause();
        this.input.keyboard.enabled = false;
    
        const ui = document.createElement('div');
        ui.className = 'question-ui';
        ui.innerHTML = `
          <div class="question-text">Well done ! Level completed</div>
          <div class="question-text" style="font-size: 14px; margin-top: 10px;">Final Time: ${finalTime}</div>
          <div class="question-choices">
            <button id="next-level-btn">Next level</button>
          </div>
        `;
        document.body.appendChild(ui);
    
        document.getElementById('next-level-btn').onclick = async () => {
            ui.remove();
            this.cameras.main.fadeOut(800, 0, 0, 0);
            this.cameras.main.once('camerafadeoutcomplete', async () => {
                await saveUserProgress(this.level + 1, finalTimeMs);
                this.scene.start('Level2Scene', { level: this.level + 1 });
            });
        };
    }

    // ===========================================
    // BRIDGE CREATION SYSTEM
    // ===========================================

    startBridgeCreation(bridge, collisionLayers) {
        const bridgeCenterX = ((bridge.startX + bridge.endX) / 2) * 16;
        const bridgeCenterY = bridge.y * 16;
        
        this.cameras.main.stopFollow();
        this.cameras.main.pan(bridgeCenterX, bridgeCenterY, 1500, 'Power2', false, (camera, progress) => {
            if (progress === 1) {
                this.createBridgeWithCamera(bridge, collisionLayers);
            }
        });
    }

    createBridgeWithCamera(bridge, collisionLayers) {
        let tilesCreated = 0;
        const totalTiles = bridge.endX - bridge.startX + 1;
        
        for (let x = bridge.startX; x <= bridge.endX; x++) {
            this.time.addEvent({
                delay: (x - bridge.startX) * 150,
                callback: () => {
                    const globalTileId = this.getTileGlobalId(bridge.tileset, bridge.tileId);
                    if (globalTileId !== null) {
                        // Appliquer le changement sur tous les layers
                        collisionLayers.forEach(layer => {
                            const tile = layer.putTileAt(globalTileId, x, bridge.y);
                            if (tile) {
                                // Utiliser la propriété hasCollision pour déterminer les collisions
                                tile.setCollision(bridge.hasCollision !== false);
                            }
                        });
                        
                        // Effet visuel seulement une fois
                        this.addBridgeTileEffect({ 
                            getCenterX: () => x * 16 + 8, 
                            getCenterY: () => bridge.y * 16 + 8 
                        });
                        
                        const tilePixelX = x * 16;
                        this.cameras.main.pan(tilePixelX, bridge.y * 16, 100, 'Power1');
                    }
                    
                    tilesCreated++;
                    
                    if (tilesCreated === totalTiles) {
                        this.time.delayedCall(800, () => {
                            this.returnCameraToPlayer();
                        });
                    }
                }
            });
        }
    }

    returnCameraToPlayer() {
        this.cameras.main.pan(this.player.x, this.player.y, 1000, 'Power2', false, (camera, progress) => {
            if (progress === 1) {
                this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
                this.input.keyboard.enabled = true;
                this.physics.world.resume();
            }
        });
    }

    addBridgeTileEffect(tile) {
        const tileX = tile.getCenterX();
        const tileY = tile.getCenterY();
        
        for (let i = 0; i < 8; i++) {
            const particle = this.add.circle(
                tileX + Phaser.Math.Between(-8, 8), 
                tileY + Phaser.Math.Between(-8, 8), 
                3, 0xffd700
            );
            
            this.tweens.add({
                targets: particle,
                alpha: 0,
                scaleX: 0,
                scaleY: 0,
                y: tileY - 20,
                duration: 600,
                delay: i * 50,
                ease: 'Power2',
                onComplete: () => particle.destroy()
            });
        }
    }

    setupMusic() {
    // Récupérer le volume sauvegardé ou utiliser la valeur par défaut
    const savedVolume = localStorage.getItem('musicVolume') || '10';
    const volumeValue = parseFloat(savedVolume) / 100;
    
    // Créer l'objet audio avec le volume sauvegardé
    this.backgroundMusic = this.sound.add('level1_music', {
        volume: volumeValue,    // Utilise le volume sauvegardé
        loop: true             // Jouer en boucle
    });
    
    // Démarrer la musique
    this.backgroundMusic.play();
    }

    stopMusic() {
    if (this.backgroundMusic && this.backgroundMusic.isPlaying) {
        // Fade out progressif avant d'arrêter
        this.tweens.add({
            targets: this.backgroundMusic,
            volume: 0,
            duration: 1000,
            ease: 'Power2',
            onComplete: () => {
                this.backgroundMusic.stop();
            }
        });
    }
}

// Add this method after your existing update methods

handleBeeCollision() {
    // Reset score and show game over
    this.score = 0;
    this.showGameOverUI();
}

handleBombCollision() {
    // Reset score and show game over
    this.score = 0;
    this.showGameOverUI();
}

}