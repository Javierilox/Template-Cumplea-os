/* ==========================================================================
   REPRODUCTOR DE MÚSICA YOUTUBE + BUSCADOR DE ALTA PRECISIÓN (js/music.js)
   ========================================================================== */

let tracks = (typeof MUSIC_TRACKS !== 'undefined') ? MUSIC_TRACKS : [];
let currentTrackIndex = 0;
let isPlaying = false;
let isShuffle = false;
let isRepeat = false;
let ytPlayer = null;
let isYtReady = false;
let pendingPlay = false;
let progressInterval = null;

// Elementos del DOM (según tu index.html)
const vinylDisc = document.getElementById('vinyl-disc');
const trackCover = document.getElementById('current-track-cover');
const trackTitle = document.getElementById('current-track-title');
const trackArtist = document.getElementById('current-track-artist');
const currentTimeEl = document.getElementById('current-time');
const totalDurationEl = document.getElementById('total-duration');
const progressBar = document.getElementById('progress-bar');
const volumeSlider = document.getElementById('volume-slider');

const btnPlayPause = document.getElementById('btn-play-pause');
const btnPrev = document.getElementById('btn-prev-track');
const btnNext = document.getElementById('btn-next-track');
const btnShuffle = document.getElementById('btn-shuffle-music');
const btnRepeat = document.getElementById('btn-repeat-music');
const playlistContainer = document.getElementById('playlist-container');

const ytSearchInput = document.getElementById('yt-search-input');
const ytSearchBtn = document.getElementById('yt-search-btn');
const ytSearchResults = document.getElementById('yt-search-results');

// 1. Asegurar que el contenedor de YouTube tenga al menos 200x200px
// (Chrome bloquea el audio si el iframe mide 1x1px o tiene display:none)
function setupHiddenPlayerContainer() {
    let container = document.getElementById('yt-hidden-player');
    if (!container) {
        container = document.createElement('div');
        container.id = 'yt-hidden-player';
        document.body.appendChild(container);
    }
    container.style.cssText = 'position:fixed; left:-9999px; bottom:0; width:220px; height:220px; z-index:-1; pointer-events:none;';
}

// 2. Cargar API de YouTube
setupHiddenPlayerContainer();
const ytScript = document.createElement('script');
ytScript.src = "https://www.youtube.com/iframe_api";
document.head.appendChild(ytScript);

window.onYouTubeIframeAPIReady = function () {
    const firstId = extractYouTubeId(tracks[0]);
    const playerVars = {
        'playsinline': 1,
        'autoplay': 0,
        'controls': 0,
        'rel': 0,
        'enablejsapi': 1
    };

    // Solo enviamos 'origin' si se abre en http/https (evita error en file://)
    if (window.location.protocol.startsWith('http')) {
        playerVars.origin = window.location.origin;
    }

    ytPlayer = new YT.Player('yt-hidden-player', {
        height: '220',
        width: '220',
        videoId: firstId,
        playerVars: playerVars,
        events: {
            'onReady': onPlayerReady,
            'onStateChange': onPlayerStateChange,
            'onError': onPlayerError
        }
    });
};

function extractYouTubeId(track) {
    if (!track) return "uSzn0nAntro";
    if (track.youtubeId) return track.youtubeId;
    const url = track.src || track.url || "";
    const match = url.match(/(?:v=|youtu\.be\/|embed\/)([0-9A-Za-z_-]{11})/);
    return match ? match[1] : "uSzn0nAntro";
}

function onPlayerReady() {
    isYtReady = true;
    const initialVol = volumeSlider ? parseFloat(volumeSlider.value) * 100 : 80;
    ytPlayer.setVolume(initialVol);
    loadTrackUI(currentTrackIndex);

    if (pendingPlay) {
        pendingPlay = false;
        ytPlayer.playVideo();
    }
}

