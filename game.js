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
// تمامی محاسبات و طراحی بازی بر اساس این ابعاد انجام می‌شود.
// سپس این ابعاد منطقی به ابعاد واقعی Canvas (که ممکن است کوچک‌تر یا بزرگ‌تر باشند)
// مقیاس‌بندی می‌شوند.
const LOGICAL_CANVAS_WIDTH = 800;
const LOGICAL_CANVAS_HEIGHT = 200;
const LOGICAL_GROUND_Y_OFFSET = 20; // فاصله زمین از پایین در ابعاد منطقی

let currentLogicalCanvasWidth = LOGICAL_CANVAS_WIDTH; // عرض منطقی فعلی (که تغییر نمی‌کند)
let currentLogicalCanvasHeight = LOGICAL_CANVAS_HEIGHT; // ارتفاع منطقی فعلی (که تغییر نمی‌کند)
let scaleFactor = 1; // ضریب مقیاس‌بندی از ابعاد منطقی به ابعاد واقعی Canvas

// === تنظیمات عمومی (بر اساس ابعاد منطقی) ===
const BASE_JUMP_VELOCITY = -10;
const BASE_GRAVITY = 0.5;
const BASE_GAME_SPEED = 4; // سرعت پایه بازی

// === تنظیمات شخصیت (روباه - بر اساس ابعاد منطقی) ===
const BASE_FOX_WIDTH = 40;
const BASE_FOX_HEIGHT = 45;
const FOX_START_X_RATIO = 0.06; // موقعیت X بر اساس نسبت عرض بوم منطقی

// === تنظیمات موانع (بر اساس ابعاد منطقی) ===
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

// === تنظیمات ابرها (بر اساس ابعاد منطقی) ===
const BASE_CLOUD_WIDTH = 60;
const BASE_CLOUD_HEIGHT = 20;
const CLOUD_COLOR = '#b0bec5';
const BASE_CLOUD_MIN_GAP_RATIO = 0.2;
const BASE_CLOUD_MAX_GAP_RATIO = 0.6;

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
    ctx.lineTo(x + width * 0.1, y - 5); // این 5 پیکسل وابسته به مقیاس نیست، به همین دلیل قبلا مشکل داشت.
                                        // حالا با scaleFactor ضرب میشن: 5 * scaleFactor
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
    ctx.arc(x + width * 0.4, y + height * 0.15, 2, 0, Math.PI * 2); // 2 پیکسل
    ctx.arc(x + width * 0.6, y + height * 0.15, 2, 0, Math.PI * 2); // 2 پیکسل
    ctx.fill();

    // بینی
    ctx.beginPath();
    ctx.arc(x + width * 0.5, y + height * 0.25, 2, 0, Math.PI * 2); // 2 پیکسل
    ctx.fill();

    // دم
    ctx.fillStyle = FOX_COLOR;
    ctx.beginPath();
    ctx.moveTo(x, y + height * 0.7);
    ctx.lineTo(x - 10, y + height * 0.5); // 10 پیکسل
    ctx.lineTo(x, y + height * 0.3);
    ctx.closePath();
    ctx.fill();
}


// === کلاس‌ها ===

class Player {
    constructor() {
        this.width = BASE_FOX_WIDTH; // اینها ابعاد منطقی هستند
        this.height = BASE_FOX_HEIGHT;
        this.x = LOGICAL_CANVAS_WIDTH * FOX_START_X_RATIO;
        this.y = LOGICAL_CANVAS_HEIGHT - LOGICAL_GROUND_Y_OFFSET - this.height; // استفاده از ابعاد منطقی
        this.velocityY = 0;
        this.jumps = 0;
        this.maxJumps = 2;
    }

    draw() {
        drawFox(this.x, this.y, this.width, this.height);
    }

    update() {
        this.y += this.velocityY;
        this.velocityY += BASE_GRAVITY; // جاذبه هم مقیاس‌بندی شده در draw

        // برخورد با زمین منطقی
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
        this.x = LOGICAL_CANVAS_WIDTH; // شروع از لبه راست منطقی
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
            ctx.lineWidth = 2; // ضخامت خطوط
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
        this.speed = BASE_GAME_SPEED * (0.2 + Math.random() * 0.4); // سرعت ابرها به صورت منطقی
    }

    draw() {
        ctx.fillStyle = CLOUD_COLOR;
        drawCloudShape(this.x, this.y, this.width, this.height);
    }

    update() {
        this.x -= this.speed; // سرعت ابرها با سرعت بازی اصلی مقیاس‌بندی نمی‌شود
    }
}

class Ground {
    constructor(x) {
        this.x = x; // موقعیت X منطقی
        this.y = LOGICAL_CANVAS_HEIGHT - LOGICAL_GROUND_Y_OFFSET;
        this.width = LOGICAL_CANVAS_WIDTH * 2; // عرض منطقی زمین
        this.height = LOGICAL_GROUND_Y_OFFSET; // ارتفاع منطقی زمین
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
            // تایل رو به انتهای مجموعه بفرست، بر اساس عرض منطقی
            this.x = this.x + this.width * 2;
        }
    }
}

