const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const currentScoreDisplay = document.getElementById('currentScore');
const highScoreDisplay = document.getElementById('highScore');
const gameOverScreen = document.getElementById('gameOverScreen');
const finalScoreDisplay = document.getElementById('finalScore');
const discountInfoDisplay = document.getElementById('discountInfo');
const restartButton = document.getElementById('restartButton');
const dailyLimitScreen = document.getElementById('dailyLimitScreen');
const dailyLimitTimeDisplay = document.getElementById('dailyLimitTime');
const closeLimitButton = document.getElementById('closeLimitButton');

// === Game Variables ===
let player;
let obstacles = [];
let clouds = [];
let groundTiles = [];
let score = 0;
let highScore = parseInt(localStorage.getItem('dinoHighScore') || '0', 10);
let gameSpeed = 0;
let gameOver = false;
let frameId;
let lastObstacleTime = 0;
let lastCloudTime = 0;

// === Logical Dimensions for Game Design (Portrait Mobile-First) ===
const LOGICAL_CANVAS_WIDTH = 320;
const LOGICAL_CANVAS_HEIGHT = 480;
const LOGICAL_GROUND_Y_OFFSET = 50; 

// === Actual Canvas Dimensions (scaled) ===
let currentCanvasWidth = LOGICAL_CANVAS_WIDTH;
let currentCanvasHeight = LOGICAL_CANVAS_HEIGHT;
let scaleFactor = 1; 

// === General Settings (Logical Dimensions) ===
const BASE_JUMP_VELOCITY = -15; 
const BASE_GRAVITY = 0.8; 
const BASE_GAME_SPEED = 5; 

// === Fox Character Settings (Logical Dimensions) ===
const BASE_FOX_WIDTH = 30;
const BASE_FOX_HEIGHT = 35;
const FOX_START_X_RATIO = 0.15;
const FOX_BODY_COLOR = '#ff9800'; // Fox body color
const EYE_COLOR = 'black'; // Eye color
const GLASSES_COLOR = 'black'; // Glasses color
const CLOTHES_COLOR = '#4CAF50'; // Clothes color (e.g., a green vest)

// === Obstacle Settings (Logical Dimensions) ===
const BASE_OBSTACLE_MIN_GAP_LOGICAL = 150;
const BASE_OBSTACLE_MAX_GAP_LOGICAL = 300;
const OBSTACLE_COLOR = '#ff1744';

const BASE_OBSTACLE_TYPES = [
    { type: 'block_low', width: 20, height: 40 },
    { type: 'block_medium', width: 20, height: 60 },
    { type: 'block_high', width: 20, height: 80 },
    { type: 'flying_low', width: 40, height: 20, yOffset: 120 },
    { type: 'flying_mid', width: 40, height: 20, yOffset: 200 },
    { type: 'stacked_2', width: 20, height: 70, segments: 2 },
    { type: 'stacked_3', width: 20, height: 100, segments: 3 }
];

// === Cloud Settings (Logical Dimensions) ===
const BASE_CLOUD_WIDTH = 50;
const BASE_CLOUD_HEIGHT = 15;
const CLOUD_COLOR = '#b0bec5';
const BASE_CLOUD_MIN_GAP_LOGICAL = 100;
const BASE_CLOUD_MAX_GAP_LOGICAL = 400;

// === Ground Settings (Logical Dimensions) ===
const GROUND_COLOR = '#555';
const GROUND_LINE_COLOR = '#666';

// === Discount System ===
const DISCOUNT_PER_500_SCORE = 0.5; // 0.5% discount for every 500 score
const MAX_DISCOUNT_PERCENT = 50; // Max 50% discount

// === Daily Limit System ===
const DAILY_LIMIT_KEY = 'gamerenter_last_play_time';
const DAILY_LIMIT_DURATION = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

// === Sounds ===
const jumpSound = new Audio('assets/jump.mp3');
const hitSound = new Audio('assets/hit.mp3');

// === Helper Functions for Drawing Shapes ===

