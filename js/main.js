/* ==========================================================================
   LÓGICA PRINCIPAL: GLOBOS, CONFETI, VELA INTERACTIVA Y NAVEGACIÓN
   ========================================================================== */

document.addEventListener("DOMContentLoaded", () => {
    initFloatingBalloons();
    initCakeInteraction();
    initNavigation();

    // Lanza una lluvia suave de confeti al abrir la página
    setTimeout(() => {
        launchConfetti(45);
    }, 500);
});

/* --------------------------------------------------------------------------
   1. GENERADOR DE GLOBOS FLOTANTES EN TONOS PASTEL
   -------------------------------------------------------------------------- */
function initFloatingBalloons() {
    const container = document.getElementById("background-animations");
    if (!container) return;

    const pastelColors = [
        "linear-gradient(135deg, #ff9ebb, #ff6b9d)",
        "linear-gradient(135deg, #e0c3fc, #9b5de5)",
        "linear-gradient(135deg, #fbc2eb, #a6c1ee)",
        "linear-gradient(135deg, #ffdde1, #ee9ca7)",
        "linear-gradient(135deg, #d4fc79, #96e6a1)",
        "linear-gradient(135deg, #f6d365, #fda085)"
    ];

    const balloonCount = 14;

    for (let i = 0; i < balloonCount; i++) {
        const balloon = document.createElement("div");
        balloon.classList.add("balloon");

        // Posición horizontal, tamaño, color y velocidad aleatoria
        const randomLeft = Math.random() * 95;
        const randomScale = 0.7 + Math.random() * 0.5;
        const randomDuration = 12 + Math.random() * 14;
        const randomDelay = Math.random() * 10;
        const randomColor = pastelColors[Math.floor(Math.random() * pastelColors.length)];

        balloon.style.left = `${randomLeft}vw`;
        balloon.style.background = randomColor;
        balloon.style.transform = `scale(${randomScale})`;
        balloon.style.animationDuration = `${randomDuration}s`;
        balloon.style.animationDelay = `-${randomDelay}s`;

        container.appendChild(balloon);
    }
}

/* --------------------------------------------------------------------------
   2. SISTEMA DE CONFETI (Global para usarlo en el pastel y al ganar el puzzle)
   -------------------------------------------------------------------------- */
function launchConfetti(amount = 60) {
    const colors = ["#ff6b9d", "#9b5de5", "#ffbe0b", "#00bbf9", "#00f5d4", "#ff9ebb"];

    for (let i = 0; i < amount; i++) {
        const confetti = document.createElement("div");
        confetti.classList.add("confetti-piece");

        const left = Math.random() * 100;
        const size = 6 + Math.random() * 8;
        const duration = 2.5 + Math.random() * 2.5;
        const delay = Math.random() * 0.6;
        const color = colors[Math.floor(Math.random() * colors.length)];

        confetti.style.left = `${left}vw`;
        confetti.style.width = `${size}px`;
        confetti.style.height = `${size * 1.4}px`;
        confetti.style.backgroundColor = color;
        confetti.style.animationDuration = `${duration}s`;
        confetti.style.animationDelay = `${delay}s`;

        document.body.appendChild(confetti);

        // Elimina la pieza del DOM al terminar la animación
        setTimeout(() => {
            confetti.remove();
        }, (duration + delay) * 1000);
    }
}

// Exponemos la función en window para que puzzle.js también pueda llamarla
window.launchConfetti = launchConfetti;

/* --------------------------------------------------------------------------
   3. INTERACCIÓN DEL PASTEL (Soplar la vela y pedir un deseo)
   -------------------------------------------------------------------------- */
function initCakeInteraction() {
    const cakeContainer = document.getElementById("birthday-cake");
    const flame = document.getElementById("candle-flame");
    const hintText = document.querySelector(".cake-hint");
    const celebrateBtn = document.getElementById("btn-celebrate");

    if (cakeContainer && flame) {
        cakeContainer.addEventListener("click", () => {
            const isBlownOut = flame.classList.toggle("blown-out");

            if (isBlownOut) {
                if (hintText) {
                    hintText.textContent = "🎉 ¡Deseo pedido! Que se cumpla todo, Cochi 💖 (Toca para encender)";
                }
                launchConfetti(90);
            } else {
                if (hintText) {
                    hintText.textContent = "✨ Toca la vela para pedir un deseo ✨";
                }
            }
        });
    }

    if (celebrateBtn) {
        celebrateBtn.addEventListener("click", () => {
            launchConfetti(50);
        });
    }
}

/* --------------------------------------------------------------------------
   4. MENÚ DE NAVEGACIÓN (Móvil + resaltado de sección activa)
   -------------------------------------------------------------------------- */
function initNavigation() {
    const navToggle = document.getElementById("nav-toggle");
    const navMenu = document.getElementById("nav-menu");
    const navLinks = document.querySelectorAll(".nav-link");
    const sections = document.querySelectorAll("section[id]");

    // Abrir/cerrar menú en celulares
    if (navToggle && navMenu) {
        navToggle.addEventListener("click", () => {
            navMenu.classList.toggle("open");
        });
    }

    // Cerrar menú al tocar un enlace y actualizar activo
    navLinks.forEach(link => {
        link.addEventListener("click", () => {
            if (navMenu) navMenu.classList.remove("open");
            navLinks.forEach(item => item.classList.remove("active"));
            link.classList.add("active");
        });
    });

    // Cambiar el botón activo según el scroll de la página
    window.addEventListener("scroll", () => {
        const scrollY = window.scrollY + 180;

        sections.forEach(section => {
            const sectionTop = section.offsetTop;
            const sectionHeight = section.offsetHeight;
            const sectionId = section.getAttribute("id");

            if (scrollY >= sectionTop && scrollY < sectionTop + sectionHeight) {
                navLinks.forEach(link => {
                    link.classList.remove("active");
                    if (link.getAttribute("href") === `#${sectionId}`) {
                        link.classList.add("active");
                    }
                });
            }
        });
    });
}