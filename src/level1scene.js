import { saveUserProgress, ControlsManager } from './main.js';

export default class Level1Scene extends Phaser.Scene {
    constructor() {
        super('Level1Scene');
        this.score = 0;
        this.scoreText = null;
        this.startX= 0;
        this.isDead = false;
        // Add timer properties
        this.startTime = 0;
        this.elapsedTime = 0;
        this.timerText = null;
        this.timerStopped = false;
    }

    init(data) {
        this.level = data.level || 1;
    }

    preload() {
        // Load tileset as a spritesheet instead of image
        this.load.spritesheet('tileset_spring', 'assets/tilesets/spring_tileset.png', { 
            frameWidth: 16, 
            frameHeight: 16 
        });
        this.load.spritesheet('staticObjects_', 'assets/tilesets/staticObjects_.png', { 
            frameWidth: 16, 
            frameHeight: 16 
        });
		this.load.spritesheet('tileset_world', 'assets/tilesets/world_tileset.png', { 
			frameWidth: 16, 
			frameHeight: 16 
        });
        this.load.tilemapTiledJSON('level1', 'assets/maps/level1.json');
        this.load.spritesheet('player', 'assets/personnage/personnage.png', { frameWidth: 32, frameHeight: 32 });
    }

    getTileGlobalId(tilesetName, localTileId) {
        const tileset = this.map.getTileset(tilesetName);
        if (!tileset) {
            console.error(`Tileset ${tilesetName} not found`);
            return null;
        }
        return tileset.firstgid + localTileId - 1;
    }