function onPlayerStateChange(event) {
    if (event.data === YT.PlayerState.PLAYING) {
        isPlaying = true;
        updatePlayPauseUI();
        startProgressTimer();
    } else if (event.data === YT.PlayerState.PAUSED) {
        isPlaying = false;
        updatePlayPauseUI();
        stopProgressTimer();
    } else if (event.data === YT.PlayerState.ENDED) {
        stopProgressTimer();
        if (isRepeat) {
            ytPlayer.seekTo(0);
            ytPlayer.playVideo();
        } else {
            nextTrack();
        }
    }
}

function onPlayerError(event) {
    console.warn("Error de reproducción de YouTube:", event.data);
    if (window.location.protocol === 'file:') {
        alert("⚠️ Nota importante: Abriste el archivo con doble clic (file://). YouTube bloquea las canciones si no usas un servidor local como 'Live Server' en VS Code (http://localhost).");
    } else {
        // Si un video específico tiene restricción de inserción, pasa al siguiente
        nextTrack();
    }
}

// 3. Renderizar Playlist e Interfaz
function renderPlaylist() {
    if (!playlistContainer) return;
    playlistContainer.innerHTML = '';

    tracks.forEach((track, index) => {
        const ytId = extractYouTubeId(track);
        const coverUrl = track.cover || `https://i.ytimg.com/vi/${ytId}/hqdefault.jpg`;

        const li = document.createElement('li');
        li.className = `playlist-item ${index === currentTrackIndex ? 'active' : ''}`;
        li.style.cssText = 'display:flex; align-items:center; padding:10px; border-radius:10px; cursor:pointer; margin-bottom:8px; transition:0.2s;';
        li.innerHTML = `
            <img src="${coverUrl}" alt="${track.title}" style="width:48px; height:48px; border-radius:8px; object-fit:cover; flex-shrink:0;">
            <div style="flex:1; margin-left:12px; overflow:hidden;">
                <h4 style="margin:0; font-size:0.95rem; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${track.title}</h4>
                <p style="margin:2px 0 0; font-size:0.8rem; opacity:0.75;">${track.artist}</p>
            </div>
            <span style="font-size:0.8rem; opacity:0.75; margin-left:8px;">${track.duration || ''}</span>
        `;
        li.addEventListener('click', () => selectAndPlayTrack(index));
        playlistContainer.appendChild(li);
    });
}

function loadTrackUI(index) {
    const track = tracks[index];
    if (!track) return;

    const ytId = extractYouTubeId(track);
    const coverUrl = track.cover || `https://i.ytimg.com/vi/${ytId}/hqdefault.jpg`;

    if (trackCover) trackCover.src = coverUrl;
    if (trackTitle) trackTitle.textContent = track.title;
    if (trackArtist) trackArtist.textContent = track.artist;
    if (currentTimeEl) currentTimeEl.textContent = "0:00";
    if (totalDurationEl) totalDurationEl.textContent = track.duration || "0:00";
    if (progressBar) progressBar.value = 0;

    renderPlaylist();
}

function selectAndPlayTrack(index) {
    currentTrackIndex = index;
    loadTrackUI(currentTrackIndex);
    const ytId = extractYouTubeId(tracks[currentTrackIndex]);

    if (isYtReady && ytPlayer && ytPlayer.loadVideoById) {
        ytPlayer.loadVideoById(ytId);
        ytPlayer.playVideo();
    } else {
        pendingPlay = true;
    }
}

function togglePlayPause() {
    if (!isYtReady || !ytPlayer) {
        pendingPlay = true;
        return;
    }
    const state = ytPlayer.getPlayerState();
    if (state === YT.PlayerState.PLAYING) {
        ytPlayer.pauseVideo();
    } else {
        ytPlayer.playVideo();
    }
}

function updatePlayPauseUI() {
    if (btnPlayPause) {
        btnPlayPause.textContent = isPlaying ? '⏸' : '▶';
    }
    if (vinylDisc) {
        vinylDisc.classList.toggle('playing', isPlaying);
        vinylDisc.classList.toggle('spinning', isPlaying);
    }
}

function nextTrack() {
    if (isShuffle) {
        currentTrackIndex = Math.floor(Math.random() * tracks.length);
    } else {
        currentTrackIndex = (currentTrackIndex + 1) % tracks.length;
    }
    selectAndPlayTrack(currentTrackIndex);
}

