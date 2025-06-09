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

// === ابعاد پایه برای مقیاس‌بندی ===
// این ابعاد، ابعادی هستند که بازی بر اساس آنها طراحی شده است.
// تمام مقادیر دیگر بازی (سرعت، اندازه شخصیت، موانع و ...)
// بر اساس این ابعاد مقیاس‌بندی خواهند شد.
const BASE_CANVAS_WIDTH = 800;
const BASE_CANVAS_HEIGHT = 200;

let currentCanvasWidth = BASE_CANVAS_WIDTH;
let currentCanvasHeight = BASE_CANVAS_HEIGHT;
let scaleFactor = 1; // ضریب مقیاس‌بندی
let GROUND_Y = BASE_CANVAS_HEIGHT - 20; // ارتفاع زمین در ابعاد پایه

// === تنظیمات عمومی ===
const BASE_JUMP_VELOCITY = -10;
const BASE_GRAVITY = 0.5;
const BASE_GAME_SPEED = 4; // سرعت پایه بازی

// === تنظیمات شخصیت (روباه) ===
const BASE_FOX_WIDTH = 40;
const BASE_FOX_HEIGHT = 45;
const FOX_START_X_RATIO = 0.06; // موقعیت X بر اساس نسبت عرض بوم

// === تنظیمات موانع ===
const BASE_OBSTACLE_MIN_GAP_RATIO = 0.3;
const BASE_OBSTACLE_MAX_GAP_RATIO = 0.5;
const OBSTACLE_COLOR = '#ff1744';

const BASE_OBSTACLE_TYPES = [
    { type: 'block_low', width: 25, height: 40 },
    { type: 'block_high', width: 25, height: 60 },
    { type: 'flying_low', width: 40, height: 20, yOffset: 30 },
    { type: 'flying_mid', width: 40, height: 20, yOffset: 55 },
    { type: 'stacked_2', width: 25, height: 70, segments: 2 },
    { type: 'stacked_3', width: 25, height: 90, segments: 3 }
];

// === تنظیمات ابرها ===
const BASE_CLOUD_WIDTH = 60;
const BASE_CLOUD_HEIGHT = 20;
const CLOUD_COLOR = '#b0bec5';
const BASE_CLOUD_MIN_GAP_RATIO = 0.2;
const BASE_CLOUD_MAX_GAP_RATIO = 0.6;

// === تنظیمات زمین ===
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
    const FOX_COLOR = '#ff9800'; // نارنجی برای روباه

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
    ctx.lineTo(x + width * 0.1, y - 5 * scaleFactor);
    ctx.lineTo(x + width * 0.3, y - 5 * scaleFactor);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(x + width * 0.8, y + height * 0.05);
    ctx.lineTo(x + width * 0.7, y - 5 * scaleFactor);
    ctx.lineTo(x + width * 0.9, y - 5 * scaleFactor);
    ctx.closePath();
    ctx.fill();

    // چشم‌ها
    ctx.fillStyle = 'black';
    ctx.beginPath();
    ctx.arc(x + width * 0.4, y + height * 0.15, 2 * scaleFactor, 0, Math.PI * 2);
    ctx.arc(x + width * 0.6, y + height * 0.15, 2 * scaleFactor, 0, Math.PI * 2);
    ctx.fill();

    // بینی
    ctx.beginPath();
    ctx.arc(x + width * 0.5, y + height * 0.25, 2 * scaleFactor, 0, Math.PI * 2);
    ctx.fill();

    // دم
    ctx.fillStyle = FOX_COLOR;
    ctx.beginPath();
    ctx.moveTo(x, y + height * 0.7);
    ctx.lineTo(x - 10 * scaleFactor, y + height * 0.5);
    ctx.lineTo(x, y + height * 0.3);
    ctx.closePath();
    ctx.fill();
}


// === کلاس‌ها ===

class Player {
    constructor() {
        this.width = BASE_FOX_WIDTH * scaleFactor;
        this.height = BASE_FOX_HEIGHT * scaleFactor;
        this.x = currentCanvasWidth * FOX_START_X_RATIO;
        this.y = GROUND_Y - this.height;
        this.velocityY = 0;
        this.jumps = 0;
        this.maxJumps = 2;
    }

    draw() {
        drawFox(this.x, this.y, this.width, this.height);
    }

    update() {
        this.y += this.velocityY;
        this.velocityY += BASE_GRAVITY * scaleFactor;

        if (this.y >= GROUND_Y - this.height) {
            this.y = GROUND_Y - this.height;
            this.velocityY = 0;
            this.jumps = 0;
        }
    }

