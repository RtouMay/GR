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
let gameSpeed = 4; // سرعت اولیه بازی
let gameOver = false;
let frameId;
let lastObstacleTime = 0;
let lastCloudTime = 0;
let initialCanvasWidth = 800; // عرض اولیه برای محاسبات تناسبی
let initialCanvasHeight = 200; // ارتفاع اولیه برای محاسبات تناسبی
let CANVAS_WIDTH = initialCanvasWidth; // عرض فعلی بوم
let CANVAS_HEIGHT = initialCanvasHeight; // ارتفاع فعلی بوم
let GROUND_Y = CANVAS_HEIGHT - 20; // ارتفاع زمین، بر اساس CANVAS_HEIGHT

// === تنظیمات عمومی ===
const JUMP_VELOCITY = -10;
const GRAVITY = 0.5;
const BASE_SPEED = 4; // سرعت پایه بازی

// === تنظیمات شخصیت (روباه) ===
const FOX_WIDTH = 40;
const FOX_HEIGHT = 45;
const FOX_START_X_RATIO = 0.06; // موقعیت اولیه X بر اساس نسبت عرض بوم
const FOX_COLOR = '#ff9800'; // نارنجی برای روباه

// === تنظیمات موانع ===
const OBSTACLE_MIN_GAP_RATIO = 0.3; // حداقل فاصله بین موانع بر اساس نسبت عرض بوم
const OBSTACLE_MAX_GAP_RATIO = 0.5; // حداکثر فاصله بین موانع بر اساس نسبت عرض بوم
const OBSTACLE_COLOR = '#ff1744'; // قرمز برای موانع

const OBSTACLE_TYPES = [
    { type: 'block_low', width: 25, height: 40 },
    { type: 'block_high', width: 25, height: 60 },
    { type: 'flying_low', width: 40, height: 20, yOffset: 30 }, // پرنده پایین
    { type: 'flying_mid', width: 40, height: 20, yOffset: 55 }, // پرنده میانی
    { type: 'stacked_2', width: 25, height: 70, segments: 2 }, // دو بلوک روی هم
    { type: 'stacked_3', width: 25, height: 90, segments: 3 } // سه بلوک روی هم (فقط اگر ارتفاع بوم اجازه بده)
];

// === تنظیمات ابرها ===
const CLOUD_WIDTH = 60;
const CLOUD_HEIGHT = 20;
const CLOUD_COLOR = '#b0bec5';
const CLOUD_MIN_GAP_RATIO = 0.2; // حداقل فاصله بین ابرها بر اساس نسبت عرض بوم
const CLOUD_MAX_GAP_RATIO = 0.6; // حداکثر فاصله بین ابرها بر اساس نسبت عرض بوم

// === تنظیمات زمین ===
const GROUND_COLOR = '#555'; // رنگ زمین
const GROUND_LINE_COLOR = '#666'; // رنگ خطوط زمین

// === صداها (اگر فایل mp3 ها در پوشه assets باشند) ===
const jumpSound = new Audio('assets/jump.mp3');
const hitSound = new Audio('assets/hit.mp3');

// === توابع کمکی ===

// تابع برای رسم اشکال هندسی ابر
function drawCloudShape(x, y, width, height) {
    ctx.beginPath();
    ctx.arc(x, y + height / 2, height / 2, 0, Math.PI * 2);
    ctx.arc(x + width * 0.3, y + height * 0.3, height * 0.6, 0, Math.PI * 2);
    ctx.arc(x + width * 0.7, y + height * 0.4, height * 0.7, 0, Math.PI * 2);
    ctx.arc(x + width, y + height / 2, height / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.closePath();
}

// تابع برای رسم شخصیت روباه (هندسی)
function drawFox(x, y, width, height) {
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

    // سر (تقریباً دایره)
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

    // دم (ساده)
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
        this.width = FOX_WIDTH;
        this.height = FOX_HEIGHT;
        this.x = CANVAS_WIDTH * FOX_START_X_RATIO;
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
        this.velocityY += GRAVITY;

        if (this.y >= GROUND_Y - this.height) {
            this.y = GROUND_Y - this.height;
            this.velocityY = 0;
            this.jumps = 0;
        }
    }

    jump() {
        if (this.jumps < this.maxJumps) {
            this.velocityY = JUMP_VELOCITY;
            this.jumps++;
            jumpSound.currentTime = 0;
            jumpSound.play().catch(e => console.log("Jump sound play failed:", e));
        }
    }
}