function prevTrack() {
    currentTrackIndex = (currentTrackIndex - 1 + tracks.length) % tracks.length;
    selectAndPlayTrack(currentTrackIndex);
}

// 4. Barra de progreso
function startProgressTimer() {
    stopProgressTimer();
    progressInterval = setInterval(() => {
        if (ytPlayer && typeof ytPlayer.getCurrentTime === 'function') {
            const current = ytPlayer.getCurrentTime();
            const duration = ytPlayer.getDuration();
            if (duration > 0) {
                if (progressBar) progressBar.value = (current / duration) * 100;
                if (currentTimeEl) currentTimeEl.textContent = formatTime(current);
                if (totalDurationEl) totalDurationEl.textContent = formatTime(duration);
            }
        }
    }, 500);
}

function stopProgressTimer() {
    if (progressInterval) clearInterval(progressInterval);
}

function formatTime(seconds) {
    if (!seconds || isNaN(seconds)) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

// 5. BUSCADOR PRECISO EN YOUTUBE (Multi-servidor + Soporte de Links Directos)
async function searchYouTubeSongs() {
    const query = ytSearchInput.value.trim();
    if (!query) return;

    ytSearchResults.classList.remove('hidden');
    ytSearchResults.innerHTML = `<li style="padding:10px; text-align:center;">🔎 Buscando "${query}" en YouTube...</li>`;

    // A) Si el usuario pega un link de YouTube directamente, obtenemos su título real con NoEmbed
    const directMatch = query.match(/(?:v=|youtu\.be\/|embed\/)([0-9A-Za-z_-]{11})/);
    if (directMatch) {
        const videoId = directMatch[1];
        try {
            const metaRes = await fetch(`https://noembed.com/embed?url=https://www.youtube.com/watch?v=${videoId}`);
            const meta = await metaRes.json();
            addAndPlaySearchedSong({
                title: meta.title || "Canción de YouTube",
                artist: meta.author_name || "YouTube",
                youtubeId: videoId,
                cover: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
                duration: ""
            });
        } catch (e) {
            addAndPlaySearchedSong({
                title: "Canción de YouTube",
                artist: "YouTube",
                youtubeId: videoId,
                cover: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
                duration: ""
            });
        }
        ytSearchResults.classList.add('hidden');
        ytSearchInput.value = '';
        return;
    }

    // B) Búsqueda por texto usando múltiples APIs de YouTube (Piped + Invidious) con filtro de videos generales para máxima precisión
    const searchQuery = `${query} audio OR lyrics`;
    const pipedServers = [
        "https://pipedapi.kavin.rocks",
        "https://pipedapi.tokhmi.xyz",
        "https://pipedapi.moomoo.me",
        "https://pipedapi.syncpundit.io"
    ];

    for (const server of pipedServers) {
        try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 4000);

            const res = await fetch(`${server}/search?q=${encodeURIComponent(searchQuery)}&filter=videos`, {
                signal: controller.signal
            });
            clearTimeout(timeout);

            if (!res.ok) continue;
            const data = await res.json();
            const items = (data.items || []).filter(item => item.url && item.url.includes("v=")).slice(0, 6);

            if (items.length > 0) {
                renderSearchResults(items.map(item => ({
                    videoId: item.url.split('v=')[1].substring(0, 11),
                    title: item.title,
                    artist: item.uploaderName || 'YouTube',
                    duration: item.duration ? formatTime(item.duration) : '',
                    thumbnail: `https://i.ytimg.com/vi/${item.url.split('v=')[1].substring(0, 11)}/hqdefault.jpg`
                })));
                return;
            }
        } catch (err) {
            // Intenta automáticamente con el siguiente servidor
        }
    }

    // C) Respaldo con servidores Invidious si Piped está saturado
    const invidiousServers = [
        "https://inv.tux.pizza",
        "https://invidious.nerdvpn.de",
        "https://yt.artemislena.eu"
    ];

    for (const server of invidiousServers) {
        try {
            const res = await fetch(`${server}/api/v1/search?q=${encodeURIComponent(query)}&type=video`);
            if (!res.ok) continue;
            const data = await res.json();
            const items = (data || []).filter(item => item.videoId).slice(0, 6);

            if (items.length > 0) {
                renderSearchResults(items.map(item => ({
                    videoId: item.videoId,
                    title: item.title,
                    artist: item.author || 'YouTube',
                    duration: item.lengthSeconds ? formatTime(item.lengthSeconds) : '',
                    thumbnail: `https://i.ytimg.com/vi/${item.videoId}/hqdefault.jpg`
                })));
                return;
            }
        } catch (err) {
            // Continúa al siguiente
        }
    }

    ytSearchResults.innerHTML = `
        <li style="padding:12px; font-size:0.85rem; text-align:center;">
            💡 Pega directamente el link de YouTube de la canción arriba y presiona <strong>Buscar</strong> para reproducirla al instante.
        </li>`;
}

