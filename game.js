const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const currentScoreDisplay = document.getElementById('currentScore');
const highScoreDisplay = document.getElementById('highScore');
const gameOverScreen = document.getElementById('gameOverScreen');
const finalScoreDisplay = document.getElementById('finalScore');
const restartButton = document.getElementById('restartButton');

// === متغیرهای بازی ===
let player;
let obstacles = [];
let clouds = [];
let groundTiles = [];
let score = 0;
let highScore = parseInt(localStorage.getItem('dinoHighScore') || '0', 10);
let gameSpeed = 4;
let gameOver = false;
let frameId;
let lastObstacleTime = 0;
let lastCloudTime = 0;

// === ابعاد پایه برای طراحی بازی (ابعاد منطقی) ===
// این ابعاد، ابعادی هستند که بازی بر اساس آنها "طراحی" شده است.
// این ابعاد را برای Mobile-First به 400x120 تغییر می‌دهیم.
const LOGICAL_CANVAS_WIDTH = 400;
const LOGICAL_CANVAS_HEIGHT = 120;
const LOGICAL_GROUND_Y_OFFSET = 15; // فاصله زمین از پایین در ابعاد منطقی

let currentLogicalCanvasWidth = LOGICAL_CANVAS_WIDTH; 
let currentLogicalCanvasHeight = LOGICAL_CANVAS_HEIGHT; 
let scaleFactor = 1; // ضریب مقیاس‌بندی از ابعاد منطقی به ابعاد واقعی Canvas

// === تنظیمات عمومی (بر اساس ابعاد منطقی) ===
const BASE_JUMP_VELOCITY = -5.5; // سرعت پرش کمتر برای ابعاد کوچکتر
const BASE_GRAVITY = 0.3; // جاذبه کمتر برای ابعاد کوچکتر
const BASE_GAME_SPEED = 3; // سرعت پایه بازی کمتر برای ابعاد کوچکتر

// === تنظیمات شخصیت (روباه - بر اساس ابعاد منطقی) ===
const BASE_FOX_WIDTH = 25; // عرض روباه کوچک‌تر
const BASE_FOX_HEIGHT = 30; // ارتفاع روباه کوچک‌تر
const FOX_START_X_RATIO = 0.08; 

// === تنظیمات موانع (بر اساس ابعاد منطقی) ===
const BASE_OBSTACLE_MIN_GAP_RATIO = 0.4; // فاصله موانع کمی بیشتر
const BASE_OBSTACLE_MAX_GAP_RATIO = 0.7;
const OBSTACLE_COLOR = '#ff1744';

const BASE_OBSTACLE_TYPES = [
    { type: 'block_low', width: 15, height: 25 }, // ابعاد موانع کوچک‌تر
    { type: 'block_high', width: 15, height: 40 },
    { type: 'flying_low', width: 25, height: 15, yOffset: 20 }, // پرنده پایین
    { type: 'flying_mid', width: 25, height: 15, yOffset: 35 }, // پرنده میانی
    { type: 'stacked_2', width: 15, height: 50, segments: 2 }, // دو بلوک روی هم
    { type: 'stacked_3', width: 15, height: 65, segments: 3 } // سه بلوک روی هم
];

// === تنظیمات ابرها (بر اساس ابعاد منطقی) ===
const BASE_CLOUD_WIDTH = 40;
const BASE_CLOUD_HEIGHT = 15;
const CLOUD_COLOR = '#b0bec5';
const BASE_CLOUD_MIN_GAP_RATIO = 0.3;
const BASE_CLOUD_MAX_GAP_RATIO = 0.8;

// === تنظیمات زمین (بر اساس ابعاد منطقی) ===
const GROUND_COLOR = '#555';
const GROUND_LINE_COLOR = '#666';


// === صداها (اگر فایل mp3 ها در پوشه assets باشند) ===
const jumpSound = new Audio('assets/jump.mp3');
const hitSound = new Audio('assets/hit.mp3');

// === توابع کمکی برای رسم اشکال هندسی ===