    create() {
        const controls = ControlsManager.createKeys(this);
        this.jumpKey = controls.jumpKey;
        this.leftKey = controls.leftKey;
        this.rightKey = controls.rightKey;
        
        this.isDead = false;
        
        // Initialize timer
        this.startTime = this.time.now;
        this.elapsedTime = 0;
        this.timerStopped = false;
        
        // ✅ Add wall jump properties
        this.wallJumpCooldown = 0;
        this.isWallSliding = false;
        this.wallSlidingSide = 0; // -1 for left wall, 1 for right wall
        this.wallSlideSpeed = 50; // Reduced falling speed when wall sliding
        this.wallJumpForceX = 200; // Horizontal force when wall jumping
        this.wallJumpForceY = -280; // Vertical force when wall jumping
        this.wallJumpTime = 300; // Time in ms to maintain wall jump force
        this.wallJumpTimer = 0;
        this.wallJumpDirection = 0;
        
        // ✅ Stocke la map comme propriété de l'instance
        this.map = this.make.tilemap({ key: 'level1' });

        const dangerLayer = this.map.getObjectLayer('danger');
        this.dangerZones = this.physics.add.staticGroup();
      
        dangerLayer.objects.forEach(obj => {
          const zone = this.add.rectangle(obj.x + obj.width / 2, obj.y + obj.height / 2, obj.width, obj.height);
          this.physics.add.existing(zone, true);
          this.dangerZones.add(zone);
        });
      
        const tilesetWorld = this.map.addTilesetImage('tileset_world', 'tileset_world');
        const tilesetspring = this.map.addTilesetImage('tileset_spring', 'tileset_spring');
        const tilesetStaticObjects = this.map.addTilesetImage('staticObjects_', 'staticObjects_');
      
        const background = this.map.createLayer('ciel', tilesetWorld);
        const collision = this.map.createLayer('colision', [tilesetWorld, tilesetspring, tilesetStaticObjects]);
        collision.setCollisionByProperty({ collision: true });
      
        this.physics.world.setBounds(0, 0, this.map.widthInPixels, this.map.heightInPixels);
        this.player = this.physics.add.sprite(6 * 16 + 8,30 * 16 + 8, 'player');
        this.player.setCollideWorldBounds(true);
        this.player.setSize(15, 15);
        this.player.setOffset(10, 10);

        // ✅ Create moving platform
        this.createMovingPlatform(collision);

        // ✅ Create pendulum obstacles
        this.createPendulumObstacles();
        
        // ✅ Create pushable obstacles
        this.createPushableObstacles();
        
        this.endZone = this.add.rectangle(117 * 16 + 8, 27 * 16 + 8, 50, 50);
        this.physics.add.existing(this.endZone, true);

        this.physics.add.collider(this.player, collision);
      
        this.physics.add.overlap(this.player, this.endZone, async () => {
            this.showVictoryUI();
        });

        this.physics.add.overlap(this.player, this.dangerZones, () => {
          this.score = 0;
          this.showGameOverUI();
        });

        // Modifiez la configuration des zones de questions
        this.questionZonesData = [
            { 
                x: 55 * 16 + 8, y: 30 * 16 + 8, width: 1 * 16, height: 1 * 16, 
                questionId: "53f42b04-48f2-4892-8029-0556d535d6fd",
                bridge: { 
                    startX: 57, 
                    endX: 62, 
                    y: 31, 
                    tileId: 10,
                    tileset: 'tileset_world'
                }
            },
            { 
                x: 85 * 16 + 8, y: 30 * 16 + 8, width: 1 * 16, height: 1 * 16, 
                questionId: "b2475722-4796-40ef-a548-8968fbb1dfd2",
                bridge: { 
                    startX: 87, 
                    endX: 92, 
                    y: 31, 
                    tileId: 10,
                    tileset: 'tileset_world'
                }
            }
        ];
        
        this.answeredQuestions = new Set(); // ✅ Tracker les questions répondues

        this.questionZones = this.physics.add.staticGroup();
        this.questionZonesData.forEach(data => {
            const zone = this.add.rectangle(data.x, data.y, data.width, data.height, 0x00ff00, 0);
            zone.questionId = data.questionId;
            zone.bridgeConfig = data.bridge; // ✅ Stocke la config du pont
            this.physics.add.existing(zone, true);
            this.questionZones.add(zone);
        });

        this.physics.add.overlap(this.player, this.questionZones, (player, zone) => {
            // ✅ Empêche les déclenchements multiples
            if (!this.answeredQuestions.has(zone.questionId)) {
                this.showQuestionUI(zone.questionId, () => {
                    const collisionLayer = this.map.getLayer('colision').tilemapLayer;
                    const bridge = zone.bridgeConfig; // ✅ Récupère la config spécifique

                    // ✅ NOUVELLE LOGIQUE : Déplace la caméra vers le pont
                    this.startBridgeCreation(bridge, collisionLayer);
                    
                    // ✅ Marque comme répondue et détruit
                    this.answeredQuestions.add(zone.questionId);
                    zone.destroy();
                });
            }
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
            { fontFamily: '"Press Start 2P"', fontSize: '16px', fill: '#ffd700' }
        ).setScrollFactor(0).setDepth(100);

        // Add timer text
        this.timerText = this.add.text(
            16, 40, 
            'Time: 00:00:000', 
            { fontFamily: '"Press Start 2P"', fontSize: '16px', fill: '#00ff00' }
        ).setScrollFactor(0).setDepth(100);
      
        this.cameras.main.setBounds(0, 0, this.map.widthInPixels, this.map.heightInPixels);
        this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
		this.cameras.main.setFollowOffset(0, 30); // Add 100px offset upward


        this.input.on('pointerdown', (pointer) => {
        const worldX = pointer.worldX;
        const worldY = pointer.worldY;
        const tileX = Math.floor(worldX / 16); // 16 = taille d'une tuile
        const tileY = Math.floor(worldY / 16);
        console.log(`Tile position: x=${tileX}, y=${tileY}`);
});
    }

    createMovingPlatform(collisionLayer) {
        // Platform 1 configuration
        const platformConfig1 = {
            // Starting tile position
            startTileX: 29,
            startTileY: 26,
            // Platform size in tiles
            widthInTiles: 2,
            heightInTiles: 1,
            // Movement properties
            speed: 50,           // Movement speed in pixels per second
            direction: 'horizontal', // 'horizontal' or 'vertical'
            // Movement boundaries (in tile coordinates)
            minTileX: 27,         // Leftmost position (for horizontal movement)
            maxTileX: 38,        // Rightmost position (for horizontal movement)
            minTileY: 14,         // Topmost position (for vertical movement)
            maxTileY: 10,        // Bottommost position (for vertical movement)
            // Visual tiles to use
            tiles: [
                { tilesetName: 'tileset_spring', localId: 23 }, // Left tile
                { tilesetName: 'tileset_spring', localId: 24 }  // Right tile
            ]
        };

        // Platform 2 configuration - new platform
        const platformConfig2 = {
            // Starting tile position
            startTileX: 99,
            startTileY: 32,
            // Platform size in tiles
            widthInTiles: 2,
            heightInTiles: 1,
            // Movement properties
            speed: 40,           // Movement speed in pixels per second
            direction: 'horizontal', // 'horizontal' or 'vertical'
            // Movement boundaries (in tile coordinates)
            minTileX: 99,        // Leftmost position (for horizontal movement)
            maxTileX: 109,        // Rightmost position (for horizontal movement)
            minTileY: 12,        // Topmost position (for vertical movement)
            maxTileY: 12,        // Bottommost position (for vertical movement)
            // Visual tiles to use
            tiles: [
                { tilesetName: 'tileset_spring', localId: 23 }, // Left tile
                { tilesetName: 'tileset_spring', localId: 24 }  // Right tile
            ]
        };

        // Platform 3 configuration - third platform (vertical movement example)
        const platformConfig3 = {
            // Starting tile position
            startTileX: 66,      // X position in tiles
            startTileY: 29,      // Starting Y position in tiles
            // Platform size in tiles
            widthInTiles: 2,
            heightInTiles: 1,
            // Movement properties
            speed: 30,           // Movement speed in pixels per second
            direction: 'horizontal', // 'horizontal' or 'vertical'
            // Movement boundaries (in tile coordinates)
            minTileX: 66,        // X position (fixed for vertical movement)
            maxTileX: 75,        // X position (fixed for vertical movement)
            minTileY: 29,        // Topmost position (for vertical movement)
            maxTileY: 29,        // Bottommost position (for vertical movement)
            // Visual tiles to use
            tiles: [
                { tilesetName: 'tileset_spring', localId: 23 }, // Left tile
                { tilesetName: 'tileset_spring', localId: 24 }  // Right tile
            ]
        };
		

        // Platform 4 configuration - fourth platform (vertical movement)
        const platformConfig4 = {
            // Starting tile position
            startTileX: 79,      // X position in tiles (fixed for vertical movement)
            startTileY: 35,      // Starting Y position in tiles
            // Platform size in tiles
            widthInTiles: 2,
            heightInTiles: 1,
            // Movement properties
            speed: 40,           // Movement speed in pixels per second
            direction: 'vertical', // 'horizontal' or 'vertical'
            // Movement boundaries (in tile coordinates)
            minTileX: 79,        // X position (fixed for vertical movement)
            maxTileX: 79,        // X position (fixed for vertical movement)
            minTileY: 30,        // Topmost position (for vertical movement)
            maxTileY: 35,        // Bottommost position (for vertical movement)
            // Visual tiles to use
            tiles: [
                { tilesetName: 'tileset_spring', localId: 23 }, // Left tile
                { tilesetName: 'tileset_spring', localId: 24 }  // Right tile
            ]
        };
        const platformConfig5 = {
            // Starting tile position
            startTileX: 13,
            startTileY: 25,
            // Platform size in tiles
            widthInTiles: 1,
            heightInTiles: 7,
            // Movement properties
            speed: 50,           // Movement speed in pixels per second
            direction: 'vertical', // 'horizontal' or 'vertical'
            // Movement boundaries (in tile coordinates)
            minTileX: 13,         // Leftmost position (for horizontal movement)
            maxTileX: 13,        // Rightmost position (for horizontal movement)
            minTileY: 25,         // Topmost position (for vertical movement)
            maxTileY: 28,        // Bottommost position (for vertical movement)
            // Visual tiles to use
            tiles: [
                { tilesetName: 'tileset_spring', localId: 23 },
                { tilesetName: 'tileset_spring', localId: 23 },
                { tilesetName: 'tileset_spring', localId: 23 },
                { tilesetName: 'tileset_spring', localId: 23 },
                { tilesetName: 'tileset_spring', localId: 23 },
                { tilesetName: 'tileset_spring', localId: 23 }, // Left tile
                { tilesetName: 'tileset_spring', localId: 24 }  // Right tile
            ]
        };

        // Create all four platforms
        this.movingPlatforms = [];
        this.platformSprites = [];
        
        [platformConfig1, platformConfig2, platformConfig3, platformConfig4, platformConfig5].forEach((platformConfig, index) => {
            // Convert tile position to pixel position
            const startX = platformConfig.startTileX * 16 + (platformConfig.widthInTiles * 16) / 2;
            const startY = platformConfig.startTileY * 16 + (platformConfig.heightInTiles * 16) / 2;

            // Calculate movement boundaries in pixels
            const minX = platformConfig.minTileX * 16 + (platformConfig.widthInTiles * 16) / 2;
            const maxX = platformConfig.maxTileX * 16 + (platformConfig.widthInTiles * 16) / 2;
            const minY = platformConfig.minTileY * 16 + (platformConfig.heightInTiles * 16) / 2;
            const maxY = platformConfig.maxTileY * 16 + (platformConfig.heightInTiles * 16) / 2;

            // Get global tile IDs
            const tileIds = platformConfig.tiles.map(tile => 
                this.getTileGlobalId(tile.tilesetName, tile.localId)
            );

            // Check if all tile IDs are valid
            if (tileIds.some(id => id === null)) {
                console.error('Could not get tile IDs for platform', index);
                return;
            }

            // Create platform physics body with visual sprites
            const movingPlatform = this.physics.add.sprite(startX, startY, null);
            movingPlatform.setSize(
                platformConfig.widthInTiles * 16, 
                platformConfig.heightInTiles * 16
            );
            movingPlatform.body.setImmovable(true);
            movingPlatform.body.setGravityY(-800); // Cancel out gravity
            movingPlatform.setVisible(false); // Hide the sprite, we'll use visual sprites

            // Platform movement properties
            movingPlatform.minX = minX;
            movingPlatform.maxX = maxX;
            movingPlatform.minY = minY;
            movingPlatform.maxY = maxY;
            movingPlatform.movementDirection = platformConfig.direction;
            movingPlatform.speed = platformConfig.speed;
            movingPlatform.config = platformConfig;
            
            // Set initial movement direction (1 = positive direction, -1 = negative direction)
            if (platformConfig.direction === 'horizontal') {
                movingPlatform.direction = 1; // Start moving right
            } else {
                movingPlatform.direction = 1; // Start moving down
            }

            // Create visual sprites for the platform
            const platformSprites = [];
            for (let i = 0; i < platformConfig.widthInTiles; i++) {
                const spriteX = startX - (platformConfig.widthInTiles * 16) / 2 + (i * 16) + 8;
                const spriteY = startY;
                
                // Create a sprite that uses the tileset texture
                const sprite = this.add.sprite(spriteX, spriteY, 'tileset_spring');
                // Use the local tile ID directly (subtract 1 because frames are 0-indexed)
                const localFrameId = platformConfig.tiles[i % platformConfig.tiles.length].localId - 1;
                sprite.setFrame(localFrameId);
                platformSprites.push(sprite);
            }

            this.movingPlatforms.push(movingPlatform);
            this.platformSprites.push(platformSprites);

            // Add collision between player and platform
            this.physics.add.collider(this.player, movingPlatform, () => {
                // Check if player is on top of platform
                if (this.player.body.bottom <= movingPlatform.body.top + 5 && 
                    this.player.body.velocity.y >= 0) {
                    this.playerOnPlatform = index; // Track which platform player is on
                }
            });
        });

        // Track if player is on platform (will store platform index or false)
        this.playerOnPlatform = false;
    }

    updateMovingPlatform() {
        if (!this.movingPlatforms || this.movingPlatforms.length === 0) return;

        this.movingPlatforms.forEach((movingPlatform, platformIndex) => {
            const config = movingPlatform.config;
            let deltaX = 0;
            let deltaY = 0;

            if (movingPlatform.movementDirection === 'horizontal') {
                // Horizontal movement
                const deltaMovement = movingPlatform.direction * movingPlatform.speed * (1/60);
                const newX = movingPlatform.x + deltaMovement;
                
                // Check boundaries and reverse direction
                if (newX >= movingPlatform.maxX) {
                    movingPlatform.x = movingPlatform.maxX;
                    movingPlatform.direction = -1;
                } else if (newX <= movingPlatform.minX) {
                    movingPlatform.x = movingPlatform.minX;
                    movingPlatform.direction = 1;
                } else {
                    deltaX = deltaMovement;
                    movingPlatform.x = newX;
                }

            } else if (movingPlatform.movementDirection === 'vertical') {
                // Vertical movement
                const deltaMovement = movingPlatform.direction * movingPlatform.speed * (1/60);
                const newY = movingPlatform.y + deltaMovement;
                
                // Check boundaries and reverse direction
                if (newY >= movingPlatform.maxY) {
                    movingPlatform.y = movingPlatform.maxY;
                    movingPlatform.direction = -1;
                } else if (newY <= movingPlatform.minY) {
                    movingPlatform.y = movingPlatform.minY;
                    movingPlatform.direction = 1;
                } else {
                    deltaY = deltaMovement;
                    movingPlatform.y = newY;
                }
            }

            // Update visual sprites position
            this.platformSprites[platformIndex].forEach((sprite, index) => {
                sprite.x = movingPlatform.x - (config.widthInTiles * 16) / 2 + (index * 16) + 8;
                sprite.y = movingPlatform.y;
            });

            // Move player with platform if they're on this specific platform
            if (this.playerOnPlatform === platformIndex) {
                // Check if player is still on platform
                if (this.player.body.bottom > movingPlatform.body.top + 10 || 
                    this.player.x < movingPlatform.body.left - 5 || 
                    this.player.x > movingPlatform.body.right + 5) {
                    this.playerOnPlatform = false;
                } else {
                    // Move player with platform
                    this.player.x += deltaX;
                    this.player.y += deltaY;
                }
            } else {
                // Check if platform should push the player (when player is beside the platform)
                const platformLeft = movingPlatform.body.left;
                const platformRight = movingPlatform.body.right;
                const platformTop = movingPlatform.body.top;
                const platformBottom = movingPlatform.body.bottom;
                
                const playerLeft = this.player.body.left;
                const playerRight = this.player.body.right;
                const playerTop = this.player.body.top;
                const playerBottom = this.player.body.bottom;
                
                // Check if player overlaps with platform vertically and is beside it horizontally
                const verticalOverlap = playerBottom > platformTop && playerTop < platformBottom;
                
                if (verticalOverlap && deltaX !== 0) {
                    // Platform moving right and player is to the right of platform
                    if (deltaX > 0 && playerLeft >= platformRight - 10 && playerLeft <= platformRight + 10) {
                        this.player.x += deltaX;
                    }
                    // Platform moving left and player is to the left of platform  
                    else if (deltaX < 0 && playerRight <= platformLeft + 10 && playerRight >= platformLeft - 10) {
                        this.player.x += deltaX;
                    }
                }
                
                // Similar logic for vertical movement if needed
                if (deltaY !== 0) {
                    const horizontalOverlap = playerRight > platformLeft && playerLeft < platformRight;
                    
                    if (horizontalOverlap) {
                        // Platform moving down and player is below platform
                        if (deltaY > 0 && playerTop >= platformBottom - 10 && playerTop <= platformBottom + 10) {
                            this.player.y += deltaY;
                        }
                        // Platform moving up and player is above platform
                        else if (deltaY < 0 && playerBottom <= platformTop + 10 && playerBottom >= platformTop - 10) {
                            this.player.y += deltaY;
                        }
                    }
                }
            }
        });
    }

    createPendulumObstacles() {
        this.pendulumObstacles = [];
        
        // Configuration for pendulum obstacles
        const pendulumConfigs = [
            {
                x: 37 * 16 + 8,   // Tile 13 * tile size (16px) + half tile for center
                y: 25 * 16 + 8,    // Tile 3 * tile size (16px) + half tile for center
               
                chainLength: 4,   // Number of chain links
                armLength: 80,    // Pendulum arm length in pixels
                speed: 0.02,      // Pendulum swing speed
                maxAngle: Math.PI / 3, // (60 degrees) plus c elevé moins ca bouge
                startAngle: 0     // Starting angle
            },
            {
                x: 90 * 16 + 8,   // Tile 13 * tile size (16px) + half tile for center
                y: 24 * 16 + 8,    // Tile 3 * tile size (16px) + half tile for center
               
                chainLength: 4,
                armLength: 100,
                speed: 0.015,
                maxAngle: Math.PI / 2,
                startAngle: Math.PI / 6
            },
			{
                x: 106 * 16 + 8,   // Tile 13 * tile size (16px) + half tile for center
                y: 26 * 16 + 8,    // Tile 3 * tile size (16px) + half tile for center
               
                chainLength: 5,
                armLength: 100,
                speed: 0.015,
                maxAngle: Math.PI / 4,
                startAngle: Math.PI / 6
            }
        ];

        pendulumConfigs.forEach((config, index) => {
            this.createSinglePendulum(config, index);
        });
    }

    createSinglePendulum(config, index) {
        const pendulum = {
            anchorX: config.x,
            anchorY: config.y,
            armLength: config.armLength,
            angle: config.startAngle,
            speed: config.speed,
            maxAngle: config.maxAngle,
            direction: 1, // 1 for right, -1 for left
            chainSprites: [],
            ballSprite: null,
            spikeSprites: [],
            dangerZone: null
        };

        // Create chain sprites
        for (let i = 0; i < config.chainLength; i++) {
            const chainSprite = this.add.sprite(0, 0, 'staticObjects_');
            chainSprite.setFrame(74); // Chain tile ID 113 - 1 (0-indexed)
            pendulum.chainSprites.push(chainSprite);
        }

        // Create ball sprite
        pendulum.ballSprite = this.add.sprite(0, 0, 'staticObjects_');
        pendulum.ballSprite.setFrame(26); // Ball tile ID 26 - 1 (0-indexed)

        // Create spike sprites
        const spikeConfigs = [
            { frameId: 130, offsetX: -16, offsetY: 0 },   // Left spike (ID 130 - 1)
            { frameId: 112, offsetX: 0, offsetY: 16 },    // Bottom spike (ID 112 - 1)
            { frameId: 111, offsetX: 16, offsetY: 0 }     // Right spike (ID 111 - 1)
        ];

        spikeConfigs.forEach(spikeConfig => {
            const spike = this.add.sprite(0, 0, 'staticObjects_');
            spike.setFrame(spikeConfig.frameId);
            spike.offsetX = spikeConfig.offsetX;
            spike.offsetY = spikeConfig.offsetY;
            pendulum.spikeSprites.push(spike);
        });

        // ✅ Create danger zone as a static physics body for consistent collision detection
        pendulum.dangerZone = this.add.rectangle(0, 0, 20, 20, 0xff0000, 0);
        this.physics.add.existing(pendulum.dangerZone, true); // true = static body
    
        // ✅ Add to dangerZones group for collision detection
        this.dangerZones.add(pendulum.dangerZone);

        // Store pendulum
        this.pendulumObstacles.push(pendulum);

        // Update initial positions
        this.updatePendulumPosition(pendulum);
    }

    updatePendulumPosition(pendulum) {
        // Calculate ball position based on pendulum physics
        const ballX = pendulum.anchorX + Math.sin(pendulum.angle) * pendulum.armLength;
        const ballY = pendulum.anchorY + Math.cos(pendulum.angle) * pendulum.armLength;

        // Update chain positions
        pendulum.chainSprites.forEach((chain, index) => {
            const chainRatio = (index + 1) / pendulum.chainSprites.length;
            const chainX = pendulum.anchorX + Math.sin(pendulum.angle) * pendulum.armLength * chainRatio * 0.8;
            const chainY = pendulum.anchorY + Math.cos(pendulum.angle) * pendulum.armLength * chainRatio * 0.8;
            
            chain.setPosition(chainX, chainY);
            
            // Rotate chain to follow the pendulum angle
            chain.setRotation(pendulum.angle);
        });

        // Update ball position
        pendulum.ballSprite.setPosition(ballX, ballY);

        // Update spike positions relative to ball
        pendulum.spikeSprites.forEach(spike => {
            spike.setPosition(
                ballX + spike.offsetX,
                ballY + spike.offsetY
            );
        });

        // ✅ Update danger zone position - for static bodies, update position directly
        pendulum.dangerZone.setPosition(ballX, ballY);
        // ✅ For static bodies, we need to refresh the physics body
        pendulum.dangerZone.body.updateFromGameObject();
    }

    updatePendulumObstacles() {
        if (!this.pendulumObstacles) return;

        this.pendulumObstacles.forEach(pendulum => {
            // Update pendulum angle
            pendulum.angle += pendulum.direction * pendulum.speed;

            // Check if we've reached the swing limits
            if (pendulum.angle >= pendulum.maxAngle) {
                pendulum.angle = pendulum.maxAngle;
                pendulum.direction = -1;
            } else if (pendulum.angle <= -pendulum.maxAngle) {
                pendulum.angle = -pendulum.maxAngle;
                pendulum.direction = 1;
            }

            // Update positions
            this.updatePendulumPosition(pendulum);
        });
    }

    createPushableObstacles() {
        this.pushableObstacles = [];
        
        // Configuration for pushable obstacles
        const pushableConfigs = [
            {
                x: 9 * 16 + 8,    // Tile position converted to pixels
                y: 30 * 16 + 8,   // Starting position
                width: 16,         // Width in pixels
                height: 16,        // Height in pixels
                pushSpeed: 30,     // How fast it moves when pushed
                spriteConfig: {
                    tileset: 'tileset_world',
                    frameId: 55  // Box sprite frame
                }
            }
        ];

        pushableConfigs.forEach((config, index) => {
            this.createSinglePushableObstacle(config, index);
        });
    }

    createSinglePushableObstacle(config, index) {
        // Create physics body
        const obstacle = this.physics.add.sprite(config.x, config.y, config.spriteConfig.tileset);
        obstacle.setFrame(config.spriteConfig.frameId);
        obstacle.setSize(config.width, config.height);
        
        // Configure physics properties - make it behave like a solid object
        obstacle.body.setCollideWorldBounds(true);
        obstacle.body.setImmovable(false); // Allow it to be moved
        obstacle.body.setMass(1); // Normal mass
        obstacle.body.setDrag(1000, 0); // High horizontal drag to stop immediately when not pushed
        obstacle.body.setMaxVelocity(config.pushSpeed, 400); // Limit speed
    
        // Store configuration for reference
        obstacle.config = config;
        obstacle.isPushable = true;
        obstacle.isBeingPushed = false;
        obstacle.pushDirection = 0;
        
        // Add to obstacles array
        this.pushableObstacles.push(obstacle);
        
        // Add collision with collision layer
        this.physics.add.collider(obstacle, this.map.getLayer('colision').tilemapLayer);
        
        // Add collision with other pushable obstacles
        this.pushableObstacles.forEach(otherObstacle => {
            if (otherObstacle !== obstacle) {
                this.physics.add.collider(obstacle, otherObstacle);
            }
        });
        
        // Add collision with player - this handles both pushing and standing on top
        this.physics.add.collider(this.player, obstacle, (player, obstacle) => {
            this.handlePlayerObstacleCollision(player, obstacle);
        });
        
        // Add collision with moving platforms
        if (this.movingPlatforms) {
            this.movingPlatforms.forEach(platform => {
                this.physics.add.collider(obstacle, platform);
            });
        }
        
        // Add collision with danger zones (obstacles can fall into danger)
        this.physics.add.overlap(obstacle, this.dangerZones, (obstacle, danger) => {
            this.resetPushableObstacle(obstacle);
        });
    }

    handlePlayerObstacleCollision(player, obstacle) {
        if (!obstacle.isPushable) return;
        
        const playerCenter = player.body.center;
        const obstacleCenter = obstacle.body.center;
        
        // Check if player is on top of obstacle
        const onTop = player.body.bottom <= obstacle.body.top + 8 && 
              player.body.velocity.y >= 0 &&
              Math.abs(playerCenter.x - obstacleCenter.x) < obstacle.body.width * 0.7;

        if (onTop) {
            // Player is standing on obstacle - no pushing, stop the obstacle
            obstacle.isBeingPushed = false;
            obstacle.body.setVelocityX(0);
            return;
        }
        
        // Check for horizontal collision (pushing) - only when both are on ground
        const horizontalOverlap = Math.abs(playerCenter.x - obstacleCenter.x) > 
                         Math.abs(playerCenter.y - obstacleCenter.y);
    
        if (horizontalOverlap && player.body.onFloor() && obstacle.body.onFloor()) {
            const playerDirection = Math.sign(player.body.velocity.x);
            const pushDirection = playerCenter.x < obstacleCenter.x ? 1 : -1;
            
            // Only push if player is moving toward the obstacle with sufficient speed
            if ((pushDirection > 0 && player.body.velocity.x > 50) || 
                (pushDirection < 0 && player.body.velocity.x < -50)) {
                
                obstacle.isBeingPushed = true;
                obstacle.pushDirection = pushDirection;
                
                // Set the obstacle velocity directly
                obstacle.body.setVelocityX(pushDirection * obstacle.config.pushSpeed);
                
                // Visual feedback
                this.tweens.add({
                    targets: obstacle,
                    scaleX: 1.02,
                    scaleY: 0.98,
                    duration: 100,
                    yoyo: true,
                    ease: 'Power1'
                });
                
                // Sound effect
                this.playPushSound();
            } else {
                // Player not moving fast enough or wrong direction
                obstacle.isBeingPushed = false;
                obstacle.body.setVelocityX(0);
            }
        } else {
            // Not a horizontal push collision
            obstacle.isBeingPushed = false;
            obstacle.body.setVelocityX(0);
        }
    }

    updatePushableObstacles() {
        if (!this.pushableObstacles) return;
        
        this.pushableObstacles.forEach(obstacle => {
            // Check if player is still pushing
            const playerNearby = Phaser.Geom.Rectangle.Overlaps(
                this.player.body,
                new Phaser.Geom.Rectangle(
                    obstacle.body.x - 5, 
                    obstacle.body.y, 
                    obstacle.body.width + 10, 
                    obstacle.body.height
                )
            );
            
            // If player is not nearby or not moving, stop the obstacle
            if (!playerNearby || Math.abs(this.player.body.velocity.x) < 50) {
                obstacle.isBeingPushed = false;
                obstacle.body.setVelocityX(0);
            }
            
            // Check if obstacle fell off the world
            if (obstacle.y > this.map.heightInPixels + 100) {
                this.resetPushableObstacle(obstacle);
            }
            
            // Ensure obstacle doesn't move when not being pushed
            if (!obstacle.isBeingPushed) {
                obstacle.body.setVelocityX(0);
            }
        });
    }

    resetPushableObstacle(obstacle) {
        // Reset obstacle to its original position
        obstacle.setPosition(obstacle.config.x, obstacle.config.y);
        obstacle.body.setVelocity(0, 0);
        obstacle.isBeingPushed = false;
        
        // Visual effect for reset
        this.tweens.add({
            targets: obstacle,
            alpha: 0.5,
            duration: 100,
            yoyo: true,
            repeat: 2,
            ease: 'Power2'
        });
    }

    playPushSound() {
        // Simple sound effect for pushing - shorter and more appropriate
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);

            oscillator.frequency.setValueAtTime(200, audioContext.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(150, audioContext.currentTime + 0.05);
            gainNode.gain.setValueAtTime(0.05, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.05);

            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.05);
        } catch (e) {
            // Ignore audio errors
        }
    }

    update() {
        if (this.isDead) return;

        // Update timer if not stopped
        if (!this.timerStopped) {
            this.elapsedTime = this.time.now - this.startTime;
            this.updateTimerDisplay();
        }

        // Update moving platform
        this.updateMovingPlatform();

        // Update pendulum obstacles
        this.updatePendulumObstacles();
        
        // ✅ Update pushable obstacles
        this.updatePushableObstacles();

        // ✅ Update wall jump timers
        if (this.wallJumpCooldown > 0) {
            this.wallJumpCooldown -= this.game.loop.delta;
        }
        
        if (this.wallJumpTimer > 0) {
            this.wallJumpTimer -= this.game.loop.delta;
        }

        // ✅ Update wall sliding
        this.updateWallSliding();

        const player = this.player;
        
        // ✅ Modified movement controls to work with wall jumping
        if (this.leftKey.isDown) {
            // Only apply left movement if not in wall jump state or wall jump allows it
            if (this.wallJumpTimer <= 0 || this.wallJumpDirection <= 0) {
                player.setVelocityX(-160);
                player.anims.play('run', true);
                player.setFlipX(true);
            }
        } else if (this.rightKey.isDown) {
            // Only apply right movement if not in wall jump state or wall jump allows it
            if (this.wallJumpTimer <= 0 || this.wallJumpDirection >= 0) {
                player.setVelocityX(160);
                player.anims.play('run', true);
                player.setFlipX(false);
            }
        } else {
            // Only stop horizontal movement if not in wall jump state
            if (this.wallJumpTimer <= 0) {
                player.setVelocityX(0);
                player.anims.play('idle', true);
            }
        }
        
        // ✅ Modified jump controls for wall jumping
        if (this.jumpKey.isDown) {
            if (player.body.onFloor()) {
                // Normal ground jump
                player.setVelocityY(-300);
                player.anims.play('jump', true);
                this.playerOnPlatform = false;
            } else if (this.isWallSliding) {
                // Wall jump
                this.performWallJump();
            }
        }

        const distance = Math.max(0, player.x - this.startX);
        if (distance > this.maxDistance) {
            this.maxDistance = distance;
        }
        this.score = Math.floor(this.maxDistance) * 10;
        this.scoreText.setText('Score: ' + this.score);
    }

    // New method to update timer display
    updateTimerDisplay() {
        const totalMs = Math.floor(this.elapsedTime);
        const minutes = Math.floor(totalMs / 60000);
        const seconds = Math.floor((totalMs % 60000) / 1000);
        const milliseconds = totalMs % 1000;

        const formattedTime = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}:${milliseconds.toString().padStart(3, '0')}`;
        this.timerText.setText('Time: ' + formattedTime);
    }

    // New method to stop timer
    stopTimer() {
        this.timerStopped = true;
    }

    // New method to get final time
    getFinalTime() {
        const totalMs = Math.floor(this.elapsedTime);
        const minutes = Math.floor(totalMs / 60000);
        const seconds = Math.floor((totalMs % 60000) / 1000);
        const milliseconds = totalMs % 1000;

        return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}:${milliseconds.toString().padStart(3, '0')}`;
    }

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
                        onCorrect(); // ➕ Callback exécuté ici
                    }

                    alert('Correct answer!');
                } else {
                    this.showGameOverUI();
                }
            };
        });
    }

    showGameOverUI() {
        this.isDead = true; // Marque le joueur comme mort
        this.stopTimer(); // Stop timer on game over
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
        // Stop timer when reaching victory
        this.stopTimer();
        const finalTime = this.getFinalTime();
        const finalTimeMs = this.elapsedTime; // Get time in milliseconds
        
        // Pause le jeu si besoin
        this.physics.world.pause();
        this.input.keyboard.enabled = false;
    
        // Crée l'UI de victoire
        const ui = document.createElement('div');
        ui.className = 'question-ui'; // Réutilise le style popup
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
            // Transition visuelle
            this.cameras.main.fadeOut(800, 0, 0, 0);
            this.cameras.main.once('camerafadeoutcomplete', async () => {
                // Save progress with completion time
                await saveUserProgress(this.level + 1, finalTimeMs);
                this.scene.start('Level2Scene', { level: this.level + 1 });
            });
        };
    }

    // ✅ NOUVELLE MÉTHODE pour gérer la création du pont avec caméra
    startBridgeCreation(bridge, collisionLayer) {
        // Calcule la position centrale du pont
        const bridgeCenterX = ((bridge.startX + bridge.endX) / 2) * 16;
        const bridgeCenterY = bridge.y * 16;
        
        // ✅ Arrête le suivi du joueur
        this.cameras.main.stopFollow();
        
        // ✅ Déplace la caméra vers le pont avec une transition fluide
        this.cameras.main.pan(bridgeCenterX, bridgeCenterY, 1500, 'Power2', false, (camera, progress) => {
            if (progress === 1) {
                // ✅ Une fois la caméra arrivée, commence la création du pont
                this.createBridgeWithCamera(bridge, collisionLayer);
            }
        });
    }

    // ✅ NOUVELLE MÉTHODE pour créer le pont avec suivi caméra
    createBridgeWithCamera(bridge, collisionLayer) {
        let tilesCreated = 0;
        const totalTiles = bridge.endX - bridge.startX + 1;
        
        for (let x = bridge.startX; x <= bridge.endX; x++) {
            this.time.addEvent({
                delay: (x - bridge.startX) * 150, // Un peu plus lent pour l'effet visuel
                callback: () => {
                    // ✅ Utilise la helper function
                    const globalTileId = this.getTileGlobalId(bridge.tileset, bridge.tileId);
                    if (globalTileId !== null) {
                        const tile = collisionLayer.putTileAt(globalTileId, x, bridge.y);
                        if (tile) {
                            tile.setCollision(true);
                            
                            // ✅ Effet visuel sur la tuile qui apparaît
                            this.addBridgeTileEffect(tile);
                            
                            // ✅ Déplace légèrement la caméra pour suivre la progression
                            const tilePixelX = x * 16;
                            this.cameras.main.pan(tilePixelX, bridge.y * 16, 100, 'Power1');
                        }
                    }
                    
                    tilesCreated++;
                    
                    // ✅ Si c'est la dernière tuile, revient au joueur
                    if (tilesCreated === totalTiles) {
                        this.time.delayedCall(800, () => {
                            this.returnCameraToPlayer();
                        });
                    }
                }
            });
        }
    }

    // ✅ NOUVELLE MÉTHODE pour revenir au joueur
    returnCameraToPlayer() {
        // ✅ Transition fluide vers le joueur
        this.cameras.main.pan(this.player.x, this.player.y, 1000, 'Power2', false, (camera, progress) => {
            if (progress === 1) {
                // ✅ Reprend le suivi du joueur
                this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
                this.input.keyboard.enabled = true; // Réactive les contrôles
                this.physics.world.resume();
            }
        });
    }

    // ✅ NOUVELLE MÉTHODE pour l'effet visuel des tuiles
    addBridgeTileEffect(tile) {
        // Coordonnées du centre de la tuile
        const tileX = tile.getCenterX();
        const tileY = tile.getCenterY();
        
        // ✅ Particules dorées qui apparaissent
        for (let i = 0; i < 8; i++) {
            const particle = this.add.circle(
                tileX + Phaser.Math.Between(-8, 8), 
                tileY + Phaser.Math.Between(-8, 8), 
                3, 
                0xffd700
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

    // ✅ Add new method to check for wall collision
    checkWallCollision() {
        if (!this.player.body) return false;
        
        const playerBody = this.player.body;
        const tileSize = 16;
        
        // Get collision layer
        const collisionLayer = this.map.getLayer('colision').tilemapLayer;
        
        // Check tiles to the left and right of the player
        const playerCenterY = playerBody.center.y;
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
        
        // Return wall side: -1 for left, 1 for right, 0 for no wall
        if (leftWallFound && this.leftKey.isDown) return -1;
        if (rightWallFound && this.rightKey.isDown) return 1;
        
        return 0;
    }

    // ✅ Add new method to handle wall sliding
    updateWallSliding() {
        const wallSide = this.checkWallCollision();
        
        // Check if conditions are met for wall sliding
        const canWallSlide = !this.player.body.onFloor() && 
                            this.player.body.velocity.y > 0 && 
                            wallSide !== 0 &&
                            this.wallJumpTimer <= 0;
        
        if (canWallSlide) {
            this.isWallSliding = true;
            this.wallSlidingSide = wallSide;
            
            // Reduce falling speed
            if (this.player.body.velocity.y > this.wallSlideSpeed) {
                this.player.body.velocity.y = this.wallSlideSpeed;
            }
            
            // Add visual effect for wall sliding
            this.addWallSlideEffect();
            
        } else {
            this.isWallSliding = false;
            this.wallSlidingSide = 0;
        }
    }

    // ✅ Add visual effect for wall sliding
    addWallSlideEffect() {
        // Only create particles occasionally to avoid performance issues
        if (Math.random() < 0.1) {
            const offsetX = this.wallSlidingSide === -1 ? -8 : 8;
            const particle = this.add.circle(
                this.player.x + offsetX,
                this.player.y + Phaser.Math.Between(-10, 10),
                2,
                0xcccccc
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

    // ✅ Add method to handle wall jumping
    performWallJump() {
        if (this.isWallSliding && this.wallJumpCooldown <= 0) {
            // Set wall jump forces
            this.player.body.velocity.x = this.wallJumpForceX * -this.wallSlidingSide;
            this.player.body.velocity.y = this.wallJumpForceY;
            
            // Set wall jump state
            this.wallJumpTimer = this.wallJumpTime;
            this.wallJumpDirection = -this.wallSlidingSide;
            this.wallJumpCooldown = 200; // Cooldown to prevent spam
            
            // Reset wall sliding
            this.isWallSliding = false;
            this.wallSlidingSide = 0;
            
            // Play jump animation
            this.player.anims.play('jump', true);
            
            // Set player facing direction
            this.player.setFlipX(this.wallJumpDirection < 0);
            
            // Add visual effect
            this.addWallJumpEffect();
            
            // Play sound effect
            this.playWallJumpSound();
        }
    }

    // ✅ Add visual effect for wall jump
    addWallJumpEffect() {
        const offsetX = this.wallJumpDirection > 0 ? -12 : 12;
        
        // Create burst effect
        for (let i = 0; i < 6; i++) {
            const particle = this.add.circle(
                this.player.x + offsetX,
                this.player.y,
                3,
                0xffffff
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

    // ✅ Add sound effect for wall jump
    playWallJumpSound() {
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);

            oscillator.frequency.setValueAtTime(600, audioContext.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(400, audioContext.currentTime + 0.1);
            gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);

            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.1);
        } catch (e) {
            // Ignore audio errors
        }
    }
}