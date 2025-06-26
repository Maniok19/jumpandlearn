export class PendulumObstacles {
    constructor(scene) {
        this.scene = scene;
        this.pendulumObstacles = [];
    }

    createPendulumObstacles() {
        this.pendulumObstacles = [];
        
        const pendulumConfigs = [
            {
                x: 42 * 16 + 8, y: 20 * 16 + 8,
                chainLength: 4, armLength: 80, speed: 0.02,
                maxAngle: Math.PI / 3, startAngle: 0
            },
            {
                x: 106 * 16 + 8, y: 26 * 16 + 8,
                chainLength: 5, armLength: 100, speed: 0.015,
                maxAngle: Math.PI / 4, startAngle: Math.PI / 6
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
            direction: 1,
            chainSprites: [],
            ballSprite: null,
            spikeSprites: [],
            dangerZone: null
        };

        // Create visual components
        this.createPendulumVisuals(pendulum, config);
        
        // Create danger zone for collision
        pendulum.dangerZone = this.scene.add.rectangle(0, 0, 20, 20, 0xff0000, 0);
        this.scene.physics.add.existing(pendulum.dangerZone, true);
        this.scene.dangerZones.add(pendulum.dangerZone);

        this.pendulumObstacles.push(pendulum);
        this.updatePendulumPosition(pendulum);
    }

    createPendulumVisuals(pendulum, config) {
        // Create chain sprites
        for (let i = 0; i < config.chainLength; i++) {
            const chainSprite = this.scene.add.sprite(0, 0, 'staticObjects_');
            chainSprite.setFrame(74);
            pendulum.chainSprites.push(chainSprite);
        }

        // Create ball sprite
        pendulum.ballSprite = this.scene.add.sprite(0, 0, 'staticObjects_');
        pendulum.ballSprite.setFrame(26);

        // Create spike sprites
        const spikeConfigs = [
            { frameId: 130, offsetX: -16, offsetY: 0 },
            { frameId: 112, offsetX: 0, offsetY: 16 },
            { frameId: 111, offsetX: 16, offsetY: 0 }
        ];

        spikeConfigs.forEach(spikeConfig => {
            const spike = this.scene.add.sprite(0, 0, 'staticObjects_');
            spike.setFrame(spikeConfig.frameId);
            spike.offsetX = spikeConfig.offsetX;
            spike.offsetY = spikeConfig.offsetY;
            pendulum.spikeSprites.push(spike);
        });
    }

    updatePendulumObstacles() {
        if (!this.pendulumObstacles || this.pendulumObstacles.length === 0) return;

        this.pendulumObstacles.forEach(pendulum => {
            // Update pendulum physics
            pendulum.angle += pendulum.direction * pendulum.speed;

            // Check swing limits and reverse direction
            if (pendulum.angle >= pendulum.maxAngle) {
                pendulum.angle = pendulum.maxAngle;
                pendulum.direction = -1;
            } else if (pendulum.angle <= -pendulum.maxAngle) {
                pendulum.angle = -pendulum.maxAngle;
                pendulum.direction = 1;
            }

            this.updatePendulumPosition(pendulum);
        });
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
            chain.setRotation(pendulum.angle);
        });

        // Update ball position
        pendulum.ballSprite.setPosition(ballX, ballY);

        // Update spike positions
        pendulum.spikeSprites.forEach(spike => {
            spike.setPosition(ballX + spike.offsetX, ballY + spike.offsetY);
        });

        // Update danger zone
        pendulum.dangerZone.setPosition(ballX, ballY);
        pendulum.dangerZone.body.updateFromGameObject();
    }
}