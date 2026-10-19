/* ==========================================================================
   APARTADO 1: LÓGICA DE LA GALERÍA DE IMÁGENES (Auto-actualizable y de 6 en 6)
   ========================================================================== */

let galleryInitialized = false;

document.addEventListener("DOMContentLoaded", () => {
    if (typeof GALLERY_IMAGES !== "undefined" && GALLERY_IMAGES.length > 0) {
        initGallery();
    }
});

// Se actualiza automáticamente cuando data.js termina de detectar las imágenes
window.addEventListener("galleryImagesReady", () => {
    initGallery();
});

function initGallery() {
    if (typeof GALLERY_IMAGES === "undefined" || !GALLERY_IMAGES.length) return;

    const sectionHeader = document.querySelector("#galeria .section-header");
    const gridContainer = document.getElementById("gallery-grid");
    const slideshowContainer = document.getElementById("gallery-slideshow");
    const btnGridView = document.getElementById("btn-grid-view");
    const btnSlideView = document.getElementById("btn-slide-view");

    const slideImg = document.getElementById("slide-img");
    const slideTitle = document.getElementById("slide-title");
    const slideDesc = document.getElementById("slide-desc");
    const prevBtn = document.getElementById("prev-slide");
    const nextBtn = document.getElementById("next-slide");
    const indicatorsContainer = document.getElementById("slide-indicators");

    let currentIndex = 0;

    /* ----------------------------------------------------------------------
       1. MOSTRAR CONTADOR AUTOMÁTICO DE FOTOS DETECTADAS
       ---------------------------------------------------------------------- */
    let counterBadge = document.getElementById("gallery-auto-counter");
    if (!counterBadge && sectionHeader) {
        counterBadge = document.createElement("div");
        counterBadge.id = "gallery-auto-counter";
        counterBadge.classList.add("gallery-counter");
        sectionHeader.appendChild(counterBadge);
    }

    if (counterBadge) {
        const total = GALLERY_IMAGES.length;
        const scrollHint = total > 6 ? " • ↕️ Desliza para ver más" : "";
        counterBadge.textContent = `📸 ${total} ${total === 1 ? "recuerdo" : "recuerdos"}${scrollHint}`;
    }

    /* ----------------------------------------------------------------------
       2. RENDERIZAR VISTA DE CUADRÍCULA (6 visibles + scroll vertical)
       ---------------------------------------------------------------------- */
    function renderGrid() {
        gridContainer.innerHTML = "";

        GALLERY_IMAGES.forEach((item, index) => {
            const card = document.createElement("div");
            card.classList.add("gallery-card");

            card.innerHTML = `
                <img src="${item.src}" alt="${item.title}" loading="lazy">
                <div class="gallery-overlay">
                    <h3>${item.title}</h3>
                    <p>${item.description}</p>
                </div>
            `;

            card.addEventListener("click", () => {
                currentIndex = index;
                updateSlide(currentIndex);
                switchView("slide");
            });

            gridContainer.appendChild(card);
        });
    }

    /* ----------------------------------------------------------------------
       3. RENDERIZAR INDICADORES Y CARRUSEL
       ---------------------------------------------------------------------- */
    function renderIndicators() {
        indicatorsContainer.innerHTML = "";

        GALLERY_IMAGES.forEach((_, index) => {
            const dot = document.createElement("button");
            dot.classList.add("indicator-dot");
            dot.setAttribute("aria-label", `Ir a la foto ${index + 1}`);
            if (index === currentIndex) dot.classList.add("active");

            dot.addEventListener("click", () => {
                currentIndex = index;
                updateSlide(currentIndex);
            });

            indicatorsContainer.appendChild(dot);
        });
    }

    function updateSlide(index) {
        const item = GALLERY_IMAGES[index];
        if (!item) return;

        slideImg.src = item.src;
        slideImg.alt = item.title;
        slideTitle.textContent = item.title;
        slideDesc.textContent = item.description;

        const dots = indicatorsContainer.querySelectorAll(".indicator-dot");
        dots.forEach((dot, idx) => {
            dot.classList.toggle("active", idx === index);
        });
    }

    function nextSlide() {
        currentIndex = (currentIndex + 1) % GALLERY_IMAGES.length;
        updateSlide(currentIndex);
    }

    function prevSlide() {
        currentIndex = (currentIndex - 1 + GALLERY_IMAGES.length) % GALLERY_IMAGES.length;
        updateSlide(currentIndex);
    }

    function switchView(mode) {
        if (mode === "slide") {
            gridContainer.classList.add("hidden");
            slideshowContainer.classList.remove("hidden");
            btnSlideView.classList.add("active");
            btnGridView.classList.remove("active");
            updateSlide(currentIndex);
        } else {
            slideshowContainer.classList.add("hidden");
            gridContainer.classList.remove("hidden");
            btnGridView.classList.add("active");
            btnSlideView.classList.remove("active");
        }
    }

    /* ----------------------------------------------------------------------
       4. EVENTOS (Se registran una sola vez)
       ---------------------------------------------------------------------- */
    if (!galleryInitialized) {
        btnGridView.addEventListener("click", () => switchView("grid"));
        btnSlideView.addEventListener("click", () => switchView("slide"));
        nextBtn.addEventListener("click", nextSlide);
        prevBtn.addEventListener("click", prevSlide);

        let touchStartX = 0;
        slideImg.addEventListener("touchstart", (e) => {
            touchStartX = e.changedTouches[0].screenX;
        }, { passive: true });

        slideImg.addEventListener("touchend", (e) => {
            const touchEndX = e.changedTouches[0].screenX;
            const diff = touchStartX - touchEndX;
            if (Math.abs(diff) > 40) {
                diff > 0 ? nextSlide() : prevSlide();
            }
        }, { passive: true });

        galleryInitialized = true;
    }

    renderGrid();
    renderIndicators();
    updateSlide(0);
}