    jump() {
        if (this.jumps < this.maxJumps) {
            this.velocityY = BASE_JUMP_VELOCITY * scaleFactor;
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
        this.width = typeData.width * scaleFactor;
        this.height = typeData.height * scaleFactor;
        this.x = currentCanvasWidth;
        this.y = GROUND_Y - this.height;
        if (typeData.yOffset) {
            this.y -= typeData.yOffset * scaleFactor;
        }
        this.segments = typeData.segments || 1;
    }

    draw() {
        ctx.fillStyle = OBSTACLE_COLOR;
        if (this.type.includes('block')) {
            ctx.fillRect(this.x, this.y, this.width, this.height);
            ctx.strokeStyle = '#c62828';
            ctx.lineWidth = 2 * scaleFactor;
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
                ctx.lineWidth = 2 * scaleFactor;
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
        this.width = BASE_CLOUD_WIDTH * scaleFactor;
        this.height = BASE_CLOUD_HEIGHT * scaleFactor;
        this.x = currentCanvasWidth;
        this.y = Math.random() * (currentCanvasHeight / 2 - this.height);
        this.speed = gameSpeed * (0.2 + Math.random() * 0.4);
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
        this.y = GROUND_Y;
        this.width = currentCanvasWidth * 2;
        this.height = currentCanvasHeight - GROUND_Y;
    }

    draw() {
        ctx.fillStyle = GROUND_COLOR;
        ctx.fillRect(this.x, this.y, this.width, this.height);
        ctx.fillStyle = GROUND_LINE_COLOR;
        for (let i = 0; i < this.width; i += (currentCanvasWidth / 40)) {
            ctx.fillRect(this.x + i, this.y + 5 * scaleFactor, currentCanvasWidth / 100, 2 * scaleFactor);
        }
    }

    update() {
        this.x -= gameSpeed;
        if (this.x + this.width < 0) {
            this.x = this.x + this.width * 2;
        }
    }
}

// === توابع اصلی بازی ===

// تابع برای تنظیم ابعاد Canvas بر اساس ابعاد صفحه نمایش و حالت عمودی/افقی
function resizeCanvas() {
    const dpr = window.devicePixelRatio || 1; // Device Pixel Ratio برای نمایشگرهای HiDPI

    // ابعاد پیشنهادی برای Web App تلگرام (تقریباً تمام عرض)
    // برای حالت عمودی: عرض، 95% عرض Viewport. ارتفاع، نسبت به عرض.
    // برای حالت افقی: عرض، حداکثر 800px. ارتفاع، نسبت به عرض.
    let targetWidth;
    let targetHeight;

    const maxCanvasWidth = 800; // حداکثر عرض مجاز برای دسکتاپ/افقی
    const maxCanvasHeight = 200; // حداکثر ارتفاع مجاز برای دسکتاپ/افقی

    const screenWidth = window.innerWidth;
    const screenHeight = window.innerHeight;

    // تشخیص حالت عمودی یا افقی
    if (screenWidth < screenHeight) { // حالت عمودی گوشی
        targetWidth = screenWidth * 0.95; // 95% عرض صفحه
        targetHeight = targetWidth / (BASE_CANVAS_WIDTH / BASE_CANVAS_HEIGHT); // حفظ نسبت ابعاد
        // اگر ارتفاع محاسبه شده خیلی زیاد بود، محدودش کن (مثلاً تا 70% ارتفاع صفحه)
        if (targetHeight > screenHeight * 0.70) {
            targetHeight = screenHeight * 0.70;
            targetWidth = targetHeight * (BASE_CANVAS_WIDTH / BASE_CANVAS_HEIGHT);
        }
    } else { // حالت افقی گوشی یا دسکتاپ
        targetWidth = Math.min(maxCanvasWidth, screenWidth * 0.95);
        targetHeight = targetWidth / (BASE_CANVAS_WIDTH / BASE_CANVAS_HEIGHT);
        // اگر ارتفاع محاسبه شده خیلی زیاد بود، محدودش کن (مثلاً تا 80% ارتفاع صفحه)
        if (targetHeight > screenHeight * 0.80) {
             targetHeight = screenHeight * 0.80;
             targetWidth = targetHeight * (BASE_CANVAS_WIDTH / BASE_CANVAS_HEIGHT);
        }
    }

    // اطمینان از اینکه ابعاد حداقل مقدار منطقی را داشته باشند
    if (targetWidth < 300) targetWidth = 300; // حداقل عرض قابل بازی
    if (targetHeight < 75) targetHeight = 75; // حداقل ارتفاع قابل بازی

    currentCanvasWidth = Math.floor(targetWidth);
    currentCanvasHeight = Math.floor(targetHeight);

    // تنظیم ابعاد بصری Canvas
    canvas.style.width = `${currentCanvasWidth}px`;
    canvas.style.height = `${currentCanvasHeight}px`;

    // تنظیم ابعاد واقعی Canvas برای رندر HiDPI
    canvas.width = currentCanvasWidth * dpr;
    canvas.height = currentCanvasHeight * dpr;
    ctx.scale(dpr, dpr); // مقیاس‌بندی کانتکس رسم برای جبران dpr

    // محاسبه فاکتور مقیاس‌بندی جدید بر اساس عرض فعلی نسبت به عرض پایه
    scaleFactor = currentCanvasWidth / BASE_CANVAS_WIDTH;

    // تنظیم مجدد GROUND_Y بر اساس ارتفاع مقیاس‌بندی شده
    // 20 پیکسل در BASE_CANVAS_HEIGHT، حالا با scaleFactor متناسب میشه
    GROUND_Y = currentCanvasHeight - (20 * scaleFactor);

    // بازنشانی و مقیاس‌بندی مجدد عناصر بازی
    if (player) {
        player.width = BASE_FOX_WIDTH * scaleFactor;
        player.height = BASE_FOX_HEIGHT * scaleFactor;
        player.x = currentCanvasWidth * FOX_START_X_RATIO; // موقعیت X بازیکن همیشه یک نسبت از عرض بوم باشه
        player.y = GROUND_Y - player.height;
        player.velocityY = 0; // ریست سرعت عمودی
    }
    
    // موانع، ابرها و زمین رو ریست می‌کنیم تا با ابعاد جدید تولید و رندر بشن
    obstacles = [];
    clouds = [];
    groundTiles = [];
    groundTiles.push(new Ground(0));
    groundTiles.push(new Ground(groundTiles[0].width));
}


function initGame() {
    resizeCanvas(); // تنظیم ابعاد در شروع و در صورت تغییر اندازه صفحه

    player = new Player();
    obstacles = [];
    clouds = [];
    score = 0;
    // سرعت اولیه بازی متناسب با مقیاس، برای حفظ حس بازی در ابعاد مختلف
    gameSpeed = BASE_GAME_SPEED * scaleFactor;
    gameOver = false;
    currentScoreDisplay.textContent = score;
    highScoreDisplay.textContent = highScore;
    gameOverScreen.style.display = 'none';

    if (frameId) {
        cancelAnimationFrame(frameId);
    }
    gameLoop();
}

function generateObstacle() {
    const currentTime = Date.now();
    const lastObstacle = obstacles[obstacles.length - 1];
    const timeSinceLastObstacle = currentTime - lastObstacleTime;

    // فواصل موانع هم باید با scaleFactor متناسب بشن
    let requiredGap = Math.random() * (currentCanvasWidth * BASE_OBSTACLE_MAX_GAP_RATIO - currentCanvasWidth * BASE_OBSTACLE_MIN_GAP_RATIO) + currentCanvasWidth * BASE_OBSTACLE_MIN_GAP_RATIO;
    requiredGap = requiredGap / (gameSpeed / BASE_GAME_SPEED); // کاهش فاصله با افزایش سرعت

    if (!lastObstacle || (currentCanvasWidth - lastObstacle.x > requiredGap && timeSinceLastObstacle > 1000 / (gameSpeed * 0.8 / scaleFactor))) {
        let availableObstacleTypes = BASE_OBSTACLE_TYPES.filter(type => {
            // اطمینان از اینکه موانع خیلی بلند از ارتفاع بوم بیرون نزنند
            return (type.height * scaleFactor) <= currentCanvasHeight - GROUND_Y + (10 * scaleFactor);
        });

        if (availableObstacleTypes.length === 0) return; // اگر مانع مناسبی نبود، تولید نکن

        const randomIndex = Math.floor(Math.random() * availableObstacleTypes.length);
        obstacles.push(new Obstacle(availableObstacleTypes[randomIndex].type));
        lastObstacleTime = currentTime;
    }
}

function generateCloud() {
    const currentTime = Date.now();
    const lastCloud = clouds[clouds.length - 1];
    const timeSinceLastCloud = currentTime - lastCloudTime;

    const requiredGap = Math.random() * (currentCanvasWidth * BASE_CLOUD_MAX_GAP_RATIO - currentCanvasWidth * BASE_CLOUD_MIN_GAP_RATIO) + currentCanvasWidth * BASE_CLOUD_MIN_GAP_RATIO;

    if (!lastCloud || (currentCanvasWidth - lastCloud.x > requiredGap && timeSinceLastCloud > 5000 / (gameSpeed / BASE_GAME_SPEED / scaleFactor))) {
        clouds.push(new Cloud());
        lastCloudTime = currentTime;
    }
}

function updateGame() {
    if (gameOver) return;

    score++;
    currentScoreDisplay.textContent = Math.floor(score / 10);
    
    // افزایش سرعت بازی: هر 1000 امتیاز (واقعی)، سرعت 0.5 واحد افزایش پیدا می‌کنه
    // این افزایش سرعت هم باید مقیاس‌بندی بشه
    gameSpeed = (BASE_GAME_SPEED + Math.floor(score / 1000) * 0.5) * scaleFactor;
    gameSpeed = Math.min(gameSpeed, (BASE_GAME_SPEED + 10) * scaleFactor); // محدود کردن حداکثر سرعت

    player.update();

    groundTiles.forEach(tile => tile.update());
    generateObstacle();
    generateCloud();

    obstacles.forEach((obstacle, index) => {
        obstacle.update();
        if (obstacle.x + obstacle.width < 0) {
            obstacles.splice(index, 1);
        }

        // تشخیص برخورد (AABB collision detection)
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
    ctx.clearRect(0, 0, currentCanvasWidth, currentCanvasHeight); // پاک کردن بوم

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

// گوش دادن به تغییرات اندازه صفحه برای واکنش‌گرایی
window.addEventListener('resize', initGame);

// مدیریت ورودی (کیبورد و لمس)
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
