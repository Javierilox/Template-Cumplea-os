/* ==========================================================================
   REPRODUCTOR DE MÚSICA YOUTUBE + BUSCADOR (js/music.js - Corregido)
   ========================================================================== */

let tracks = (typeof MUSIC_TRACKS !== 'undefined') ? MUSIC_TRACKS : [];
let currentTrackIndex = 0;
let isPlaying = false;
let isShuffle = false;
let isRepeat = false;
let usingDirectAudio = false;
let ytPlayer = null;
let isYtReady = false;
let pendingPlay = false;
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

// 1. Extraer stream de audio limpio (sin anuncios) desde Piped API
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

// 2. Configurar el contenedor de YouTube
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
        host: 'https://www.youtube-nocookie.com',
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

// 3. Selección y reproducción con índices validados (Solución al salto)
async function selectAndPlayTrack(index) {
    if (!tracks || tracks.length === 0) return;

    // Control estricto de límites del arreglo
    if (index < 0) index = tracks.length - 1;
    if (index >= tracks.length) index = 0;

    currentTrackIndex = index;
    loadTrackUI(currentTrackIndex);
    
    const track = tracks[currentTrackIndex];
    const ytId = extractYouTubeId(track);

    if (audioPlayer) {
        audioPlayer.pause();
        audioPlayer.src = "";
    }
    if (isYtReady && ytPlayer && ytPlayer.stopVideo) {
        ytPlayer.stopVideo();
    }

    if (track.src && track.src.endsWith('.mp3')) {
        usingDirectAudio = true;
        audioPlayer.src = track.src;
        audioPlayer.play();
        return;
    }

    if (ytId) {
        const cleanStreamUrl = await getAdFreeAudioStream(ytId);
        if (cleanStreamUrl && audioPlayer) {
            usingDirectAudio = true;
            audioPlayer.src = cleanStreamUrl;
            audioPlayer.volume = volumeSlider ? parseFloat(volumeSlider.value) : 0.8;
            try {
                await audioPlayer.play();
                return;
            } catch (err) {
                console.warn("Pasando a reproductor de respaldo...");
            }
        }

        usingDirectAudio = false;
        if (isYtReady && ytPlayer && ytPlayer.loadVideoById) {
            ytPlayer.loadVideoById(ytId);
            ytPlayer.playVideo();
        } else {
            pendingPlay = true;
        }
    }
}

// Eventos de audio HTML5
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

// 4. Renderizado de la Playlist con clase activa sincronizada
function renderPlaylist() {
    if (!playlistContainer) return;
    playlistContainer.innerHTML = '';

    tracks.forEach((track, index) => {
        const ytId = extractYouTubeId(track);
        const coverUrl = track.cover || `https://i.ytimg.com/vi/${ytId}/hqdefault.jpg`;
        const isActive = index === currentTrackIndex;

        const li = document.createElement('li');
        li.className = `playlist-item ${isActive ? 'active' : ''}`;
        li.style.cssText = `display:flex; align-items:center; padding:10px; border-radius:10px; cursor:pointer; margin-bottom:8px; background: ${isActive ? 'rgba(255, 107, 157, 0.15)' : 'transparent'}; border: ${isActive ? '1px solid #ff6b9d' : '1px solid transparent'}; transition:0.2s;`;
        
        li.innerHTML = `
            <img src="${coverUrl}" alt="${track.title}" style="width:48px; height:48px; border-radius:8px; object-fit:cover; flex-shrink:0;">
            <div style="flex:1; margin-left:12px; overflow:hidden;">
                <h4 style="margin:0; font-size:0.95rem; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${track.title}</h4>
                <p style="margin:2px 0 0; font-size:0.8rem; opacity:0.75;">${track.artist}</p>
            </div>
            <span style="font-size:0.8rem; opacity:0.75; flex-shrink:0;">${track.duration || ''}</span>
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

// 5. Buscador en YouTube
async function searchYouTubeSongs() {
    const query = ytSearchInput.value.trim();
    if (!query) return;

    ytSearchResults.classList.remove('hidden');
    ytSearchResults.innerHTML = `<li style="padding:10px; text-align:center;">🔎 Buscando "${query}" en YouTube...</li>`;

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

    const searchQuery = `${query} audio OR lyrics`;
    const pipedServers = [
        "https://pipedapi.kavin.rocks",
        "https://pipedapi.tokhmi.xyz",
        "https://pipedapi.moomoo.me"
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
        } catch (err) {}
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
                <span style="font-size:0.75rem; opacity:0.75;">${item.artist} ${item.duration ? '• ' + item.duration : ''}</span>
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