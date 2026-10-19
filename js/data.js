/* ==========================================================================
   BASE DE DATOS Y DETECTOR AUTOMÁTICO DE IMÁGENES (CORREGIDO)
   ========================================================================== */

const CUSTOM_IMAGE_TEXTS = {
    1: { title: "Un Día Inolvidable ✨", description: "Cada momento compartido contigo se convierte en mi recuerdo favorito." },
    2: { title: "Risas Infinitas 💖", description: "Gracias por llenar cada día de alegría y buena energía, Cochi." },
    3: { title: "Celebrando la Vida 🎂", description: "Que nunca nos falten motivos para brindar y celebrar juntos." },
    4: { title: "Aventuras Especiales 🌸", description: "Por muchos más viajes, paseos y anécdotas increíbles." },
    5: { title: "Brillando Siempre 🌟", description: "Que este nuevo año te traiga todo lo bonito que mereces." },
    6: { title: "¡Feliz Cumple, Cochi! 🎉", description: "Un pequeño rincón guardado para siempre en nuestra memoria." },
    7: { title: "Instantes Mágicos 💫", description: "Pequeños momentos que hacen grande nuestra historia." },
    8: { title: "Sonrisas que Iluminan 🌷", description: "Tu alegría siempre hace que todo sea más bonito." },
    9: { title: "Por Muchos Años Más 🥂", description: "Sigue cumpliendo cada uno de tus sueños, Cochi." }
};

const FALLBACK_IMAGES = [
    "https://images.unsplash.com/photo-1513151233558-d860c5398176?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1530103862676-de8c9debad1d?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1464349153735-7db50ed83c84?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1527529482837-4698179dc6ce?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1504196606672-aef5c9cefc92?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1519671482749-fd09be7ccebf?auto=format&fit=crop&w=800&q=80"
];

// 1. Inicializamos GALLERY_IMAGES de forma SÍNCRONA desde el segundo cero
// para que gallery.js y puzzle.js SIEMPRE tengan imágenes al arrancar.
let GALLERY_IMAGES = FALLBACK_IMAGES.map((src, i) => {
    const num = i + 1;
    const customMeta = CUSTOM_IMAGE_TEXTS[num] || {};
    return {
        id: num,
        title: customMeta.title || `Recuerdo Especial #${num} ✨`,
        description: customMeta.description || `Un momento inolvidable junto a Cochi 💖`,
        src: src
    };
});

function checkImageExists(url) {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => resolve(url);
        img.onerror = () => resolve(null);
        img.src = url;
    });
}

async function findLocalPhotoByIndex(index) {
    const extensions = ["jpg", "jpeg", "png", "webp"];
    for (const ext of extensions) {
        const path = `assets/img/foto${index}.${ext}`;
        const found = await checkImageExists(path);
        if (found) return found;
    }
    return null;
}

async function autoDetectGalleryImages() {
    const detected = [];
    let index = 1;
    const maxPhotosToScan = 100;

    while (index <= maxPhotosToScan) {
        const foundPath = await findLocalPhotoByIndex(index);
        if (!foundPath) break;

        const customMeta = CUSTOM_IMAGE_TEXTS[index] || {};
        detected.push({
            id: index,
            title: customMeta.title || `Recuerdo Especial #${index} ✨`,
            description: customMeta.description || `Un momento inolvidable junto a Cochi 💖`,
            src: foundPath
        });
        index++;
    }

    if (detected.length > 0) {
        GALLERY_IMAGES = detected;
    }

    // Notificamos a gallery.js y puzzle.js
    window.dispatchEvent(new CustomEvent("galleryImagesReady", {
        detail: { images: GALLERY_IMAGES }
    }));
}

// Ejecutamos la detección y además volvemos a avisar cuando todo el HTML haya cargado
autoDetectGalleryImages();
window.addEventListener("load", () => {
    window.dispatchEvent(new CustomEvent("galleryImagesReady", {
        detail: { images: GALLERY_IMAGES }
    }));
});

/* ==========================================================================
   LISTA DE CANCIONES DEL REPRODUCTOR (YOUTUBE)
   ========================================================================== */
const MUSIC_TRACKS = [
    {
        id: 1,
        title: "BTS (방탄소년단) - 'FOR YOU'",
        artist: "BTS • Easy Lyrics 💜",
        cover: "https://i.ytimg.com/vi/uSzn0nAntro/hqdefault.jpg",
        src: "https://www.youtube.com/watch?v=uSzn0nAntro",
        youtubeId: "uSzn0nAntro",
        duration: "4:42"
    },
    {
        id: 2,
        title: "BTS (방탄소년단) - 'Home'",
        artist: "BTS • Easy Lyrics ✨",
        cover: "https://i.ytimg.com/vi/0oljzhY3KOI/hqdefault.jpg",
        src: "https://www.youtube.com/watch?v=0oljzhY3KOI",
        youtubeId: "0oljzhY3KOI",
        duration: "3:55"
    },
    {
        id: 3,
        title: "wave to earth - love.",
        artist: "wave to earth • Official Lyric Video 💖",
        cover: "https://i.ytimg.com/vi/Q49pnA4jsp8/hqdefault.jpg",
        src: "https://www.youtube.com/watch?v=Q49pnA4jsp8",
        youtubeId: "Q49pnA4jsp8",
        duration: "5:07"
    }
];