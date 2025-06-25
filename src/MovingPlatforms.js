export class MovingPlatforms {
    constructor(scene) {
        this.scene = scene;
        this.movingPlatforms = [];
        this.platformSprites = [];
        this.playerOnPlatform = false;
    }

    createMovingPlatforms() {
        const platformConfigs = [
            {
                startTileX: 29, startTileY: 26, widthInTiles: 2, heightInTiles: 1,
                speed: 50, direction: 'horizontal',
                minTileX: 27, maxTileX: 38, minTileY: 14, maxTileY: 10,
                tiles: [
                    { tilesetName: 'tileset_spring', localId: 23 },
                    { tilesetName: 'tileset_spring', localId: 24 }
                ]
            },
            {
                startTileX: 99, startTileY: 32, widthInTiles: 2, heightInTiles: 1,
                speed: 40, direction: 'horizontal',
                minTileX: 99, maxTileX: 109, minTileY: 12, maxTileY: 12,
                tiles: [
                    { tilesetName: 'tileset_spring', localId: 23 },
                    { tilesetName: 'tileset_spring', localId: 24 }
                ]
            },
            {
                startTileX: 66, startTileY: 29, widthInTiles: 2, heightInTiles: 1,
                speed: 30, direction: 'horizontal',
                minTileX: 66, maxTileX: 75, minTileY: 29, maxTileY: 29,
                tiles: [
                    { tilesetName: 'tileset_spring', localId: 23 },
                    { tilesetName: 'tileset_spring', localId: 24 }
                ]
            },
            {
                startTileX: 79, startTileY: 35, widthInTiles: 2, heightInTiles: 1,
                speed: 40, direction: 'vertical',
                minTileX: 79, maxTileX: 79, minTileY: 30, maxTileY: 35,
                tiles: [
                    { tilesetName: 'tileset_spring', localId: 23 },
                    { tilesetName: 'tileset_spring', localId: 24 }
                ]
            },
            {
                startTileX: 13, startTileY: 25, widthInTiles: 1, heightInTiles: 7,
                speed: 50, direction: 'vertical',
                minTileX: 13, maxTileX: 13, minTileY: 25, maxTileY: 28,
                tiles: Array(7).fill({ tilesetName: 'tileset_spring', localId: 23 })
            }
        ];

        this.movingPlatforms = [];
        this.platformSprites = [];
        
        platformConfigs.forEach((platformConfig, index) => {
            this.createSingleMovingPlatform(platformConfig, index);
        });

        this.playerOnPlatform = false;
    }

    createSingleMovingPlatform(platformConfig, index) {
        // Convert tile coordinates to pixel coordinates
        const startX = platformConfig.startTileX * 16 + (platformConfig.widthInTiles * 16) / 2;
        const startY = platformConfig.startTileY * 16 + (platformConfig.heightInTiles * 16) / 2;
        const minX = platformConfig.minTileX * 16 + (platformConfig.widthInTiles * 16) / 2;
        const maxX = platformConfig.maxTileX * 16 + (platformConfig.widthInTiles * 16) / 2;
        const minY = platformConfig.minTileY * 16 + (platformConfig.heightInTiles * 16) / 2;
        const maxY = platformConfig.maxTileY * 16 + (platformConfig.heightInTiles * 16) / 2;

        // Create platform physics body - USE this.scene.physics instead of this.physics
        const movingPlatform = this.scene.physics.add.sprite(startX, startY, null);
        movingPlatform.setSize(platformConfig.widthInTiles * 16, platformConfig.heightInTiles * 16);
        movingPlatform.body.setImmovable(true);
        movingPlatform.body.setGravityY(-800);
        movingPlatform.setVisible(false);

        // Configure platform properties
        Object.assign(movingPlatform, {
            minX, maxX, minY, maxY,
            movementDirection: platformConfig.direction,
            speed: platformConfig.speed,
            config: platformConfig,
            direction: 1
        });

        // Create visual sprites
        const platformSprites = this.createPlatformSprites(platformConfig, startX, startY);
        
        this.movingPlatforms.push(movingPlatform);
        this.platformSprites.push(platformSprites);

        // Setup collisions - USE this.scene.physics instead of this.physics
        this.scene.physics.add.collider(this.scene.player, movingPlatform, () => {
            if (this.scene.player.body.bottom <= movingPlatform.body.top + 5 && 
                this.scene.player.body.velocity.y >= 0) {
                this.scene.playerOnPlatform = index;
            }
        });
    }

    createPlatformSprites(config, startX, startY) {
        const sprites = [];
        for (let i = 0; i < config.widthInTiles; i++) {
            const spriteX = startX - (config.widthInTiles * 16) / 2 + (i * 16) + 8;
            // USE this.scene.add instead of this.add
            const sprite = this.scene.add.sprite(spriteX, startY, 'tileset_spring');
            const localFrameId = config.tiles[i % config.tiles.length].localId - 1;
            sprite.setFrame(localFrameId);
            sprites.push(sprite);
        }
        return sprites;
    }

    updateMovingPlatforms() {
        if (!this.movingPlatforms || this.movingPlatforms.length === 0) return;

        this.movingPlatforms.forEach((platform, index) => {
            const deltaMovement = this.calculatePlatformMovement(platform);
            this.updatePlatformPosition(platform, deltaMovement);
            this.updatePlatformSprites(platform, index, deltaMovement);
            this.handlePlayerPlatformInteraction(platform, index, deltaMovement);
        });
    }

    calculatePlatformMovement(platform) {
        const deltaMovement = platform.direction * platform.speed * (1/60);
        const movement = { deltaX: 0, deltaY: 0 };

        if (platform.movementDirection === 'horizontal') {
            const newX = platform.x + deltaMovement;
            if (newX >= platform.maxX) {
                platform.x = platform.maxX;
                platform.direction = -1;
            } else if (newX <= platform.minX) {
                platform.x = platform.minX;
                platform.direction = 1;
            } else {
                movement.deltaX = deltaMovement;
                platform.x = newX;
            }
        } else if (platform.movementDirection === 'vertical') {
            const newY = platform.y + deltaMovement;
            if (newY >= platform.maxY) {
                platform.y = platform.maxY;
                platform.direction = -1;
            } else if (newY <= platform.minY) {
                platform.y = platform.minY;
                platform.direction = 1;
            } else {
                movement.deltaY = deltaMovement;
                platform.y = newY;
            }
        }

        return movement;
    }

    updatePlatformPosition(platform, movement) {
        // Platform position is updated in calculatePlatformMovement
    }

    updatePlatformSprites(platform, index, movement) {
        const config = platform.config;
        this.platformSprites[index].forEach((sprite, spriteIndex) => {
            sprite.x = platform.x - (config.widthInTiles * 16) / 2 + (spriteIndex * 16) + 8;
            sprite.y = platform.y;
        });
    }

    handlePlayerPlatformInteraction(platform, platformIndex, movement) {
        if (this.scene.playerOnPlatform === platformIndex) {
            // Check if player is still on platform
            if (this.scene.player.body.bottom > platform.body.top + 10 || 
                this.scene.player.x < platform.body.left - 5 || 
                this.scene.player.x > platform.body.right + 5) {
                this.scene.playerOnPlatform = false;
            } else {
                // Move player with platform
                this.scene.player.x += movement.deltaX;
                this.scene.player.y += movement.deltaY;
            }
        } else {
            // Handle platform pushing player when beside it
            this.handlePlatformPushing(platform, movement);
        }
    }

    handlePlatformPushing(platform, movement) {
        const platformBounds = platform.body;
        const playerBounds = this.scene.player.body;
        
        const verticalOverlap = playerBounds.bottom > platformBounds.top && 
                               playerBounds.top < platformBounds.bottom;
        
        if (verticalOverlap && movement.deltaX !== 0) {
            // Handle horizontal pushing
            if (movement.deltaX > 0 && 
                playerBounds.left >= platformBounds.right - 10 && 
                playerBounds.left <= platformBounds.right + 10) {
                this.scene.player.x += movement.deltaX;
            } else if (movement.deltaX < 0 && 
                      playerBounds.right <= platformBounds.left + 10 && 
                      playerBounds.right >= platformBounds.left - 10) {
                this.scene.player.x += movement.deltaX;
            }
        }
        
        if (movement.deltaY !== 0) {
            const horizontalOverlap = playerBounds.right > platformBounds.left && 
                                     playerBounds.left < platformBounds.right;
            
            if (horizontalOverlap) {
                // Handle vertical pushing
                if (movement.deltaY > 0 && 
                    playerBounds.top >= platformBounds.bottom - 10 && 
                    playerBounds.top <= platformBounds.bottom + 10) {
                    this.scene.player.y += movement.deltaY;
                } else if (movement.deltaY < 0 && 
                          playerBounds.bottom <= platformBounds.top + 10 && 
                          playerBounds.bottom >= platformBounds.top - 10) {
                    this.scene.player.y += movement.deltaY;
                }
            }
        }
    }

    // ... toutes les méthodes des plateformes mobiles
}