class Obstacle {
    constructor(type) {
        const typeData = OBSTACLE_TYPES.find(t => t.type === type);
        this.type = type;
        this.width = typeData.width;
        this.height = typeData.height;
        this.x = CANVAS_WIDTH;
        this.y = GROUND_Y - this.height;
        if (typeData.yOffset) {
            this.y -= typeData.yOffset;
        }
        this.segments = typeData.segments || 1; // برای موانع ترکیبی
    }

    draw() {
        ctx.fillStyle = OBSTACLE_COLOR;
        if (this.type.includes('block')) {
            // بلوک‌های زمینی
            ctx.fillRect(this.x, this.y, this.width, this.height);
            // جزئیات (مثلاً خطوط روی بلوک)
            ctx.strokeStyle = '#c62828'; // قرمز تیره‌تر
            ctx.lineWidth = 2;
            for (let i = 0; i < this.segments; i++) {
                ctx.strokeRect(this.x, this.y + (this.height / this.segments) * i, this.width, this.height / this.segments);
            }
        } else if (this.type.includes('flying')) {
            // موانع پرنده
            ctx.beginPath();
            ctx.moveTo(this.x, this.y + this.height * 0.5);
            ctx.lineTo(this.x + this.width * 0.5, this.y);
            ctx.lineTo(this.x + this.width, this.y + this.height * 0.5);
            ctx.lineTo(this.x + this.width * 0.5, this.y + this.height);
            ctx.closePath();
            ctx.fill();
        } else if (this.type.includes('stacked')) {
            // موانع ترکیبی
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
        this.width = CLOUD_WIDTH;
        this.height = CLOUD_HEIGHT;
        this.x = CANVAS_WIDTH;
        this.y = Math.random() * (CANVAS_HEIGHT / 2 - this.height);
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
        this.width = CANVAS_WIDTH * 2; // عرض زمین رو برای پوشش دهی کافی بزرگ می‌کنیم
        this.height = CANVAS_HEIGHT - GROUND_Y;
    }

    draw() {
        ctx.fillStyle = GROUND_COLOR;
        ctx.fillRect(this.x, this.y, this.width, this.height);
        // خطوط راهرو روی زمین
        ctx.fillStyle = GROUND_LINE_COLOR;
        for (let i = 0; i < this.width; i += (CANVAS_WIDTH / 40)) { // خطوط متناسب با عرض بوم
            ctx.fillRect(this.x + i, this.y + 5, CANVAS_WIDTH / 100, 2); // ضخامت و طول خطوط
        }
    }

    update() {
        this.x -= gameSpeed;
        if (this.x + this.width < 0) {
            this.x = this.x + this.width * 2; // تایل رو به انتهای مجموعه بفرست
        }
    }
}

// === توابع اصلی بازی ===

// تابع برای تنظیم ابعاد Canvas بر اساس ابعاد صفحه نمایش
function resizeCanvas() {
    // حداکثر عرض 800px یا 95% عرض صفحه
    const maxAllowedWidth = Math.min(800, window.innerWidth * 0.95);
    // حداکثر ارتفاع 200px یا 80% ارتفاع صفحه
    const maxAllowedHeight = Math.min(200, window.innerHeight * 0.8);

    // نسبت ارتفاع به عرض ثابت نگه داشته شود
    const aspectRatio = initialCanvasWidth / initialCanvasHeight;

    let newWidth = maxAllowedWidth;
    let newHeight = newWidth / aspectRatio;

    if (newHeight > maxAllowedHeight) {
        newHeight = maxAllowedHeight;
        newWidth = newHeight * aspectRatio;
    }

    CANVAS_WIDTH = Math.floor(newWidth);
    CANVAS_HEIGHT = Math.floor(newHeight);

    canvas.width = CANVAS_WIDTH;
    canvas.height = CANVAS_HEIGHT;
    GROUND_Y = CANVAS_HEIGHT - (20 * (CANVAS_HEIGHT / initialCanvasHeight)); // تنظیم ارتفاع زمین بر اساس ارتفاع جدید بوم
    
    // مقیاس‌بندی مجدد موقعیت‌ها و ابعاد بازیکن و موانع
    if (player) {
        player.x = CANVAS_WIDTH * FOX_START_X_RATIO;
        player.y = GROUND_Y - player.height;
    }
    obstacles = []; // موانع رو ریست می‌کنیم تا با ابعاد جدید تولید بشن
    clouds = []; // ابرها رو ریست می‌کنیم
    groundTiles = []; // زمین رو ریست می‌کنیم
    groundTiles.push(new Ground(0));
    groundTiles.push(new Ground(CANVAS_WIDTH * 2));
}

function initGame() {
    resizeCanvas(); // تنظیم ابعاد در شروع و در صورت تغییر اندازه صفحه

    player = new Player();
    obstacles = [];
    clouds = [];
    score = 0;
    gameSpeed = BASE_SPEED; // ریست سرعت بازی
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

    let requiredGap = Math.random() * (CANVAS_WIDTH * OBSTACLE_MAX_GAP_RATIO - CANVAS_WIDTH * OBSTACLE_MIN_GAP_RATIO) + CANVAS_WIDTH * OBSTACLE_MIN_GAP_RATIO;
    // کاهش فاصله بین موانع با افزایش سرعت
    requiredGap = requiredGap / (gameSpeed / BASE_SPEED);

    if (!lastObstacle || (CANVAS_WIDTH - lastObstacle.x > requiredGap && timeSinceLastObstacle > 1000 / (gameSpeed * 0.8))) {
        // انتخاب نوع مانع با توجه به سختی
        let availableObstacleTypes = OBSTACLE_TYPES.filter(type => {
            // موانع خیلی بلند رو فقط در ارتفاع کافی بوم نشون بده
            return type.height <= CANVAS_HEIGHT - GROUND_Y + 10;
        });

        const randomIndex = Math.floor(Math.random() * availableObstacleTypes.length);
        obstacles.push(new Obstacle(availableObstacleTypes[randomIndex].type));
        lastObstacleTime = currentTime;
    }
}

function generateCloud() {
    const currentTime = Date.now();
    const lastCloud = clouds[clouds.length - 1];
    const timeSinceLastCloud = currentTime - lastCloudTime;

    const requiredGap = Math.random() * (CANVAS_WIDTH * CLOUD_MAX_GAP_RATIO - CANVAS_WIDTH * CLOUD_MIN_GAP_RATIO) + CANVAS_WIDTH * CLOUD_MIN_GAP_RATIO;

    if (!lastCloud || (CANVAS_WIDTH - lastCloud.x > requiredGap && timeSinceLastCloud > 5000 / (gameSpeed / BASE_SPEED))) {
        clouds.push(new Cloud());
        lastCloudTime = currentTime;
    }
}

function updateGame() {
    if (gameOver) return;

    score++;
    currentScoreDisplay.textContent = Math.floor(score / 10);
    // افزایش سرعت بازی: هر 1000 امتیاز (امتیاز واقعی)، سرعت 0.5 واحد افزایش پیدا می‌کنه
    gameSpeed = BASE_SPEED + Math.floor(score / 1000) * 0.5;
    gameSpeed = Math.min(gameSpeed, BASE_SPEED + 10); // محدود کردن حداکثر سرعت برای جلوگیری از غیرقابل بازی شدن

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
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT); // پاک کردن بوم

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
window.addEventListener('resize', resizeCanvas);

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
    e.preventDefault(); // جلوگیری از اسکرول مرورگر در موبایل
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