function drawCloudShape(x, y, width, height) {
    ctx.beginPath();
    ctx.arc(x, y + height / 2, height / 2, 0, Math.PI * 2);
    ctx.arc(x + width * 0.3, y + height * 0.3, height * 0.6, 0, Math.PI * 2);
    ctx.arc(x + width * 0.7, y + height * 0.4, height * 0.7, 0, Math.PI * 2);
    ctx.arc(x + width, y + height / 2, height / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.closePath();
}

// Function to draw the fox with glasses and clothes
function drawFox(x, y, width, height, runFrame) {
    // Body (previously defined)
    ctx.fillStyle = FOX_BODY_COLOR;
    ctx.beginPath();
    ctx.moveTo(x + width * 0.1, y + height);
    ctx.lineTo(x + width * 0.9, y + height);
    ctx.lineTo(x + width, y + height * 0.7);
    ctx.lineTo(x + width * 0.9, y);
    ctx.lineTo(x + width * 0.1, y);
    ctx.lineTo(x, y + height * 0.7);
    ctx.closePath();
    ctx.fill();

    // Head (previously defined)
    ctx.beginPath();
    ctx.arc(x + width * 0.5, y + height * 0.2, width * 0.4, 0, Math.PI * 2);
    ctx.fill();

    // Ears (previously defined)
    ctx.beginPath();
    ctx.moveTo(x + width * 0.2, y + height * 0.05);
    ctx.lineTo(x + width * 0.1, y - 5); 
    ctx.lineTo(x + width * 0.3, y - 5);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(x + width * 0.8, y + height * 0.05);
    ctx.lineTo(x + width * 0.7, y - 5);
    ctx.lineTo(x + width * 0.9, y - 5);
    ctx.closePath();
    ctx.fill();

    // Glasses
    ctx.fillStyle = GLASSES_COLOR;
    // Left lens frame
    ctx.fillRect(x + width * 0.3, y + height * 0.12, width * 0.15, height * 0.08); 
    // Right lens frame
    ctx.fillRect(x + width * 0.55, y + height * 0.12, width * 0.15, height * 0.08);
    // Bridge of nose
    ctx.fillRect(x + width * 0.45, y + height * 0.15, width * 0.1, 2);

    // Eyes (inside glasses)
    ctx.fillStyle = EYE_COLOR;
    ctx.beginPath();
    ctx.arc(x + width * 0.375, y + height * 0.16, 1.5, 0, Math.PI * 2); 
    ctx.arc(x + width * 0.625, y + height * 0.16, 1.5, 0, Math.PI * 2); 
    ctx.fill();

    // Nose (previously defined)
    ctx.beginPath();
    ctx.arc(x + width * 0.5, y + height * 0.25, 2, 0, Math.PI * 2); 
    ctx.fill();

    // Tail (previously defined)
    ctx.fillStyle = FOX_BODY_COLOR;
    ctx.beginPath();
    ctx.moveTo(x, y + height * 0.7);
    ctx.lineTo(x - 10, y + height * 0.5); 
    ctx.lineTo(x, y + height * 0.3);
    ctx.closePath();
    ctx.fill();

    // Clothes (a simple vest shape)
    ctx.fillStyle = CLOTHES_COLOR;
    ctx.beginPath();
    ctx.moveTo(x + width * 0.2, y + height * 0.5); // Top-left
    ctx.lineTo(x + width * 0.8, y + height * 0.5); // Top-right
    ctx.lineTo(x + width * 0.7, y + height * 0.85); // Bottom-right (slightly lower)
    ctx.lineTo(x + width * 0.3, y + height * 0.85); // Bottom-left (slightly lower)
    ctx.closePath();
    ctx.fill();

    // Simple legs animation (for running effect)
    // The 'runFrame' will create a subtle up/down movement
    let legOffset = Math.sin(runFrame * Math.PI * 2) * 2; // Sine wave for smooth motion
    
    ctx.fillStyle = FOX_BODY_COLOR; // Legs color
    // Front leg
    ctx.fillRect(x + width * 0.25, y + height * 0.9 + legOffset, 5, 10);
    // Back leg
    ctx.fillRect(x + width * 0.65, y + height * 0.9 - legOffset, 5, 10);
}


// === Game Classes ===

class Player {
    constructor() {
        this.width = BASE_FOX_WIDTH; 
        this.height = BASE_FOX_HEIGHT;
        this.x = LOGICAL_CANVAS_WIDTH * FOX_START_X_RATIO;
        this.y = LOGICAL_CANVAS_HEIGHT - LOGICAL_GROUND_Y_OFFSET - this.height; 
        this.velocityY = 0;
        this.jumps = 0;
        this.maxJumps = 2;
        this.runFrame = 0; // Current frame for running animation
        this.runSpeed = 0.1; // Speed of run animation
    }

    draw() {
        // Apply vertical animation based on jump state
        let drawY = this.y;
        if (this.velocityY !== 0 || this.y < LOGICAL_CANVAS_HEIGHT - LOGICAL_GROUND_Y_OFFSET - this.height) {
            // While jumping or falling, add a slight up/down bob
            drawY += Math.sin(Date.now() * 0.01) * 2; 
        }

        // Apply slight rotation for jump/fall effect
        ctx.save(); // Save current canvas state
        let rotationAngle = 0;
        if (this.velocityY < 0) { // Jumping up
            rotationAngle = -Math.PI / 30; // Slight backward tilt
        } else if (this.velocityY > 0 && this.y < LOGICAL_CANVAS_HEIGHT - LOGICAL_GROUND_Y_OFFSET - this.height - 5) { // Falling down
            rotationAngle = Math.PI / 30; // Slight forward tilt
        }
        ctx.translate(this.x + this.width / 2, drawY + this.height / 2);
        ctx.rotate(rotationAngle);
        drawFox(-this.width / 2, -this.height / 2, this.width, this.height, this.runFrame);
        ctx.restore(); // Restore canvas state

    }

    update() {
        this.y += this.velocityY;
        this.velocityY += BASE_GRAVITY; 

        if (this.y >= LOGICAL_CANVAS_HEIGHT - LOGICAL_GROUND_Y_OFFSET - this.height) {
            this.y = LOGICAL_CANVAS_HEIGHT - LOGICAL_GROUND_Y_OFFSET - this.height;
            this.velocityY = 0;
            this.jumps = 0;
            this.runFrame = (this.runFrame + this.runSpeed) % 1; // Update run frame
        } else {
            this.runFrame = 0; // Stop running animation in air
        }
    }

    jump() {
        if (this.jumps < this.maxJumps) {
            this.velocityY = BASE_JUMP_VELOCITY;
            this.jumps++;
            jumpSound.currentTime = 0;
            jumpSound.play().catch(e => console.log("Jump sound play failed:", e));
        }
    }
}

class Obstacle {
    constructor(type) {
        const typeData = BASE_OBSTACLE_TYPES.find(t => t.type === type);
        this.type = type;
        this.width = typeData.width;
        this.height = typeData.height;
        this.x = LOGICAL_CANVAS_WIDTH; 
        this.y = LOGICAL_CANVAS_HEIGHT - LOGICAL_GROUND_Y_OFFSET - this.height;
        if (typeData.yOffset) {
            this.y -= typeData.yOffset;
        }
        this.segments = typeData.segments || 1;
    }

    draw() {
        ctx.fillStyle = OBSTACLE_COLOR;
        if (this.type.includes('block')) {
            ctx.fillRect(this.x, this.y, this.width, this.height);
            ctx.strokeStyle = '#c62828';
            ctx.lineWidth = 2; 
            for (let i = 0; i < this.segments; i++) {
                ctx.strokeRect(this.x, this.y + (this.height / this.segments) * i, this.width, this.height / this.segments);
            }
        } else if (this.type.includes('flying')) {
            ctx.beginPath();
            ctx.moveTo(this.x, this.y + this.height * 0.5);
            ctx.lineTo(this.x + this.width * 0.5, this.y);
            ctx.lineTo(this.x + this.width, this.y + this.height * 0.5);
            ctx.lineTo(this.x + this.width * 0.5, this.y + this.height);
            ctx.closePath();
            ctx.fill();
        } else if (this.type.includes('stacked')) {
            const segmentHeight = this.height / this.segments;
            for (let i = 0; i < this.segments; i++) {
                ctx.fillRect(this.x, this.y + (segmentHeight * i), this.width, segmentHeight);
                ctx.strokeStyle = '#c62828';
                ctx.lineWidth = 2;
                ctx.strokeRect(this.x, this.y + (segmentHeight * i), this.width, segmentHeight);
            }
        }
    }

    update() {
        this.x -= gameSpeed;
    }
}

class Cloud {
    constructor() {
        this.width = BASE_CLOUD_WIDTH;
        this.height = BASE_CLOUD_HEIGHT;
        this.x = LOGICAL_CANVAS_WIDTH;
        this.y = Math.random() * (LOGICAL_CANVAS_HEIGHT / 2 - this.height);
        this.speed = BASE_GAME_SPEED * (0.2 + Math.random() * 0.4); 
    }

    draw() {
        ctx.fillStyle = CLOUD_COLOR;
        drawCloudShape(this.x, this.y, this.width, this.height);
    }

    update() {
        this.x -= this.speed;
    }
}

class Ground {
    constructor(x) {
        this.x = x; 
        this.y = LOGICAL_CANVAS_HEIGHT - LOGICAL_GROUND_Y_OFFSET;
        this.width = LOGICAL_CANVAS_WIDTH * 2; 
        this.height = LOGICAL_GROUND_Y_OFFSET; 
    }

    draw() {
        ctx.fillStyle = GROUND_COLOR;
        ctx.fillRect(this.x, this.y, this.width, this.height);
        ctx.fillStyle = GROUND_LINE_COLOR;
        for (let i = 0; i < this.width; i += (LOGICAL_CANVAS_WIDTH / 40)) {
            ctx.fillRect(this.x + i, this.y + 5, LOGICAL_CANVAS_WIDTH / 100, 2);
        }
    }

    update() {
        this.x -= gameSpeed;
        if (this.x + this.width < 0) {
            this.x = this.x + this.width * 2;
        }
    }
}

// === Scaling and Canvas Setup Functions ===

function calculateScaleFactor() {
    const dpr = window.devicePixelRatio || 1;
    
    const screenWidth = window.innerWidth;
    const screenHeight = window.innerHeight;

    let desiredCssWidth;
    let desiredCssHeight;

    const logicalAspectRatio = LOGICAL_CANVAS_WIDTH / LOGICAL_CANVAS_HEIGHT;

    // Mobile-first approach: Calculate based on screen width
    desiredCssWidth = screenWidth * 0.98; 

    // Calculate height based on width and maintain logical aspect ratio
    desiredCssHeight = desiredCssWidth / logicalAspectRatio;

    // If calculated height exceeds available screen height, cap it
    const maxAvailableHeight = screenHeight * 0.85; 
    if (desiredCssHeight > maxAvailableHeight) {
        desiredCssHeight = maxAvailableHeight;
        desiredCssWidth = desiredCssHeight * logicalAspectRatio;
    }

    // Cap width for desktop/larger screens
    const maxDesktopWidth = 600; 
    if (desiredCssWidth > maxDesktopWidth) {
        desiredCssWidth = maxDesktopWidth;
        desiredCssHeight = desiredCssWidth / logicalAspectRatio;
    }

    // Ensure minimum dimensions for very small screens
    if (desiredCssWidth < 250) desiredCssWidth = 250;
    if (desiredCssHeight < 75) desiredCssHeight = 75;


    // Set CSS dimensions for Canvas
    canvas.style.width = `${desiredCssWidth}px`;
    canvas.style.height = `${desiredCssHeight}px`;

    // Set actual Canvas resolution for HiDPI rendering
    canvas.width = Math.floor(desiredCssWidth * dpr);
    canvas.height = Math.floor(desiredCssHeight * dpr);

    // Scale the drawing context
    ctx.setTransform(1, 0, 0, 1, 0, 0); // Reset transform
    ctx.scale(dpr, dpr); // Scale for HiDPI rendering

    // Calculate scaleFactor for mapping logical dimensions to CSS dimensions
    scaleFactor = desiredCssWidth / LOGICAL_CANVAS_WIDTH;
    ctx.scale(scaleFactor, scaleFactor);


    console.log(`Viewport: ${screenWidth}x${screenHeight}`);
    console.log(`Desired CSS Canvas: ${desiredCssWidth.toFixed(2)}x${desiredCssHeight.toFixed(2)}`);
    console.log(`Actual Canvas Resolution (DPR): ${canvas.width}x${canvas.height}`);
    console.log(`Device Pixel Ratio (DPR): ${dpr}`);
    console.log(`Calculated Scale Factor: ${scaleFactor.toFixed(2)}`);
    console.log(`Logical Ground Y: ${LOGICAL_CANVAS_HEIGHT - LOGICAL_GROUND_Y_OFFSET}`);
}


// === Daily Limit System Functions ===
function checkDailyLimit() {
    const lastPlayTime = localStorage.getItem(DAILY_LIMIT_KEY);
    if (!lastPlayTime) {
        return { allowed: true };
    }

    const lastTime = parseInt(lastPlayTime, 10);
    const currentTime = Date.now();
    const elapsedTime = currentTime - lastTime;

    if (elapsedTime >= DAILY_LIMIT_DURATION) {
        return { allowed: true };
    } else {
        const remainingTime = DAILY_LIMIT_DURATION - elapsedTime;
        const hours = Math.floor(remainingTime / (1000 * 60 * 60));
        const minutes = Math.floor((remainingTime % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((remainingTime % (1000 * 60)) / 1000);
        return {
            allowed: false,
            remaining: `${hours}h ${minutes}m ${seconds}s`
        };
    }
}

function setDailyLimit() {
    localStorage.setItem(DAILY_LIMIT_KEY, Date.now().toString());
}

// === Main Game Functions ===

function initGame() {
    console.log("Initializing game...");
    const limitStatus = checkDailyLimit();

    if (!limitStatus.allowed) {
        dailyLimitTimeDisplay.textContent = limitStatus.remaining;
        dailyLimitScreen.style.display = 'flex';
        canvas.classList.add('game-over'); 
        return; 
    } else {
        dailyLimitScreen.style.display = 'none'; 
    }

    calculateScaleFactor();

    player = new Player();
    obstacles = [];
    clouds = [];
    score = 0;
    gameSpeed = BASE_GAME_SPEED;
    gameOver = false;
    currentScoreDisplay.textContent = score;
    highScoreDisplay.textContent = highScore;
    gameOverScreen.style.display = 'none';
    canvas.classList.remove('game-over'); 

    groundTiles = [];
    groundTiles.push(new Ground(0));
    groundTiles.push(new Ground(LOGICAL_CANVAS_WIDTH * 2)); 

    if (frameId) {
        cancelAnimationFrame(frameId);
    }
    gameLoop();
}

function generateObstacle() {
    const currentTime = Date.now();
    const lastObstacle = obstacles[obstacles.length - 1];
    const timeSinceLastObstacle = currentTime - lastObstacleTime;

    let requiredGap = Math.random() * (LOGICAL_CANVAS_WIDTH * BASE_OBSTACLE_MAX_GAP_LOGICAL - LOGICAL_CANVAS_WIDTH * BASE_OBSTACLE_MIN_GAP_LOGICAL) + LOGICAL_CANVAS_WIDTH * BASE_OBSTACLE_MIN_GAP_LOGICAL;
    requiredGap = requiredGap / (gameSpeed / BASE_GAME_SPEED);

    if (!lastObstacle || (LOGICAL_CANVAS_WIDTH - lastObstacle.x > requiredGap && timeSinceLastObstacle > 1000 / (gameSpeed * 0.8))) {
        let availableObstacleTypes = BASE_OBSTACLE_TYPES.filter(type => {
            return type.height <= LOGICAL_CANVAS_HEIGHT - LOGICAL_GROUND_Y_OFFSET + 5; 
        });

        if (availableObstacleTypes.length === 0) {
            console.warn("No suitable obstacle type found for current logical height. Skipping obstacle generation.");
            return;
        }

        const randomIndex = Math.floor(Math.random() * availableObstacleTypes.length);
        obstacles.push(new Obstacle(availableObstacleTypes[randomIndex].type));
        lastObstacleTime = currentTime;
    }
}

function generateCloud() {
    const currentTime = Date.now();
    const lastCloud = clouds[clouds.length - 1];
    const timeSinceLastCloud = currentTime - lastCloudTime;

    const requiredGap = Math.random() * (LOGICAL_CANVAS_WIDTH * BASE_CLOUD_MAX_GAP_LOGICAL - LOGICAL_CANVAS_WIDTH * BASE_CLOUD_MIN_GAP_LOGICAL) + LOGICAL_CANVAS_WIDTH * BASE_CLOUD_MIN_GAP_LOGICAL;

    if (!lastCloud || (LOGICAL_CANVAS_WIDTH - lastCloud.x > requiredGap && timeSinceLastCloud > 5000 / (gameSpeed / BASE_GAME_SPEED))) {
        clouds.push(new Cloud());
        lastCloudTime = currentTime;
    }
}

function updateGame() {
    if (gameOver) return;

    score++;
    currentScoreDisplay.textContent = Math.floor(score / 10);
    
    gameSpeed = BASE_GAME_SPEED + Math.floor(score / 1000) * 0.5;
    gameSpeed = Math.min(gameSpeed, BASE_GAME_SPEED + 10); 

    player.update();

    groundTiles.forEach(tile => tile.update());
    generateObstacle();
    generateCloud();

    obstacles.forEach((obstacle, index) => {
        obstacle.update();
        if (obstacle.x + obstacle.width < 0) {
            obstacles.splice(index, 1);
        }

        // Collision detection
        if (
            player.x < obstacle.x + obstacle.width &&
            player.x + player.width > obstacle.x &&
            player.y < obstacle.y + obstacle.height &&
            player.y + player.height > obstacle.y
        ) {
            endGame();
        }
    });

    clouds.forEach((cloud, index) => {
        cloud.update();
        if (cloud.x + cloud.width < 0) {
            clouds.splice(index, 1);
        }
    });
}

function drawGame() {
    ctx.clearRect(0, 0, LOGICAL_CANVAS_WIDTH, LOGICAL_CANVAS_HEIGHT); 

    clouds.forEach(cloud => cloud.draw());
    groundTiles.forEach(tile => tile.draw());
    player.draw();
    obstacles.forEach(obstacle => obstacle.draw());
}

function gameLoop() {
    updateGame();
    drawGame();
    if (!gameOver) {
        frameId = requestAnimationFrame(gameLoop);
    }
}

function endGame() {
    gameOver = true;
    hitSound.play().catch(e => console.log("Hit sound play failed:", e));
    setDailyLimit(); 

    const finalScore = Math.floor(score / 10);
    finalScoreDisplay.textContent = `امتیاز نهایی: ${finalScore}`;

    // Calculate discount
    let discountPercent = Math.floor(finalScore / 500) * DISCOUNT_PER_500_SCORE;
    discountPercent = Math.min(discountPercent, MAX_DISCOUNT_PERCENT); 

    if (discountPercent > 0) {
        discountInfoDisplay.textContent = `شما ${discountPercent.toFixed(1)}% کد تخفیف می‌گیرید!`;
    } else {
        discountInfoDisplay.textContent = `امتیاز شما به کد تخفیف نرسید. بیشتر تلاش کنید!`;
    }

    if (finalScore > highScore) {
        highScore = finalScore;
        localStorage.setItem('dinoHighScore', highScore);
        highScoreDisplay.textContent = highScore;
    }
    gameOverScreen.style.display = 'flex';
    canvas.classList.add('game-over');
    cancelAnimationFrame(frameId);
}

// === Event Handlers ===

window.addEventListener('resize', initGame);

document.addEventListener('keydown', (e) => {
    if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') {
        if (!gameOver) {
            player.jump();
        } else {
            initGame();
        }
    }
});

canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    if (!gameOver) {
        player.jump();
    } else {
        initGame();
    }
});

restartButton.addEventListener('click', () => {
    initGame();
});

closeLimitButton.addEventListener('click', () => {
    dailyLimitScreen.style.display = 'none';
});

// Initial game start
initGame();