function drawCloudShape(x, y, width, height) {
    ctx.beginPath();
    ctx.arc(x, y + height / 2, height / 2, 0, Math.PI * 2);
    ctx.arc(x + width * 0.3, y + height * 0.3, height * 0.6, 0, Math.PI * 2);
    ctx.arc(x + width * 0.7, y + height * 0.4, height * 0.7, 0, Math.PI * 2);
    ctx.arc(x + width, y + height / 2, height / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.closePath();
}

function drawFox(x, y, width, height) {
    const FOX_COLOR = '#ff9800';

    ctx.fillStyle = FOX_COLOR;

    // بدن
    ctx.beginPath();
    ctx.moveTo(x + width * 0.1, y + height);
    ctx.lineTo(x + width * 0.9, y + height);
    ctx.lineTo(x + width, y + height * 0.7);
    ctx.lineTo(x + width * 0.9, y);
    ctx.lineTo(x + width * 0.1, y);
    ctx.lineTo(x, y + height * 0.7);
    ctx.closePath();
    ctx.fill();

    // سر
    ctx.beginPath();
    ctx.arc(x + width * 0.5, y + height * 0.2, width * 0.4, 0, Math.PI * 2);
    ctx.fill();

    // گوش‌ها
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

    // چشم‌ها
    ctx.fillStyle = 'black';
    ctx.beginPath();
    ctx.arc(x + width * 0.4, y + height * 0.15, 2, 0, Math.PI * 2); 
    ctx.arc(x + width * 0.6, y + height * 0.15, 2, 0, Math.PI * 2); 
    ctx.fill();

    // بینی
    ctx.beginPath();
    ctx.arc(x + width * 0.5, y + height * 0.25, 2, 0, Math.PI * 2); 
    ctx.fill();

    // دم
    ctx.fillStyle = FOX_COLOR;
    ctx.beginPath();
    ctx.moveTo(x, y + height * 0.7);
    ctx.lineTo(x - 10, y + height * 0.5); 
    ctx.lineTo(x, y + height * 0.3);
    ctx.closePath();
    ctx.fill();
}


// === کلاس‌ها ===

class Player {
    constructor() {
        this.width = BASE_FOX_WIDTH; 
        this.height = BASE_FOX_HEIGHT;
        this.x = LOGICAL_CANVAS_WIDTH * FOX_START_X_RATIO;
        this.y = LOGICAL_CANVAS_HEIGHT - LOGICAL_GROUND_Y_OFFSET - this.height; 
        this.velocityY = 0;
        this.jumps = 0;
        this.maxJumps = 2;
    }

    draw() {
        drawFox(this.x, this.y, this.width, this.height);
    }

    update() {
        this.y += this.velocityY;
        this.velocityY += BASE_GRAVITY; 

        if (this.y >= LOGICAL_CANVAS_HEIGHT - LOGICAL_GROUND_Y_OFFSET - this.height) {
            this.y = LOGICAL_CANVAS_HEIGHT - LOGICAL_GROUND_Y_OFFSET - this.height;
            this.velocityY = 0;
            this.jumps = 0;
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

// === توابع مقیاس‌بندی و تنظیم Canvas ===

function calculateScaleFactor() {
    const dpr = window.devicePixelRatio || 1;
    
    const screenWidth = window.innerWidth;
    const screenHeight = window.innerHeight;

    // حداکثر ابعاد CSS که canvas می‌تواند اشغال کند
    // این مقادیر از CSS max-width/height هم تبعیت می‌کنند
    let maxCssWidth = screenWidth * 0.98; 
    let maxCssHeight = screenHeight * 0.90; 

    // اگر ارتفاع viewport خیلی کم باشد (مثل حالت افقی موبایل با کیبورد باز)
    // ارتفاع maxCssHeight را بیشتر کاهش می‌دهیم
    if (screenHeight < 300) { // اگر ارتفاع صفحه خیلی کم بود
        maxCssHeight = screenHeight * 0.80; 
    }

    let desiredCssWidth;
    let desiredCssHeight;

    const logicalAspectRatio = LOGICAL_CANVAS_WIDTH / LOGICAL_CANVAS_HEIGHT;

    // رویکرد Mobile-First: ابتدا بر اساس عرض صفحه محاسبه می‌کنیم
    desiredCssWidth = maxCssWidth;
    desiredCssHeight = desiredCssWidth / logicalAspectRatio;

    // اگر ارتفاع محاسبه شده از حداکثر ارتفاع مجاز بیشتر بود، بر اساس ارتفاع محدود می‌کنیم
    if (desiredCssHeight > maxCssHeight) {
        desiredCssHeight = maxCssHeight;
        desiredCssWidth = desiredCssHeight * logicalAspectRatio;
    }

    // اطمینان از حداقل ابعاد برای صفحه‌های خیلی کوچک (مثلاً 250x75)
    if (desiredCssWidth < 250) desiredCssWidth = 250;
    if (desiredCssHeight < 75) desiredCssHeight = 75;


    // تنظیم ابعاد بصری Canvas (CSS)
    canvas.style.width = `${desiredCssWidth}px`;
    canvas.style.height = `${desiredCssHeight}px`;

    // تنظیم ابعاد واقعی Canvas برای رندر HiDPI
    // این ابعاد، فضایی را تعریف می‌کند که `ctx` در آن رسم می‌کند
    canvas.width = Math.floor(desiredCssWidth * dpr);
    canvas.height = Math.floor(desiredCssHeight * dpr);

    // مقیاس‌بندی کانتکس رسم
    // هر بار که calculateScaleFactor فراخوانی می‌شود، context را reset می‌کنیم
    ctx.setTransform(1, 0, 0, 1, 0, 0); // Reset transform
    ctx.scale(dpr, dpr); // مقیاس‌بندی برای رندر HiDPI

    // محاسبه scaleFactor برای نگاشت از ابعاد منطقی به ابعاد CSS
    // این مقیاس، عامل اصلی است که تمامی Draw ها را تحت تاثیر قرار می دهد.
    scaleFactor = desiredCssWidth / LOGICAL_CANVAS_WIDTH;
    ctx.scale(scaleFactor, scaleFactor); // مقیاس‌بندی از ابعاد منطقی به ابعاد CSS


    console.log(`Viewport: ${screenWidth}x${screenHeight}`);
    console.log(`Desired CSS Canvas: ${desiredCssWidth.toFixed(2)}x${desiredCssHeight.toFixed(2)}`);
    console.log(`Actual Canvas Resolution (DPR): ${canvas.width}x${canvas.height}`);
    console.log(`Device Pixel Ratio (DPR): ${dpr}`);
    console.log(`Calculated Scale Factor: ${scaleFactor.toFixed(2)}`);
    console.log(`Logical Ground Y: ${LOGICAL_CANVAS_HEIGHT - LOGICAL_GROUND_Y_OFFSET}`);
}


function initGame() {
    console.log("Initializing game...");
    calculateScaleFactor(); // محاسبه و اعمال مقیاس‌بندی در ابتدا

    player = new Player();
    obstacles = [];
    clouds = [];
    score = 0;
    // سرعت بازی، بر اساس سرعت پایه منطقی است
    gameSpeed = BASE_GAME_SPEED;
    gameOver = false;
    currentScoreDisplay.textContent = score;
    highScoreDisplay.textContent = highScore;
    gameOverScreen.style.display = 'none';

    // ایجاد تایل‌های زمین - با ابعاد منطقی
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

    let requiredGap = Math.random() * (LOGICAL_CANVAS_WIDTH * BASE_OBSTACLE_MAX_GAP_RATIO - LOGICAL_CANVAS_WIDTH * BASE_OBSTACLE_MIN_GAP_RATIO) + LOGICAL_CANVAS_WIDTH * BASE_OBSTACLE_MIN_GAP_RATIO;
    requiredGap = requiredGap / (gameSpeed / BASE_GAME_SPEED);

    if (!lastObstacle || (LOGICAL_CANVAS_WIDTH - lastObstacle.x > requiredGap && timeSinceLastObstacle > 1000 / (gameSpeed * 0.8))) {
        let availableObstacleTypes = BASE_OBSTACLE_TYPES.filter(type => {
            return type.height <= LOGICAL_CANVAS_HEIGHT - LOGICAL_GROUND_Y_OFFSET + 5; // کمی فاصله از زمین منطقی
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

    const requiredGap = Math.random() * (LOGICAL_CANVAS_WIDTH * BASE_CLOUD_MAX_GAP_RATIO - LOGICAL_CANVAS_WIDTH * BASE_CLOUD_MIN_GAP_RATIO) + LOGICAL_CANVAS_WIDTH * BASE_CLOUD_MIN_GAP_RATIO;

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

        // تشخیص برخورد (AABB collision detection) - در فضای منطقی
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
    // پاک کردن بوم با ابعاد واقعی Canvas (قبل از scale)
    ctx.clearRect(0, 0, canvas.width / (window.devicePixelRatio || 1), canvas.height / (window.devicePixelRatio || 1)); 

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

    const finalScore = Math.floor(score / 10);
    finalScoreDisplay.textContent = `امتیاز نهایی: ${finalScore}`;

    if (finalScore > highScore) {
        highScore = finalScore;
        localStorage.setItem('dinoHighScore', highScore);
        highScoreDisplay.textContent = highScore;
    }
    gameOverScreen.style.display = 'flex';
    cancelAnimationFrame(frameId);
}

// === مدیریت رویدادها ===

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

// شروع اولیه بازی
initGame();
