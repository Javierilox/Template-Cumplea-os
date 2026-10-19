/* ==========================================================================
   REPRODUCTOR HÍBRIDO SIN ANUNCIOS (Audio Directo Piped + Respaldo YouTube)
   ========================================================================== */

let tracks = (typeof MUSIC_TRACKS !== 'undefined') ? MUSIC_TRACKS : [];
let currentTrackIndex = 0;
let isPlaying = false;
let isShuffle = false;
let isRepeat = false;
let usingDirectAudio = false; // Indica si estamos usando el stream limpio sin anuncios
let ytPlayer = null;
let isYtReady = false;
let progressInterval = null;

// Elementos del DOM de index.html
const audioPlayer = document.getElementById('audio-player');
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

// 1. Extraer stream de audio directo SIN ANUNCIOS desde Piped API
async function getAdFreeAudioStream(videoId) {
    const pipedInstances = [
        "https://pipedapi.kavin.rocks",
        "https://pipedapi.tokhmi.xyz",
        "https://pipedapi.moomoo.me"
    ];

    for (const api of pipedInstances) {
        try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 3500);

            const res = await fetch(`${api}/streams/${videoId}`, { signal: controller.signal });
            clearTimeout(timeout);

            if (!res.ok) continue;
            const data = await res.json();

            if (data.audioStreams && data.audioStreams.length > 0) {
                // Ordenamos por mejor calidad de audio compatible
                const bestStream = data.audioStreams.find(s => s.mimeType.includes('audio/mp4')) || data.audioStreams[0];
                if (bestStream && bestStream.url) {
                    return bestStream.url;
                }
            }
        } catch (e) {
            // Intenta con el siguiente servidor
        }
    }
    return null;
}

// 2. Configurar YouTube No-Cookie como respaldo
function setupHiddenPlayerContainer() {
    let container = document.getElementById('yt-hidden-player');
    if (!container) {
        container = document.createElement('div');
        container.id = 'yt-hidden-player';
        document.body.appendChild(container);
    }
    container.style.cssText = 'position:fixed; left:-9999px; bottom:0; width:220px; height:220px; z-index:-1; pointer-events:none;';
}

setupHiddenPlayerContainer();
const ytScript = document.createElement('script');
ytScript.src = "https://www.youtube.com/iframe_api";
document.head.appendChild(ytScript);

window.onYouTubeIframeAPIReady = function () {
    const firstId = extractYouTubeId(tracks[0]);
    ytPlayer = new YT.Player('yt-hidden-player', {
        height: '220',
        width: '220',
        host: 'https://www.youtube-nocookie.com', // Reduce rastreo y anuncios personalizados
        videoId: firstId,
        playerVars: {
            'playsinline': 1,
            'autoplay': 0,
            'controls': 0,
            'rel': 0,
            'iv_load_policy': 3
        },
        events: {
            'onReady': () => {
                isYtReady = true;
                if (volumeSlider) ytPlayer.setVolume(volumeSlider.value * 100);
            },
            'onStateChange': (e) => {
                if (usingDirectAudio) return;
                if (e.data === YT.PlayerState.PLAYING) {
                    isPlaying = true;
                    updatePlayPauseUI();
                    startProgressTimer();
                } else if (e.data === YT.PlayerState.PAUSED) {
                    isPlaying = false;
                    updatePlayPauseUI();
                    stopProgressTimer();
                } else if (e.data === YT.PlayerState.ENDED) {
                    handleTrackEnd();
                }
            }
        }
    });
};

function extractYouTubeId(track) {
    if (!track) return "uSzn0nAntro";
    if (track.youtubeId) return track.youtubeId;
    const url = track.src || track.url || "";
    const match = url.match(/(?:v=|youtu\.be\/|embed\/)([0-9A-Za-z_-]{11})/);
    return match ? match[1] : null;
}

// 3. Seleccionar y reproducir canción (Priorizando Audio Limpio Sin Anuncios)
async function selectAndPlayTrack(index) {
    currentTrackIndex = index;
    loadTrackUI(currentTrackIndex);
    const track = tracks[currentTrackIndex];
    const ytId = extractYouTubeId(track);

    // Detener ambos reproductores antes de cambiar
    if (audioPlayer) {
        audioPlayer.pause();
        audioPlayer.src = "";
    }
    if (isYtReady && ytPlayer && ytPlayer.stopVideo) {
        ytPlayer.stopVideo();
    }

    // A) Si es un archivo MP3 local (ej. assets/music/cancion1.mp3)
    if (track.src && track.src.endsWith('.mp3')) {
        usingDirectAudio = true;
        audioPlayer.src = track.src;
        audioPlayer.play();
        return;
    }

    // B) Intentamos obtener el stream directo sin anuncios de YouTube
    if (ytId) {
        const cleanStreamUrl = await getAdFreeAudioStream(ytId);
        if (cleanStreamUrl && audioPlayer) {
            usingDirectAudio = true;
            audioPlayer.src = cleanStreamUrl;
            audioPlayer.volume = volumeSlider ? parseFloat(volumeSlider.value) : 0.8;
            try {
                await audioPlayer.play();
                return; // ¡Sonando sin anuncios!
            } catch (err) {
                console.warn("Pasando a reproductor de respaldo...");
            }
        }

        // C) Si los servidores están ocupados, usa el IFrame de respaldo
        usingDirectAudio = false;
        if (isYtReady && ytPlayer && ytPlayer.loadVideoById) {
            ytPlayer.loadVideoById(ytId);
            ytPlayer.playVideo();
        }
    }
}