// === توابع مقیاس‌بندی و تنظیم Canvas ===

// محاسبه مقیاس‌بندی بر اساس ابعاد واقعی صفحه و بوم منطقی
function calculateScaleFactor() {
    const dpr = window.devicePixelRatio || 1;
    
    // ابعاد واقعی viewport
    const screenWidth = window.innerWidth;
    const screenHeight = window.innerHeight;

    // حداکثر ابعاد CSS که canvas می‌تواند اشغال کند
    const maxCssWidth = screenWidth * 0.98; // 98% از عرض صفحه
    const maxCssHeight = screenHeight * 0.90; // 90% از ارتفاع صفحه (برای فضای UI بالا و پایین)

    let desiredCssWidth;
    let desiredCssHeight;

    // محاسبه ابعاد CSS Canvas با حفظ نسبت ابعاد منطقی
    const logicalAspectRatio = LOGICAL_CANVAS_WIDTH / LOGICAL_CANVAS_HEIGHT;

    // ابتدا بر اساس عرض صفحه محاسبه می‌کنیم
    desiredCssWidth = maxCssWidth;
    desiredCssHeight = desiredCssWidth / logicalAspectRatio;

    // اگر ارتفاع محاسبه شده از حداکثر ارتفاع مجاز بیشتر بود، بر اساس ارتفاع محدود می‌کنیم
    if (desiredCssHeight > maxCssHeight) {
        desiredCssHeight = maxCssHeight;
        desiredCssWidth = desiredCssHeight * logicalAspectRatio;
    }

    // اطمینان از حداقل ابعاد (برای صفحه‌های خیلی کوچک)
    if (desiredCssWidth < 250) desiredCssWidth = 250;
    if (desiredCssHeight < 60) desiredCssHeight = 60;


    // تنظیم ابعاد CSS Canvas
    canvas.style.width = `${desiredCssWidth}px`;
    canvas.style.height = `${desiredCssHeight}px`;

    // تنظیم ابعاد واقعی Canvas برای رندر HiDPI
    canvas.width = Math.floor(desiredCssWidth * dpr);
    canvas.height = Math.floor(desiredCssHeight * dpr);

    // مقیاس‌بندی کانتکس رسم برای جبران dpr و همچنین نگاشت ابعاد منطقی به واقعی
    // این مقیاس، عامل اصلی است که تمامی Draw ها را تحت تاثیر قرار می دهد.
    scaleFactor = canvas.width / LOGICAL_CANVAS_WIDTH;
    ctx.scale(dpr, dpr); // مقیاس‌بندی برای رندر HiDPI
    ctx.scale(scaleFactor, scaleFactor); // مقیاس‌بندی از ابعاد منطقی به ابعاد CSS


    console.log(`Viewport: ${screenWidth}x${screenHeight}`);
    console.log(`Desired CSS Canvas: ${desiredCssWidth.toFixed(2)}x${desiredCssHeight.toFixed(2)}`);
    console.log(`Actual Canvas Resolution (DPR): ${canvas.width}x${canvas.height}`);
    console.log(`Device Pixel Ratio (DPR): ${dpr}`);
    console.log(`Scale Factor (Logical to Physical Draw): ${scaleFactor.toFixed(2)}`);
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
    groundTiles.push(new Ground(LOGICAL_CANVAS_WIDTH * 2)); // تایل دوم بلافاصله بعد از اولی شروع میشه

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
    requiredGap = requiredGap / (gameSpeed / BASE_GAME_SPEED); // کاهش فاصله با افزایش سرعت

    if (!lastObstacle || (LOGICAL_CANVAS_WIDTH - lastObstacle.x > requiredGap && timeSinceLastObstacle > 1000 / (gameSpeed * 0.8))) {
        let availableObstacleTypes = BASE_OBSTACLE_TYPES.filter(type => {
            // اطمینان از اینکه موانع خیلی بلند از ارتفاع بوم منطقی بیرون نزنند
            return type.height <= LOGICAL_CANVAS_HEIGHT - LOGICAL_GROUND_Y_OFFSET + 10;
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
    
    // افزایش سرعت بازی: هر 1000 امتیاز (واقعی)، سرعت 0.5 واحد افزایش پیدا می‌کنه
    gameSpeed = BASE_GAME_SPEED + Math.floor(score / 1000) * 0.5;
    gameSpeed = Math.min(gameSpeed, BASE_GAME_SPEED + 10); // محدود کردن حداکثر سرعت

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
    // پاک کردن بوم با ابعاد واقعی Canvas
    ctx.clearRect(0, 0, canvas.width / scaleFactor, canvas.height / scaleFactor); 

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
