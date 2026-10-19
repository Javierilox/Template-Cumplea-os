/* ==========================================================================
   APARTADO 2: LÓGICA DEL JUEGO DE PUZZLE DESLIZANTE (PC Y CELULAR)
   ========================================================================== */

let puzzleInitialized = false;

function bootPuzzleIfReady() {
    if (typeof GALLERY_IMAGES === "undefined" || !GALLERY_IMAGES.length) return;
    if (!puzzleInitialized) {
        puzzleInitialized = true;
        initPuzzleGame();
    } else if (typeof window.refreshPuzzleImages === "function") {
        window.refreshPuzzleImages();
    }
}

document.addEventListener("DOMContentLoaded", bootPuzzleIfReady);
window.addEventListener("galleryImagesReady", bootPuzzleIfReady);

function initPuzzleGame() {
    if (typeof GALLERY_IMAGES === "undefined" || !GALLERY_IMAGES.length) return;

    // Elementos del DOM
    const board = document.getElementById("puzzle-board");
    const imageSelect = document.getElementById("puzzle-image-select");
    const previewImg = document.getElementById("puzzle-preview-img");
    const diffButtons = document.querySelectorAll(".diff-btn");
    const timerDisplay = document.getElementById("puzzle-timer");
    const movesDisplay = document.getElementById("puzzle-moves");
    const shuffleBtn = document.getElementById("btn-shuffle-puzzle");

    // Modal de victoria
    const winModal = document.getElementById("puzzle-win-modal");
    const winStats = document.getElementById("win-stats");
    const closeModalBtn = document.getElementById("btn-close-modal");

    // Estado del juego
    let gridSize = 3; // 3x3 por defecto
    let currentImageSrc = GALLERY_IMAGES[0].src;
    let tiles = []; // Arreglo con el orden actual de las piezas
    let emptyIndex = 0; // Posición actual del espacio vacío
    let moves = 0;
    let secondsElapsed = 0;
    let timerInterval = null;
    let isGameActive = false;

    // Variables para detectar gestos de deslizamiento (Swipe / Drag)
    let startX = 0;
    let startY = 0;
    let touchedTileIndex = null;

    /* ----------------------------------------------------------------------
       1. CARGAR SELECTOR DE FOTOS DESDE LA GALERÍA AUTOMÁTICAMENTE
       ---------------------------------------------------------------------- */
    function populateImageSelector() {
        imageSelect.innerHTML = "";

        GALLERY_IMAGES.forEach((img, index) => {
            const option = document.createElement("option");
            option.value = img.src;
            option.textContent = `${index + 1}. ${img.title}`;
            imageSelect.appendChild(option);
        });

        currentImageSrc = GALLERY_IMAGES[0].src;
        previewImg.src = currentImageSrc;
    }

    // Permite refrescar la lista si se detectan nuevas imágenes
    window.refreshPuzzleImages = () => {
        populateImageSelector();
        startNewGame();
    };

    /* ----------------------------------------------------------------------
       2. INICIAR Y MEZCLAR EL TABLERO (Garantizando que siempre tenga solución)
       ---------------------------------------------------------------------- */
    function startNewGame() {
        stopTimer();
        moves = 0;
        secondsElapsed = 0;
        isGameActive = false;
        movesDisplay.textContent = "0";
        timerDisplay.textContent = "00:00";

        const totalTiles = gridSize * gridSize;
        // Creamos el arreglo ordenado: [0, 1, 2, ..., totalTiles - 1]
        // El último número (totalTiles - 1) representa el espacio vacío
        tiles = Array.from({ length: totalTiles }, (_, index) => index);
        emptyIndex = totalTiles - 1;

        // Mezclamos haciendo movimientos válidos reales para que siempre sea resoluble
        shuffleTiles(gridSize * gridSize * 18);
        renderBoard();
    }

    function shuffleTiles(steps) {
        let previousEmpty = -1;

        for (let i = 0; i < steps; i++) {
            const neighbors = getValidNeighbors(emptyIndex);
            // Evitamos deshacer inmediatamente el movimiento anterior
            const filtered = neighbors.filter(idx => idx !== previousEmpty);
            const candidates = filtered.length > 0 ? filtered : neighbors;

            const randomNeighbor = candidates[Math.floor(Math.random() * candidates.length)];
            previousEmpty = emptyIndex;

            // Intercambiamos la pieza vecina con el espacio vacío
            swapTiles(randomNeighbor, emptyIndex);
            emptyIndex = randomNeighbor;
        }

        // Si por casualidad quedó resuelto tras mezclar, movemos una pieza más
        if (checkWinCondition()) {
            const neighbors = getValidNeighbors(emptyIndex);
            const firstNeighbor = neighbors[0];
            swapTiles(firstNeighbor, emptyIndex);
            emptyIndex = firstNeighbor;
        }
    }

    /* ----------------------------------------------------------------------
       3. DIBUJAR EL TABLERO Y LAS PIEZAS
       ---------------------------------------------------------------------- */
    function renderBoard() {
        board.innerHTML = "";
        board.style.gridTemplateColumns = `repeat(${gridSize}, 1fr)`;
        board.style.gridTemplateRows = `repeat(${gridSize}, 1fr)`;

        const totalTiles = gridSize * gridSize;
        const movableIndices = getValidNeighbors(emptyIndex);

        tiles.forEach((tileValue, currentIndex) => {
            const tileElement = document.createElement("div");
            tileElement.classList.add("puzzle-tile");
            tileElement.dataset.index = currentIndex;

            const isEmptyTile = tileValue === totalTiles - 1;

            if (isEmptyTile) {
                tileElement.classList.add("empty");
            } else {
                // Calculamos qué parte de la foto le corresponde a esta pieza original
                const originalRow = Math.floor(tileValue / gridSize);
                const originalCol = tileValue % gridSize;

                const percentX = (originalCol / (gridSize - 1)) * 100;
                const percentY = (originalRow / (gridSize - 1)) * 100;

                tileElement.style.backgroundImage = `url('${currentImageSrc}')`;
                tileElement.style.backgroundSize = `${gridSize * 100}% ${gridSize * 100}%`;
                tileElement.style.backgroundPosition = `${percentX}% ${percentY}%`;

                // Número guía pequeño en la esquina superior izquierda
                tileElement.textContent = tileValue + 1;

                // Marcamos visualmente las piezas que están junto al espacio vacío
                if (movableIndices.includes(currentIndex)) {
                    tileElement.classList.add("movable");
                }

                // Evento de clic directo (PC o toque rápido en móvil)
                tileElement.addEventListener("click", () => {
                    tryMoveTile(currentIndex);
                });
            }

            board.appendChild(tileElement);
        });
    }

    /* ----------------------------------------------------------------------
       4. LÓGICA DE MOVIMIENTO Y VALIDACIÓN DE VECINOS
       ---------------------------------------------------------------------- */
    function getValidNeighbors(index) {
        const neighbors = [];
        const row = Math.floor(index / gridSize);
        const col = index % gridSize;

        if (row > 0) neighbors.push(index - gridSize); // Arriba
        if (row < gridSize - 1) neighbors.push(index + gridSize); // Abajo
        if (col > 0) neighbors.push(index - 1); // Izquierda
        if (col < gridSize - 1) neighbors.push(index + 1); // Derecha

        return neighbors;
    }

    function tryMoveTile(tileIndex) {
        const validNeighbors = getValidNeighbors(emptyIndex);
        if (!validNeighbors.includes(tileIndex)) return false;

        // Iniciamos el cronómetro en el primer movimiento del jugador
        if (!isGameActive) {
            isGameActive = true;
            startTimer();
        }

        swapTiles(tileIndex, emptyIndex);
        emptyIndex = tileIndex;

        moves++;
        movesDisplay.textContent = moves;

        renderBoard();

        if (checkWinCondition()) {
            handlePuzzleWin();
        }

        return true;
    }

    // Mueve la pieza adyacente según la dirección hacia donde deslizó el usuario
    function moveBySwipeDirection(dx, dy, originTileIndex) {
        // Si el usuario empezó el gesto sobre una pieza vecina válida, la movemos directo
        if (originTileIndex !== null && getValidNeighbors(emptyIndex).includes(originTileIndex)) {
            const emptyRow = Math.floor(emptyIndex / gridSize);
            const emptyCol = emptyIndex % gridSize;
            const tileRow = Math.floor(originTileIndex / gridSize);
            const tileCol = originTileIndex % gridSize;

            // Verificamos que el deslizamiento vaya en sentido hacia el espacio vacío
            const expectedX = emptyCol - tileCol;
            const expectedY = emptyRow - tileRow;

            if (
                (expectedX !== 0 && Math.sign(dx) === Math.sign(expectedX)) ||
                (expectedY !== 0 && Math.sign(dy) === Math.sign(expectedY))
            ) {
                tryMoveTile(originTileIndex);
                return;
            }
        }

        // Si deslizó en cualquier parte del tablero, movemos la pieza que empuja hacia el hueco
        const emptyRow = Math.floor(emptyIndex / gridSize);
        const emptyCol = emptyIndex % gridSize;
        let targetRow = emptyRow;
        let targetCol = emptyCol;

        if (Math.abs(dx) > Math.abs(dy)) {
            // Deslizamiento horizontal
            targetCol = dx > 0 ? emptyCol - 1 : emptyCol + 1;
        } else {
            // Deslizamiento vertical
            targetRow = dy > 0 ? emptyRow - 1 : emptyRow + 1;
        }

        if (targetRow >= 0 && targetRow < gridSize && targetCol >= 0 && targetCol < gridSize) {
            const targetIndex = targetRow * gridSize + targetCol;
            tryMoveTile(targetIndex);
        }
    }

    function swapTiles(indexA, indexB) {
        const temp = tiles[indexA];
        tiles[indexA] = tiles[indexB];
        tiles[indexB] = temp;
    }

    function checkWinCondition() {
        return tiles.every((tileValue, index) => tileValue === index);
    }

    /* ----------------------------------------------------------------------
       5. CRONÓMETRO Y VICTORIA
       ---------------------------------------------------------------------- */
    function startTimer() {
        stopTimer();
        timerInterval = setInterval(() => {
            secondsElapsed++;
            timerDisplay.textContent = formatTime(secondsElapsed);
        }, 1000);
    }

    function stopTimer() {
        if (timerInterval) {
            clearInterval(timerInterval);
            timerInterval = null;
        }
    }

    function formatTime(totalSeconds) {
        const mins = String(Math.floor(totalSeconds / 60)).padStart(2, "0");
        const secs = String(totalSeconds % 60).padStart(2, "0");
        return `${mins}:${secs}`;
    }

    function handlePuzzleWin() {
        stopTimer();
        isGameActive = false;

        if (typeof window.launchConfetti === "function") {
            window.launchConfetti(110);
        }

        winStats.textContent = `Tiempo: ${formatTime(secondsElapsed)} | Movimientos: ${moves}`;
        setTimeout(() => {
            winModal.classList.remove("hidden");
        }, 300);
    }

    /* ----------------------------------------------------------------------
       6. EVENTOS DE INTERACCIÓN (Deslizamiento Táctil, Mouse y Botones)
       ---------------------------------------------------------------------- */
    // Soporte unificado de deslizamiento con Pointer Events (Mouse + Pantalla Táctil)
    board.addEventListener("pointerdown", (e) => {
        startX = e.clientX;
        startY = e.clientY;
        const tileEl = e.target.closest(".puzzle-tile");
        touchedTileIndex = tileEl ? parseInt(tileEl.dataset.index, 10) : null;
    });

    board.addEventListener("pointerup", (e) => {
        const dx = e.clientX - startX;
        const dy = e.clientY - startY;
        const minSwipeDistance = 24; // Píxeles mínimos para considerar que fue un deslizamiento

        if (Math.abs(dx) >= minSwipeDistance || Math.abs(dy) >= minSwipeDistance) {
            moveBySwipeDirection(dx, dy, touchedTileIndex);
        }
        touchedTileIndex = null;
    });

    // Cambiar de imagen desde el selector
    imageSelect.addEventListener("change", (e) => {
        currentImageSrc = e.target.value;
        previewImg.src = currentImageSrc;
        startNewGame();
    });

    // Cambiar nivel de dificultad (3x3, 4x4, 5x5)
    diffButtons.forEach(btn => {
        btn.addEventListener("click", () => {
            diffButtons.forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            gridSize = parseInt(btn.dataset.size, 10);
            startNewGame();
        });
    });

    // Botón de mezclar de nuevo
    shuffleBtn.addEventListener("click", startNewGame);

    // Cerrar ventana emergente de victoria
    closeModalBtn.addEventListener("click", () => {
        winModal.classList.add("hidden");
        startNewGame();
    });

    // Inicializar el juego por primera vez
    populateImageSelector();
    startNewGame();
}