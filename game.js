const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('scoreEl');
const finalScoreEl = document.getElementById('finalScore');
const startGameBtn = document.getElementById('startGameBtn');
const uiContainer = document.getElementById('uiContainer');
const hud = document.getElementById('hud');

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

let score = 0;
let animationId;
let spawnInterval;

// Classes
class Player {
    constructor(x, y, radius, color) {
        this.x = x;
        this.y = y;
        this.radius = radius;
        this.color = color;
    }

    draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2, false);
        ctx.fillStyle = this.color;
        ctx.shadowBlur = 20;
        ctx.shadowColor = this.color;
        ctx.fill();
        ctx.shadowBlur = 0; // Reset
    }
}

class Projectile {
    constructor(x, y, radius, color, velocity) {
        this.x = x;
        this.y = y;
        this.radius = radius;
        this.color = color;
        this.velocity = velocity;
    }

    draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2, false);
        ctx.fillStyle = this.color;
        ctx.shadowBlur = 10;
        ctx.shadowColor = this.color;
        ctx.fill();
        ctx.shadowBlur = 0;
    }

    update() {
        this.draw();
        this.x += this.velocity.x;
        this.y += this.velocity.y;
    }
}

class Enemy {
    constructor(x, y, radius, color, velocity) {
        this.x = x;
        this.y = y;
        this.radius = radius;
        this.color = color;
        this.velocity = velocity;
    }

    draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2, false);
        ctx.fillStyle = this.color;
        ctx.shadowBlur = 15;
        ctx.shadowColor = this.color;
        ctx.fill();
        ctx.shadowBlur = 0;
    }

    update() {
        this.draw();
        this.x += this.velocity.x;
        this.y += this.velocity.y;
    }
}

const friction = 0.99;
class Particle {
    constructor(x, y, radius, color, velocity) {
        this.x = x;
        this.y = y;
        this.radius = radius;
        this.color = color;
        this.velocity = velocity;
        this.alpha = 1;
    }

    draw() {
        ctx.save();
        ctx.globalAlpha = this.alpha;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2, false);
        ctx.fillStyle = this.color;
        ctx.fill();
        ctx.restore();
    }

    update() {
        this.draw();
        this.velocity.x *= friction;
        this.velocity.y *= friction;
        this.x += this.velocity.x;
        this.y += this.velocity.y;
        this.alpha -= 0.01;
    }
}

// State
let player;
let projectiles = [];
let enemies = [];
let particles = [];

function init() {
    player = new Player(canvas.width / 2, canvas.height / 2, 15, '#ffffff');
    projectiles = [];
    enemies = [];
    particles = [];
    score = 0;
    scoreEl.innerHTML = score;
    finalScoreEl.innerHTML = score;
}

function spawnEnemies() {
    spawnInterval = setInterval(() => {
        const radius = Math.random() * (30 - 10) + 10;
        let x, y;

        if (Math.random() < 0.5) {
            x = Math.random() < 0.5 ? 0 - radius : canvas.width + radius;
            y = Math.random() * canvas.height;
        } else {
            x = Math.random() * canvas.width;
            y = Math.random() < 0.5 ? 0 - radius : canvas.height + radius;
        }

        const color = `hsl(${Math.random() * 360}, 50%, 50%)`;
        const angle = Math.atan2(canvas.height / 2 - y, canvas.width / 2 - x);
        
        // Plus un ennemi est petit, plus il est rapide. A mesure que le score monte, ils von plus vite.
        const difficultyMultiplier = 1 + (score / 5000);
        const speed = (1 + (30 / radius)) * difficultyMultiplier;

        const velocity = {
            x: Math.cos(angle) * speed,
            y: Math.sin(angle) * speed
        };

        enemies.push(new Enemy(x, y, radius, color, velocity));
    }, 1000); 
}

function animate() {
    animationId = requestAnimationFrame(animate);
    ctx.fillStyle = 'rgba(13, 13, 18, 0.2)'; // Fait un effet de traînée
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    player.draw();

    particles.forEach((particle, index) => {
        if (particle.alpha <= 0) {
            particles.splice(index, 1);
        } else {
            particle.update();
        }
    });

    projectiles.forEach((projectile, index) => {
        projectile.update();

        // Supprime les projectiles qui sortent de l'écran
        if (
            projectile.x + projectile.radius < 0 ||
            projectile.x - projectile.radius > canvas.width ||
            projectile.y + projectile.radius < 0 ||
            projectile.y - projectile.radius > canvas.height
        ) {
            setTimeout(() => {
                projectiles.splice(index, 1);
            }, 0);
        }
    });

    enemies.forEach((enemy, index) => {
        enemy.update();

        // Fin du jeu : Hitbox entre joueur et ennemi
        const distToPlayer = Math.hypot(player.x - enemy.x, player.y - enemy.y);
        if (distToPlayer - enemy.radius - player.radius < 1) {
            cancelAnimationFrame(animationId);
            clearInterval(spawnInterval);
            finalScoreEl.innerHTML = score;
            uiContainer.style.display = 'block';
            hud.style.display = 'none';
        }

        projectiles.forEach((projectile, projectileIndex) => {
            const dist = Math.hypot(projectile.x - enemy.x, projectile.y - enemy.y);

            // Collisions projectiles et ennemis
            if (dist - enemy.radius - projectile.radius < 1) {
                // Créer l'explosion
                for (let i = 0; i < enemy.radius * 2; i++) {
                    particles.push(
                        new Particle(
                            projectile.x, 
                            projectile.y, 
                            Math.random() * 3, 
                            enemy.color, 
                            {   x: (Math.random() - 0.5) * (Math.random() * 8), 
                                y: (Math.random() - 0.5) * (Math.random() * 8) }
                        )
                    );
                }

                if (enemy.radius - 10 > 10) {
                    // Réduit la taille de l'ennemi (il n'est pas mort)
                    score += 100;
                    scoreEl.innerHTML = score;
                    gsap.to(enemy, {
                        radius: enemy.radius - 10
                    });
                    setTimeout(() => {
                        projectiles.splice(projectileIndex, 1);
                    }, 0);
                } else {
                    // Supprime totalement l'ennemi
                    score += 250;
                    scoreEl.innerHTML = score;
                    setTimeout(() => {
                        enemies.splice(index, 1);
                        projectiles.splice(projectileIndex, 1);
                    }, 0);
                }
            }
        });
    });
}

window.addEventListener('click', (event) => {
    // Ne pas tirer si on clique sur le bouton "Commencer"
    if(uiContainer.style.display !== 'none' && uiContainer.style.display !== '') return;

    const angle = Math.atan2(
        event.clientY - canvas.height / 2,
        event.clientX - canvas.width / 2
    );
    const velocity = {
        x: Math.cos(angle) * 7,
        y: Math.sin(angle) * 7
    };

    projectiles.push(new Projectile(
        canvas.width / 2, 
        canvas.height / 2, 
        5, 
        '#00f2fe', 
        velocity
    ));
});

window.addEventListener('resize', () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    if(player) {
        player.x = canvas.width / 2;
        player.y = canvas.height / 2;
    }
});

startGameBtn.addEventListener('click', () => {
    init();
    uiContainer.style.display = 'none';
    hud.style.display = 'block';
    animate();
    spawnEnemies();
});
