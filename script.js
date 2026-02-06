document.addEventListener('DOMContentLoaded', function() {
    const audioPlayer = document.getElementById('audioPlayer');
    const intervalInput = document.getElementById('interval');
    const intervalError = document.getElementById('intervalError');
    const startBtn = document.getElementById('startBtn');
    const restartBtn = document.getElementById('restartBtn');
    const stopBtn = document.getElementById('stopBtn');
    const nextBtn = document.getElementById('nextBtn');
    const resumeBtn = document.getElementById('resumeBtn');
    const statusText = document.getElementById('statusText');
    const timerText = document.getElementById('timerText');
    const songTimeLeftText = document.getElementById('songTimeLeft');
    const songTitle = document.getElementById('songTitle');
    const songArtist = document.getElementById('songArtist');
    const songDuration = document.getElementById('songDuration');
    const albumArt = document.getElementById('albumArt');
    const playlistElement = document.getElementById('playlist');
    
    const songsMap = new Map();
    const playedSongs = new Set();
    
    let isPlaying = false;
    let isPaused = false;
    let timerInterval = null;
    let nextSongTimeout = null;
    let countdownInterval = null;
    let songTimeLeftInterval = null;
    let timeLeft = 0;
    let currentSongId = null;
    let currentSongDuration = 0;
    let lastPlayedTime = 0;
    let hasStarted = false;
    
    function updateButtonStates() {
        const isValid = validateInterval();
        
        startBtn.disabled = !isValid || hasStarted;
        
        const otherBtnsActive = hasStarted && isValid;
        restartBtn.disabled = !otherBtnsActive;
        stopBtn.disabled = !otherBtnsActive;
        nextBtn.disabled = !otherBtnsActive;
        resumeBtn.disabled = !otherBtnsActive || !isPaused;
        
        if (hasStarted) {
            startBtn.classList.add('btn-disabled-permanent');
            startBtn.innerHTML = '✅ Воспроизведение начато';
        } else {
            startBtn.classList.remove('btn-disabled-permanent');
            startBtn.innerHTML = '▶️ Начать воспроизведение';
        }
    }
    
    function validateInterval() {
        const value = intervalInput.value.trim();
        
        if (value === '') {
            intervalInput.classList.add('error');
            intervalError.textContent = '⚠️ Введите число от 1 до 60 секунд';
            return false;
        }
        
        const num = parseInt(value);
        
        if (isNaN(num)) {
            intervalInput.classList.add('error');
            intervalError.textContent = '⚠️ Введите только цифры';
            return false;
        }
        
        if (num < 1 || num > 60) {
            intervalInput.classList.add('error');
            intervalError.textContent = '⚠️ Число должно быть от 1 до 60';
            return false;
        }
        
        intervalInput.classList.remove('error');
        intervalError.textContent = '';
        return true;
    }
    
    function getIntervalValue() {
        if (!validateInterval()) return 10;
        
        const num = parseInt(intervalInput.value);
        return Math.max(1, Math.min(60, num));
    }

    function formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
    }
    
    function getAudioDuration(audioUrl) {
        return new Promise((resolve) => {
            const audio = new Audio();
            
            audio.addEventListener('loadedmetadata', function() {
                resolve(Math.round(audio.duration));
            });
            
            audio.addEventListener('error', function() {
                resolve(180);
            });
            
            audio.src = audioUrl;
        });
    }
    
    async function initializeSongs() {
        const songsData = [
            { id: 1, title: "Forever", artist: "Euphoria", audio: "audio/Forever - Euphoria.mp3" },
            { id: 2, title: "Goo-goo Muck", artist: "Wednesday", audio: "audio/Goo-goo muck - Wednesday.mp3" },
            { id: 3, title: "Theme Song", artist: "Harry Potter", audio: "audio/Harry Potter's Theme Song.mp3" },
            { id: 4, title: "Kids", artist: "Stranger Things", audio: "audio/Kids - Stranger Things.mp3" },
            { id: 5, title: "Theme Song", artist: "Peaky Blinders", audio: "audio/Peaky Blinders Theme Song.mp3" },
            { id: 6, title: "The Game Is On", artist: "Sherlock Holmes", audio: "audio/The Game Is On - Sherlock Holmes.mp3" },
            { id: 7, title: "The Luck You Got", artist: "Shameless", audio: "audio/The Luck You Got Main Title - Shameless.mp3" },
            { id: 8, title: "Theme Song", artist: "Totally Spies", audio: "audio/Totally Spies — Starting Theme Song.mp3" },
            { id: 9, title: "Way Back Then", artist: "Squid Game", audio: "audio/Way Back Then - Squid Game.mp3" },
            { id: 10, title: "Where Is My Mind", artist: "Fight Club", audio: "audio/Where Is My Mind - Fight Club.mp3" }
        ];
        
        for (let song of songsData) {
            try {
                const durationSeconds = await getAudioDuration(song.audio);
                song.durationSeconds = durationSeconds;
                song.duration = formatTime(durationSeconds);
            } catch (error) {
                song.durationSeconds = 180;
                song.duration = "3:00";
            }
            songsMap.set(song.id, song);
        }
        
        renderPlaylist();
    }
    
    function renderPlaylist() {
        playlistElement.innerHTML = '';
        songsMap.forEach(song => {
            const li = document.createElement('li');
            li.dataset.id = song.id;
            li.innerHTML = `
                <div>
                    <span class="song-name">${song.title}</span>
                    <br>
                    <span class="song-artist">${song.artist}</span>
                </div>
                <span class="song-duration">${song.duration}</span>
            `;
            playlistElement.appendChild(li);
        });
    }
    
    function getRandomSong() {
        if (playedSongs.size === songsMap.size) {
            playedSongs.clear();
        }
        
        const availableIds = Array.from(songsMap.keys())
            .filter(id => !playedSongs.has(id));
        
        if (availableIds.length === 0) {
            playedSongs.clear();
            availableIds.push(...Array.from(songsMap.keys()));
        }
        
        const randomIndex = Math.floor(Math.random() * availableIds.length);
        const songId = availableIds[randomIndex];
        playedSongs.add(songId);
        
        return songsMap.get(songId);
    }
    
    function startSongTimeCountdown(durationSeconds) {
        clearInterval(songTimeLeftInterval);
        
        songTimeLeftInterval = setInterval(() => {
            if (audioPlayer.currentTime >= durationSeconds) {
                clearInterval(songTimeLeftInterval);
                songTimeLeftText.textContent = 'Осталось: 0:00';
                return;
            }
            
            const timeLeftInSong = Math.ceil(durationSeconds - audioPlayer.currentTime);
            songTimeLeftText.textContent = `Осталось: ${formatTime(timeLeftInSong)}`;
            lastPlayedTime = audioPlayer.currentTime;
        }, 1000);
    }
    
    function playSong(song, resumeFromLastPosition = false) {
        clearTimeout(nextSongTimeout);
        clearInterval(countdownInterval);
        clearInterval(songTimeLeftInterval);
        
        currentSongId = song.id;
        currentSongDuration = song.durationSeconds;
        songTitle.textContent = song.title;
        songArtist.textContent = song.artist;
        songDuration.textContent = `Длительность: ${song.duration}`;
        songTimeLeftText.textContent = 'Осталось: --';
        
        audioPlayer.src = song.audio;
        
        if (resumeFromLastPosition && lastPlayedTime > 0) {
            audioPlayer.currentTime = lastPlayedTime;
        } else {
            audioPlayer.currentTime = 0;
            lastPlayedTime = 0;
        }
        
        const playPromise = audioPlayer.play();
        
        if (playPromise !== undefined) {
            playPromise.then(() => {
                isPlaying = true;
                isPaused = false;
                albumArt.classList.add('playing');
                statusText.textContent = `Статус: Играет "${song.title}"`;
                updatePlayingClass();
                updateButtonStates();
                
                startSongTimeCountdown(song.durationSeconds);
                
                audioPlayer.onended = null;
                audioPlayer.onended = function() {
                    albumArt.classList.remove('playing');
                    clearInterval(songTimeLeftInterval);
                    songTimeLeftText.textContent = 'Осталось: 0:00';
                    statusText.textContent = `Статус: "${song.title}" завершена`;
                    scheduleNextSong();
                };
            }).catch(error => {
                console.error("Ошибка воспроизведения:", error);
                statusText.textContent = "Статус: Ошибка воспроизведения";
                setTimeout(() => {
                    scheduleNextSong();
                }, 1000);
            });
        }
    }
    
    function updatePlayingClass() {
        document.querySelectorAll('#playlist li').forEach(li => {
            li.classList.remove('playing');
        });
        
        const currentLi = document.querySelector(`#playlist li[data-id="${currentSongId}"]`);
        if (currentLi) {
            currentLi.classList.add('playing');
        }
    }
    
    function scheduleNextSong() {
        clearTimeout(nextSongTimeout);
        clearInterval(countdownInterval);
        clearInterval(songTimeLeftInterval);
        
        if (!isPlaying) return;
        
        const interval = getIntervalValue();
        timeLeft = interval;
        updateTimerText();
        
        countdownInterval = setInterval(() => {
            timeLeft--;
            updateTimerText();
            
            if (timeLeft <= 0) {
                clearInterval(countdownInterval);
                playRandomSong();
            }
        }, 1000);
        
        nextSongTimeout = setTimeout(() => {
            clearInterval(countdownInterval);
            playRandomSong();
        }, interval * 1000);
        
        statusText.textContent = `Статус: Ожидание следующей песни...`;
    }
    
    function playRandomSong() {
        const song = getRandomSong();
        playSong(song);
    }
    
    function updateTimerText() {
        timerText.textContent = `Следующая песня через: ${timeLeft} сек`;
    }
    
    function stopPlayback() {
        isPlaying = false;
        isPaused = true;
        lastPlayedTime = audioPlayer.currentTime;
        audioPlayer.pause();
        albumArt.classList.remove('playing');
        
        clearTimeout(nextSongTimeout);
        clearInterval(countdownInterval);
        clearInterval(songTimeLeftInterval);
        
        statusText.textContent = "Статус: Воспроизведение остановлено";
        timerText.textContent = "Следующая песня через: --";
        timeLeft = 0;
        
        if (currentSongId) {
            const song = songsMap.get(currentSongId);
            if (song) {
                const timeLeftInSong = Math.ceil(song.durationSeconds - lastPlayedTime);
                songTimeLeftText.textContent = `Осталось: ${formatTime(timeLeftInSong)}`;
            }
        }
        
        updatePlayingClass();
        updateButtonStates();
    }
    
    function resumePlayback() {
        if (!isPaused || !currentSongId) {
            statusText.textContent = "Статус: Нечего продолжать";
            return;
        }
        
        const song = songsMap.get(currentSongId);
        if (!song) return;
        
        isPlaying = true;
        isPaused = false;
        playSong(song, true);
    }
    
    function startPlaybackFromBeginning() {
        if (!currentSongId) {
            isPlaying = true;
            isPaused = false;
            playRandomSong();
            return;
        }
        
        isPlaying = true;
        isPaused = false;
        lastPlayedTime = 0;
        const song = songsMap.get(currentSongId);
        playSong(song, false);
    }
    
    function startNewPlayback() {
        if (!validateInterval()) {
            statusText.textContent = "Статус: Введите корректный интервал!";
            intervalInput.focus();
            return;
        }
        
        if (hasStarted) {
            statusText.textContent = "Статус: Воспроизведение уже начато! Используйте другие кнопки.";
            return;
        }
        
        hasStarted = true;
        isPlaying = true;
        isPaused = false;
        lastPlayedTime = 0;
        currentSongId = null;
        playedSongs.clear();
        playRandomSong();
        updateButtonStates();
        
        statusText.textContent = "Статус: Воспроизведение начато!";
    }
    
    function playNextSong() {
        if (!validateInterval()) {
            statusText.textContent = "Статус: Введите корректный интервал!";
            return;
        }
        
        clearTimeout(nextSongTimeout);
        clearInterval(countdownInterval);
        clearInterval(songTimeLeftInterval);
        
        const interval = getIntervalValue();
        timeLeft = interval;
        updateTimerText();
        
        statusText.textContent = `Статус: Переход к следующей песни через ${interval} секунд`;
        
        countdownInterval = setInterval(() => {
            timeLeft--;
            updateTimerText();
            
            if (timeLeft <= 0) {
                clearInterval(countdownInterval);
                isPlaying = true;
                isPaused = false;
                const song = getRandomSong();
                playSong(song);
            }
        }, 1000);
        
        nextSongTimeout = setTimeout(() => {
            clearInterval(countdownInterval);
            isPlaying = true;
            isPaused = false;
            const song = getRandomSong();
            playSong(song);
        }, interval * 1000);
    }
    
    async function init() {
        statusText.textContent = "Статус: Загрузка каталога песен...";
        
        try {
            await initializeSongs();
            statusText.textContent = "Статус: Каталог песен загружен. Введите интервал для начала.";
            updateButtonStates();
        } catch (error) {
            console.error("Ошибка инициализации песен:", error);
            statusText.textContent = "Статус: Ошибка загрузки каталога песен";
        }
        
        intervalInput.addEventListener('input', function() {
            this.value = this.value.replace(/[^0-9]/g, '');
            validateInterval();
            updateButtonStates();
        });
        
        intervalInput.addEventListener('blur', function() {
            validateInterval();
            updateButtonStates();
        });
        
        startBtn.addEventListener('click', startNewPlayback);
        restartBtn.addEventListener('click', startPlaybackFromBeginning);
        stopBtn.addEventListener('click', stopPlayback);
        nextBtn.addEventListener('click', playNextSong);
        resumeBtn.addEventListener('click', resumePlayback);
        
        playlistElement.addEventListener('click', function(e) {
            const li = e.target.closest('li');
            if (!li || !hasStarted) return;
            
            if (!validateInterval()) {
                statusText.textContent = "Статус: Введите корректный интервал!";
                return;
            }
            
            const songId = parseInt(li.dataset.id);
            const song = songsMap.get(songId);
            
            if (song) {
                clearTimeout(nextSongTimeout);
                clearInterval(countdownInterval);
                clearInterval(songTimeLeftInterval);
                
                const interval = getIntervalValue();
                timeLeft = interval;
                updateTimerText();
                
                statusText.textContent = `Статус: Воспроизведение "${song.title}" через ${interval} секунд`;
                
                countdownInterval = setInterval(() => {
                    timeLeft--;
                    updateTimerText();
                    
                    if (timeLeft <= 0) {
                        clearInterval(countdownInterval);
                        isPlaying = true;
                        isPaused = false;
                        playSong(song);
                    }
                }, 1000);
                
                nextSongTimeout = setTimeout(() => {
                    clearInterval(countdownInterval);
                    isPlaying = true;
                    isPaused = false;
                    playSong(song);
                }, interval * 1000);
            }
        });
        
        songTitle.textContent = "Название песни";
        songArtist.textContent = "Исполнитель";
        songDuration.textContent = "Длительность: 0:00";
        songTimeLeftText.textContent = "Осталось: --";
        
        audioPlayer.addEventListener('error', function() {
            console.error("Ошибка загрузки аудио");
            statusText.textContent = "Статус: Ошибка загрузки аудио";
            
            if (isPlaying) {
                setTimeout(() => {
                    scheduleNextSong();
                }, 2000);
            }
        });
        
        audioPlayer.addEventListener('timeupdate', function() {
            lastPlayedTime = audioPlayer.currentTime;
        });
    }
    
    init();
});