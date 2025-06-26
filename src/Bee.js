export default class Bee {
    constructor(scene, x, y, config = {}) {
        this.scene = scene;
        
        // Configuration par défaut
        this.config = {
            speed: 60,
            patrolDistance: 12 * 16, // 12 tiles
            hitboxWidth: 8,
            hitboxHeight: 8,
            hitboxOffsetX: 8,
            hitboxOffsetY: 8,
            floatingAmplitude: 0.5,
            floatingSpeed: 0.003,
            ...config
        };
        
        // Créer le sprite
        this.sprite = scene.physics.add.sprite(x, y, 'bee');
        // Phase unique pour chaque abeille, basée sur sa position
        this.floatingPhase = (x * 13.37 + y * 42.42) % (2 * Math.PI);
        this.setupPhysics();
        this.setupMovement(x);
        this.setupAnimations();
        this.setupCollisions();
    }
    
    setupPhysics() {
        this.sprite.setCollideWorldBounds(false);
        this.sprite.setSize(this.config.hitboxWidth, this.config.hitboxHeight);
        this.sprite.setOffset(this.config.hitboxOffsetX, this.config.hitboxOffsetY);
        this.sprite.setGravityY(-800); // Annule la gravité pour voler
    }
    
    setupMovement(startX) {
        this.sprite.speed = this.config.speed;
        this.sprite.direction = 1; // 1 pour droite, -1 pour gauche
        this.sprite.patrolDistance = this.config.patrolDistance;
        this.sprite.startX = startX;
    }
    
    setupAnimations() {
        // Vérifier si l'animation existe déjà
        if (!this.scene.anims.exists('bee_fly')) {
            this.scene.anims.create({
                key: 'bee_fly',
                frames: this.scene.anims.generateFrameNumbers('bee', { start: 0, end: 9 }),
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
        
        // Collision avec la map (optionnel - pour rebondir sur les murs)
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
        this.updateFloatingMotion();
    }
    
    updatePatrolMovement() {
        // Mouvement de patrouille simple
        this.sprite.setVelocityX(this.sprite.speed * this.sprite.direction);
        
        // Vérifier si l'abeille s'est trop éloignée de sa position de départ
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
        this.sprite.anims.play('bee_fly', true);
    }
    
    updateFloatingMotion() {
        // Mouvement de flottement déterministe
        const t = this.scene.time.now * this.config.floatingSpeed + this.floatingPhase;
        this.sprite.y += Math.sin(t) * this.config.floatingAmplitude;
    }
    
    handlePlayerCollision() {
        // Déléguer la gestion de collision à la scène
        if (this.scene.handleBeeCollision) {
            this.scene.handleBeeCollision();
        } else {
            // Comportement par défaut
            this.scene.score = 0;
            this.scene.showGameOverUI();
        }
    }
    
    handleWallCollision() {
        // Changer de direction quand on touche un mur
        this.sprite.direction *= -1;
        this.sprite.setFlipX(this.sprite.direction < 0);
    }
    
    // Méthodes utilitaires
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