function renderSearchResults(items) {
    ytSearchResults.innerHTML = '';
    items.forEach(item => {
        const li = document.createElement('li');
        li.className = 'yt-result-item';
        li.innerHTML = `
            <img src="${item.thumbnail}" alt="${item.title}" style="width:45px; height:45px; border-radius:6px; object-fit:cover; flex-shrink:0;">
            <div style="flex:1; margin-left:10px; overflow:hidden;">
                <strong style="display:block; font-size:0.85rem; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${item.title}</strong>
                <span style="font-size:0.75rem; opacity:0.75;">${item.artist}${item.duration ? '• ' + item.duration : ''}</span>
            </div>
            <button type="button" style="background:#ff6b9d; color:#fff; border:none; border-radius:15px; padding:5px 12px; cursor:pointer; font-size:0.8rem; font-weight:600; flex-shrink:0;">▶ Sonar</button>
        `;

        li.addEventListener('click', () => {
            addAndPlaySearchedSong({
                title: item.title,
                artist: item.artist,
                youtubeId: item.videoId,
                cover: item.thumbnail,
                duration: item.duration
            });
            ytSearchResults.classList.add('hidden');
            ytSearchInput.value = '';
        });

        ytSearchResults.appendChild(li);
    });
}

function addAndPlaySearchedSong(newTrack) {
    const existingIndex = tracks.findIndex(t => extractYouTubeId(t) === newTrack.youtubeId);
    if (existingIndex !== -1) {
        selectAndPlayTrack(existingIndex);
    } else {
        tracks.push(newTrack);
        selectAndPlayTrack(tracks.length - 1);
    }
}

// 6. Inicialización de eventos
document.addEventListener('DOMContentLoaded', () => {
    renderPlaylist();
    loadTrackUI(0);

    if (btnPlayPause) btnPlayPause.addEventListener('click', togglePlayPause);
    if (btnNext) btnNext.addEventListener('click', nextTrack);
    if (btnPrev) btnPrev.addEventListener('click', prevTrack);

    if (btnShuffle) {
        btnShuffle.addEventListener('click', () => {
            isShuffle = !isShuffle;
            btnShuffle.classList.toggle('active', isShuffle);
        });
    }

    if (btnRepeat) {
        btnRepeat.addEventListener('click', () => {
            isRepeat = !isRepeat;
            btnRepeat.classList.toggle('active', isRepeat);
        });
    }

    if (progressBar) {
        progressBar.addEventListener('input', (e) => {
            if (isYtReady && ytPlayer && ytPlayer.getDuration) {
                const seekToTime = (e.target.value / 100) * ytPlayer.getDuration();
                ytPlayer.seekTo(seekToTime, true);
            }
        });
    }

    if (volumeSlider) {
        volumeSlider.addEventListener('input', (e) => {
            if (isYtReady && ytPlayer) {
                ytPlayer.setVolume(e.target.value * 100);
            }
        });
    }

    if (ytSearchBtn) ytSearchBtn.addEventListener('click', searchYouTubeSongs);
    if (ytSearchInput) {
        ytSearchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                searchYouTubeSongs();
            }
        });
    }
});