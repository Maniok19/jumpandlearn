export default class Bomb {
    constructor(scene, x, y, config = {}) {
        this.scene = scene;
        
        // Configuration par défaut
        this.config = {
            speed: 40,
            patrolDistance: 8 * 16, // 8 tiles
            hitboxWidth: 10,
            hitboxHeight: 10,
            hitboxOffsetX: 7,
            hitboxOffsetY: 12, // Changé de 9 à 2
            ...config
        };
        
        // Créer le sprite (utilise temporairement un sprite existant)
        // Tu devras remplacer 'bomb' par ton vrai sprite quand tu l'auras
        this.sprite = scene.physics.add.sprite(x, y, 'bomb');
        this.sprite.setFrame(0); // Changé de 26 à 0 pour utiliser la première frame
        
        this.setupPhysics();
        this.setupMovement(x);
        this.setupAnimations();
        this.setupCollisions();
    }
    
    setupPhysics() {
        this.sprite.setCollideWorldBounds(true);
        this.sprite.setSize(this.config.hitboxWidth, this.config.hitboxHeight);
        this.sprite.setOffset(this.config.hitboxOffsetX, this.config.hitboxOffsetY);
        // Garde la gravité pour qu'elle marche au sol
        this.sprite.body.setGravityY(-800); // Changé de -800 à 0 pour utiliser la gravité du monde
    }
    
    setupMovement(startX) {
        this.sprite.speed = this.config.speed;
        this.sprite.direction = 1; // 1 pour droite, -1 pour gauche
        this.sprite.patrolDistance = this.config.patrolDistance;
        this.sprite.startX = startX;
    }
    
    setupAnimations() {
        // Vérifier si l'animation existe déjà
        if (!this.scene.anims.exists('bomb_walk')) {
            this.scene.anims.create({
                key: 'bomb_walk',
                frames: this.scene.anims.generateFrameNumbers('bomb', { start: 0, end: 4 }),
                frameRate: 8,
                repeat: -1
            });
        }
    }
    
    setupCollisions() {
        // Collision avec le joueur
        this.scene.physics.add.overlap(this.scene.player, this.sprite, () => {
            this.handlePlayerCollision();
        });
        
        // Collision avec la map
        if (this.scene.map && this.scene.map.getLayer('colision')) {
            this.scene.physics.add.collider(this.sprite, this.scene.map.getLayer('colision').tilemapLayer, () => {
                this.handleWallCollision();
            });
        }
    }
    
    update() {
        if (!this.sprite || !this.sprite.active) return;
        
        this.updatePatrolMovement();
        this.updateAnimation();
    }
    
    updatePatrolMovement() {
        // Mouvement horizontal simple
        this.sprite.setVelocityX(this.sprite.speed * this.sprite.direction);
        
        // Vérifier si la bombe s'est trop éloignée de sa position de départ
        const distanceFromStart = Math.abs(this.sprite.x - this.sprite.startX);
        if (distanceFromStart >= this.sprite.patrolDistance) {
            this.changeDirection();
        }
    }
    
    changeDirection() {
        this.sprite.direction *= -1;
        
        // Ajouter un petit buffer pour éviter un changement de direction immédiat
        if (this.sprite.direction > 0) {
            this.sprite.x = this.sprite.startX - this.sprite.patrolDistance + 5;
        } else {
            this.sprite.x = this.sprite.startX + this.sprite.patrolDistance - 5;
        }
        
        // Retourner le sprite selon la direction
        this.sprite.setFlipX(this.sprite.direction < 0);
    }
    
    updateAnimation() {
        this.sprite.anims.play('bomb_walk', true);
        
        // Effet de "rebond" pendant la marche
        if (this.sprite.body.onFloor()) {
            const walkCycle = Math.sin(this.scene.time.now * 0.01) * 0.5;
            this.sprite.setScale(1 + walkCycle * 0.05, 1 - walkCycle * 0.05);
        }
    }
    

    
    handlePlayerCollision() {
        // Déléguer la gestion de collision à la scène
        if (this.scene.handleBombCollision) {
            this.scene.handleBombCollision();
        } else {
            // Comportement par défaut - tuer le joueur
            this.scene.score = 0;
            this.scene.showGameOverUI();
        }
    }
    
    handleWallCollision() {
        // Changer de direction quand on touche un mur
        this.sprite.direction *= -1;
        this.sprite.setFlipX(this.sprite.direction < 0);
    }
    
    // Méthodes utilitaires (identiques à Bee.js)
    setSpeed(speed) {
        this.sprite.speed = speed;
        this.config.speed = speed;
    }
    
    setPatrolDistance(distance) {
        this.sprite.patrolDistance = distance;
        this.config.patrolDistance = distance;
    }
    
    getPosition() {
        return { x: this.sprite.x, y: this.sprite.y };
    }
    
    setPosition(x, y) {
        this.sprite.setPosition(x, y);
        this.sprite.startX = x; // Mettre à jour la position de départ
    }
    
    destroy() {
        if (this.sprite) {
            this.sprite.destroy();
        }
    }
    
    // Méthodes pour personnaliser le comportement
    setOnPlayerCollision(callback) {
        this.onPlayerCollision = callback;
    }
    
    setOnWallCollision(callback) {
        this.onWallCollision = callback;
    }
}