// Eventos del reproductor <audio> HTML5 (Sin anuncios)
if (audioPlayer) {
    audioPlayer.addEventListener('play', () => {
        if (!usingDirectAudio) return;
        isPlaying = true;
        updatePlayPauseUI();
    });
    audioPlayer.addEventListener('pause', () => {
        if (!usingDirectAudio) return;
        isPlaying = false;
        updatePlayPauseUI();
    });
    audioPlayer.addEventListener('timeupdate', () => {
        if (!usingDirectAudio || !audioPlayer.duration) return;
        progressBar.value = (audioPlayer.currentTime / audioPlayer.duration) * 100;
        currentTimeEl.textContent = formatTime(audioPlayer.currentTime);
        totalDurationEl.textContent = formatTime(audioPlayer.duration);
    });
    audioPlayer.addEventListener('ended', () => {
        if (!usingDirectAudio) return;
        handleTrackEnd();
    });
}

function handleTrackEnd() {
    stopProgressTimer();
    if (isRepeat) {
        selectAndPlayTrack(currentTrackIndex);
    } else {
        nextTrack();
    }
}

function togglePlayPause() {
    if (usingDirectAudio && audioPlayer && audioPlayer.src) {
        if (audioPlayer.paused) audioPlayer.play();
        else audioPlayer.pause();
    } else if (isYtReady && ytPlayer) {
        const state = ytPlayer.getPlayerState();
        if (state === YT.PlayerState.PLAYING) ytPlayer.pauseVideo();
        else ytPlayer.playVideo();
    } else {
        selectAndPlayTrack(currentTrackIndex);
    }
}

function updatePlayPauseUI() {
    if (btnPlayPause) btnPlayPause.textContent = isPlaying ? '⏸' : '▶';
    if (vinylDisc) {
        vinylDisc.classList.toggle('playing', isPlaying);
        vinylDisc.classList.toggle('spinning', isPlaying);
    }
}

function nextTrack() {
    currentTrackIndex = isShuffle
        ? Math.floor(Math.random() * tracks.length)
        : (currentTrackIndex + 1) % tracks.length;
    selectAndPlayTrack(currentTrackIndex);
}

function prevTrack() {
    currentTrackIndex = (currentTrackIndex - 1 + tracks.length) % tracks.length;
    selectAndPlayTrack(currentTrackIndex);
}

function renderPlaylist() {
    if (!playlistContainer) return;
    playlistContainer.innerHTML = '';
    tracks.forEach((track, index) => {
        const ytId = extractYouTubeId(track);
        const coverUrl = track.cover || `https://i.ytimg.com/vi/${ytId}/hqdefault.jpg`;
        const li = document.createElement('li');
        li.className = `playlist-item ${index === currentTrackIndex ? 'active' : ''}`;
        li.style.cssText = 'display:flex; align-items:center; padding:10px; border-radius:10px; cursor:pointer; margin-bottom:8px;';
        li.innerHTML = `
            <img src="${coverUrl}" alt="${track.title}" style="width:48px; height:48px; border-radius:8px; object-fit:cover;">
            <div style="flex:1; margin-left:12px; overflow:hidden;">
                <h4 style="margin:0; font-size:0.95rem; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${track.title}</h4>
                <p style="margin:2px 0 0; font-size:0.8rem; opacity:0.75;">${track.artist}</p>
            </div>
            <span style="font-size:0.8rem; opacity:0.75;">${track.duration || ''}</span>
        `;
        li.addEventListener('click', () => selectAndPlayTrack(index));
        playlistContainer.appendChild(li);
    });
}

function loadTrackUI(index) {
    const track = tracks[index];
    if (!track) return;
    const ytId = extractYouTubeId(track);
    if (trackCover) trackCover.src = track.cover || `https://i.ytimg.com/vi/${ytId}/hqdefault.jpg`;
    if (trackTitle) trackTitle.textContent = track.title;
    if (trackArtist) trackArtist.textContent = track.artist;
    if (currentTimeEl) currentTimeEl.textContent = "0:00";
    if (totalDurationEl) totalDurationEl.textContent = track.duration || "0:00";
    if (progressBar) progressBar.value = 0;
    renderPlaylist();
}

function startProgressTimer() {
    stopProgressTimer();
    progressInterval = setInterval(() => {
        if (!usingDirectAudio && ytPlayer && typeof ytPlayer.getCurrentTime === 'function') {
            const current = ytPlayer.getCurrentTime();
            const duration = ytPlayer.getDuration();
            if (duration > 0) {
                progressBar.value = (current / duration) * 100;
                currentTimeEl.textContent = formatTime(current);
                totalDurationEl.textContent = formatTime(duration);
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

document.addEventListener('DOMContentLoaded', () => {
    renderPlaylist();
    loadTrackUI(0);
    if (btnPlayPause) btnPlayPause.addEventListener('click', togglePlayPause);
    if (btnNext) btnNext.addEventListener('click', nextTrack);
    if (btnPrev) btnPrev.addEventListener('click', prevTrack);
    if (progressBar) {
        progressBar.addEventListener('input', (e) => {
            if (usingDirectAudio && audioPlayer.duration) {
                audioPlayer.currentTime = (e.target.value / 100) * audioPlayer.duration;
            } else if (isYtReady && ytPlayer && ytPlayer.getDuration) {
                ytPlayer.seekTo((e.target.value / 100) * ytPlayer.getDuration(), true);
            }
        });
    }
    if (volumeSlider) {
        volumeSlider.addEventListener('input', (e) => {
            if (audioPlayer) audioPlayer.volume = parseFloat(e.target.value);
            if (isYtReady && ytPlayer) ytPlayer.setVolume(e.target.value * 100);
        });
    }
});