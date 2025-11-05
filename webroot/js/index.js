let hls;
let video;
let streamStarted = false;
let streamReady = false;
const isFirefox = navigator.userAgent.toLowerCase().includes('firefox');

function initializeStreamAndPlay() {
    if (streamStarted) return;

    video = document.getElementById('andromeda-player');
    const streamUrl = '/stream/channel/1.m3u8?mode=segmenter';

    console.log('Connecting to stream...');

    video.playbackRate = 1.0;

    Object.defineProperty(video, 'playbackRate', {
        get: function() {
            return 1.0;
        },
        set: function(value) {}
    });

    video.addEventListener('click', function(e) {
        if (!e.target.closest('[class*="controls"]')) {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
            if (video.paused) {
                video.play();
            }
            return false;
        }
    }, true);

    video.pause = function() {
        console.log('Pause blocked (this is a livestream)');
        return false;
    };

    video.addEventListener('pause', function(e) {
        console.log('Pause event detected, resuming...');
        setTimeout(() => {
            if (video.paused && streamStarted) {
                video.play();
            }
        }, 10);
    });

    video.addEventListener('keydown', function(e) {
        if (e.code === 'Space') {
            e.preventDefault();
            return false;
        }
    });

    if (Hls.isSupported()) {
        hls = new Hls({
            enableWorker: true,
            lowLatencyMode: true,
            backBufferLength: 90
        });

        hls.loadSource(streamUrl);
        hls.attachMedia(video);

        hls.on(Hls.Events.MANIFEST_PARSED, function() {
            console.log('Stream manifest loaded, starting playback...');
            video.muted = false;
            video.play().then(() => {
                console.log('Playback started successfully');
                document.getElementById('click-overlay').style.display = 'none';
                streamStarted = true;
                streamReady = true;
                hideOverflowMenu();
            }).catch((e) => {
                console.error('Stream playback failed:', e);
                document.getElementById('click-overlay').innerHTML = '<div class="play-icon">❌</div><div class="play-text">Connection Failed</div>';
            });
        });

        hls.on(Hls.Events.ERROR, function(event, data) {
            console.error('HLS error:', data);
            if (data.fatal) {
                switch (data.type) {
                    case Hls.ErrorTypes.NETWORK_ERROR:
                        console.log('Network error - trying to recover...');
                        hls.startLoad();
                        break;
                    case Hls.ErrorTypes.MEDIA_ERROR:
                        console.log('Media error - trying to recover...');
                        hls.recoverMediaError();
                        break;
                    default:
                        console.log('Fatal error - destroying HLS instance');
                        hls.destroy();
                        break;
                }
            }
        });

    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = streamUrl;
        video.addEventListener('loadedmetadata', function() {
            console.log('Stream loaded (native HLS) - starting playback...');
            video.muted = false;
            video.play().then(() => {
                console.log('Playback started successfully (native HLS');
                document.getElementById('click-overlay').style.display = 'none';
                streamStarted = true;
                streamReady = true;
            }).catch((e) => {
                console.error('Native HLS playback failed:', e);
                document.getElementById('click-overlay').innerHTML = '<div class="play-icon">❌</div><div class="play-text">Connection Failed</div>';
            });
        });

        video.addEventListener('error', function(e) {
            console.error('Video error:', e);
        });
    } else {
        console.error('HLS is not supported in this browser');
        document.getElementById('click-overlay').innerHTML = '<div class="play-icon">❌</div><div class="play-text">HLS Not Supported</div>';
    }
}

function initializeStream() {
    initializeStreamAndPlay();
}

function hideOverflowMenu() {
    setTimeout(() => {
        const video = document.getElementById('andromeda-player');

        const shadowRoot = video.shadowRoot;
        if (shadowRoot) {
            const overflowButtons = shadowRoot.querySelectorAll('[pseudo="-webkit-media-controls-overflow-button"], .overflow-button');
            overflowButtons.forEach(btn => btn.style.display = 'none');
        }

        const controls = video.querySelectorAll('*');
        controls.forEach(control => {
            if (control.textContent && control.textContent.includes('⋮')) {
                control.style.display = 'none';
            }
        });

        const buttons = document.querySelectorAll('video button, video [role="button"]');
        buttons.forEach(btn => {
            const style = getComputedStyle(btn);
            if (style.backgroundImage && style.backgroundImage.includes('overflow') ||
                btn.getAttribute('aria-label') && btn.getAttribute('aria-label').toLowerCase().includes('more')) {
                btn.style.display = 'none';
            }
        });
    }, 1000);
}

function enableFirefoxCustomControls(videoElement, videoContainer) {
    if (!videoElement || !videoContainer) {
        return;
    }

    if (videoContainer.querySelector('.firefox-controls')) {
        return;
    }

    videoElement.controls = false;
    videoContainer.classList.add('firefox-controls-enabled');

    const controls = document.createElement('div');
    controls.className = 'firefox-controls';
    controls.innerHTML = `
        <button type="button" class="firefox-control-btn mute-btn" aria-label="Mute">
            <i class="fa-solid fa-volume-high" aria-hidden="true"></i>
        </button>
        <input type="range" class="firefox-volume-slider" min="0" max="1" step="0.01" value="${videoElement.muted ? 0 : videoElement.volume}">
        <button type="button" class="firefox-control-btn fullscreen-btn" aria-label="Enter fullscreen">⛶</button>
    `;

    const hotspot = document.createElement('div');
    hotspot.className = 'firefox-controls-hotspot';

    videoContainer.appendChild(hotspot);
    videoContainer.appendChild(controls);

    const muteButton = controls.querySelector('.mute-btn');
    const volumeSlider = controls.querySelector('.firefox-volume-slider');
    const fullscreenButton = controls.querySelector('.fullscreen-btn');
    let hideControlsTimeout;

    const showControls = () => {
        clearTimeout(hideControlsTimeout);
        videoContainer.classList.add('controls-visible');
    };

    const scheduleHideControls = () => {
        clearTimeout(hideControlsTimeout);
        hideControlsTimeout = window.setTimeout(() => {
            if (!videoContainer.contains(document.activeElement)) {
                videoContainer.classList.remove('controls-visible');
            }
        }, 200);
    };

    const muteIcon = muteButton ? muteButton.querySelector('i') : null;

    const syncVolumeUi = () => {
        const isMuted = videoElement.muted || videoElement.volume === 0;
        if (volumeSlider) {
            const newValue = isMuted ? 0 : videoElement.volume;
            if (parseFloat(volumeSlider.value) !== newValue) {
                volumeSlider.value = newValue;
            }
        }
        if (muteButton) {
            muteButton.setAttribute('aria-label', isMuted ? 'Unmute' : 'Mute');
        }
        if (muteIcon) {
            muteIcon.classList.toggle('fa-volume-xmark', isMuted);
            muteIcon.classList.toggle('fa-volume-high', !isMuted);
        }
    };

    const syncFullscreenUi = () => {
        const isFullscreen = document.fullscreenElement === videoContainer;
        if (fullscreenButton) {
            fullscreenButton.textContent = isFullscreen ? '🗗' : '⛶';
            fullscreenButton.setAttribute('aria-label', isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen');
            fullscreenButton.classList.toggle('active', isFullscreen);
        }
    };

    if (muteButton) {
        muteButton.addEventListener('click', () => {
            const willMute = !(videoElement.muted || videoElement.volume === 0);
            if (willMute) {
                videoElement.muted = true;
            } else {
                videoElement.muted = false;
                if (videoElement.volume === 0) {
                    videoElement.volume = 0.5;
                }
            }
        });
    }

    if (volumeSlider) {
        volumeSlider.addEventListener('input', (event) => {
            const value = parseFloat(event.target.value);
            videoElement.volume = value;
            videoElement.muted = value === 0;
        });
    }

    if (fullscreenButton) {
        fullscreenButton.addEventListener('click', () => {
            if (document.fullscreenElement === videoContainer) {
                document.exitFullscreen().catch(() => {});
            } else if (videoContainer.requestFullscreen) {
                videoContainer.requestFullscreen().catch(() => {});
            }
        });
    }

    hotspot.addEventListener('mouseenter', showControls);
    hotspot.addEventListener('mouseleave', scheduleHideControls);

    controls.addEventListener('mouseenter', showControls);
    controls.addEventListener('mouseleave', scheduleHideControls);
    controls.addEventListener('focusin', showControls);
    controls.addEventListener('focusout', scheduleHideControls);

    videoContainer.addEventListener('mouseleave', scheduleHideControls);

    videoElement.addEventListener('volumechange', syncVolumeUi);
    document.addEventListener('fullscreenchange', syncFullscreenUi);

    syncVolumeUi();
    syncFullscreenUi();
    scheduleHideControls();
}

let currentPrograms = [];
let guideUpdateInterval;

function fetchTVGuide() {
    console.log('Fetching schedule data...');

    fetch('/guide/xmltv.xml')
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.text();
        })
        .then(xmlText => {
            console.log('Schedule data received');
            parseTVGuide(xmlText);
        })
        .catch(error => {
            console.error('Error fetching schedule data:', error);
            document.getElementById('program-guide').innerHTML =
                '<div class="error">Error loading schedule. Please try refreshing the page.</div>';
        });
}

function parseTVGuide(xmlText) {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlText, 'text/xml');

    const programmes = xmlDoc.querySelectorAll('programme[channel="C1.145.ersatztv.org"]');

    if (programmes.length === 0) {
        console.log('No schedule data found for channel');
        document.getElementById('program-guide').innerHTML =
            '<div class="error">No schedule data available.</div>';
        return;
    }

    console.log(`Found ${programmes.length} scheduled items for channel`);
    parseProgrammes(programmes);
}

function parseProgrammes(programmes) {
    const now = new Date();
    const programs = [];

    programmes.forEach(programme => {
        const startTime = parseXMLTVTime(programme.getAttribute('start'));
        const stopTime = parseXMLTVTime(programme.getAttribute('stop'));

        if (stopTime > now) {
            const titleElement = programme.querySelector('title');
            const descElement = programme.querySelector('desc');
            const episodeElement = programme.querySelector('episode-num[system="onscreen"]');
            const subTitleElement = programme.querySelector('sub-title');
            const dateElement = programme.querySelector('date');

            let episodeText = '';
            if (episodeElement) {
                episodeText = episodeElement.textContent;
                if (subTitleElement && subTitleElement.textContent) {
                    episodeText += ': ' + subTitleElement.textContent;
                }
            }

            let releaseYear = '';
            if (dateElement && dateElement.textContent) {
                const dateText = dateElement.textContent.trim();
                const yearMatch = dateText.match(/(\d{4})/);
                if (yearMatch) {
                    releaseYear = yearMatch[1];
                }
            }

            if (!episodeText && releaseYear) {
                episodeText = releaseYear;
            }

            programs.push({
                title: titleElement ? titleElement.textContent : 'Unknown Program',
                description: descElement ? descElement.textContent : '',
                episode: episodeText,
                releaseYear: releaseYear,
                startTime: startTime,
                stopTime: stopTime,
                isCurrent: startTime <= now && stopTime > now
            });
        }
    });

    programs.sort((a, b) => a.startTime - b.startTime);

    currentPrograms = programs;
    renderTVGuide();
}

function parseXMLTVTime(timeString) {
    if (!timeString) return new Date();

    const year = parseInt(timeString.substr(0, 4));
    const month = parseInt(timeString.substr(4, 2)) - 1;
    const day = parseInt(timeString.substr(6, 2));
    const hour = parseInt(timeString.substr(8, 2));
    const minute = parseInt(timeString.substr(10, 2));
    const second = parseInt(timeString.substr(12, 2));

    return new Date(year, month, day, hour, minute, second);
}

function formatTime(date) {
    const today = new Date();
    const isToday = date.toDateString() === today.toDateString();

    if (isToday) {
        return date.toLocaleTimeString([], {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
        });
    } else {
        const dayStr = date.toLocaleDateString([], {
            weekday: 'short'
        });
        const dateStr = date.toLocaleDateString([], {
            month: 'numeric',
            day: 'numeric'
        });
        const timeStr = date.toLocaleTimeString([], {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
        });
        return `${dayStr} ${dateStr} @ ${timeStr}`;
    }
}

function formatTimeRange(startDate, endDate) {
    const startTime = startDate.toLocaleTimeString([], {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
    });
    const endTime = endDate.toLocaleTimeString([], {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
    });

    return `${startTime} - ${endTime}`;
}

function formatDateInfo(startDate, endDate) {
    const now = new Date();
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);

    const isStartToday = startDate.toDateString() === today.toDateString();
    const isStartYesterday = startDate.toDateString() === yesterday.toDateString();
    const isSameDay = startDate.toDateString() === endDate.toDateString();
    const isCurrentlyRunning = startDate <= now && endDate > now;
    const isAfterMidnight = now.getHours() < 6;

    if (isStartToday) {
        return '';
    } else if (isStartYesterday && isCurrentlyRunning && isAfterMidnight) {
        return '';
    } else if (isSameDay) {
        const dayStr = startDate.toLocaleDateString([], {
            weekday: 'short'
        });
        const dateStr = startDate.toLocaleDateString([], {
            month: 'numeric',
            day: 'numeric'
        });
        return `${dayStr} ${dateStr}`;
    } else {
        const startDay = startDate.toLocaleDateString([], {
            weekday: 'short'
        });
        const startDateStr = startDate.toLocaleDateString([], {
            month: 'numeric',
            day: 'numeric'
        });
        return `${startDay} ${startDateStr}`;
    }
}

function renderTVGuide(animate = false) {
    const guideContainer = document.getElementById('program-guide');

    if (currentPrograms.length === 0) {
        guideContainer.innerHTML = '<div class="error">No upcoming programs found.</div>';
        return;
    }

    if (animate) {
        const programList = document.querySelector('.program-list');
        if (programList) {
            programList.classList.add('updating');
        }

        const existingItems = document.querySelectorAll('.program-item');
        existingItems.forEach((item, index) => {
            setTimeout(() => {
                item.classList.add('leaving');
            }, index * 50);
        });

        setTimeout(() => {
            updateGuideContent();
            if (programList) {
                programList.classList.remove('updating');
            }
        }, 400);
    } else {
        updateGuideContent();
    }
}

function updateGuideContent() {
    const guideContainer = document.getElementById('program-guide');

    const html = currentPrograms.map((program, index) => {
        const cleanTitle = escapeHtml(program.title);
        const cleanEpisode = escapeHtml(program.episode);
        const cleanDescription = escapeHtml(program.description);
        const hasDescription = program.description && program.description.trim().length > 0;

        return `
                <div class="program-item ${program.isCurrent ? 'current' : ''} ${!hasDescription ? 'no-description' : ''} entering" 
                     onclick="toggleProgramDetails(this)" 
                     style="${!hasDescription ? 'cursor: default;' : ''} animation-delay: ${index * 100}ms;">
                    <div class="program-header">
                        <div>
                            <h3 class="program-title">${cleanTitle}</h3>
                            ${program.episode ? `<p class="program-episode">${cleanEpisode}</p>` : ''}
                        </div>
                        <div class="program-time">
                            <div class="time-range">${formatTimeRange(program.startTime, program.stopTime)}</div>
                            ${formatDateInfo(program.startTime, program.stopTime) ? `<div class="date-info">${formatDateInfo(program.startTime, program.stopTime)}</div>` : ''}
                        </div>
                    </div>
                    ${hasDescription ? `<div class="program-description">${cleanDescription}</div>` : ''}
                    ${program.isCurrent ? '<span class="live-badge">LIVE</span>' : ''}
                </div>
                `;
    }).join('');

    guideContainer.innerHTML = html;

    setTimeout(matchGuideHeightToVideo, 100);

    setTimeout(() => {
        const items = document.querySelectorAll('.program-item');
        items.forEach(item => {
            item.classList.remove('entering', 'leaving');
            item.style.animationDelay = '';
        });
    }, 1000);
}

function toggleProgramDetails(element) {
    if (element.classList.contains('no-description')) {
        return;
    }

    const allItems = document.querySelectorAll('.program-item.expanded');
    allItems.forEach(item => {
        if (item !== element) {
            item.classList.remove('expanded');
        }
    });

    element.classList.toggle('expanded');

    if (element.classList.contains('expanded')) {
        setTimeout(() => {
            const rect = element.getBoundingClientRect();
            const windowHeight = window.innerHeight;

            if (rect.bottom > windowHeight - 50) {
                element.scrollIntoView({
                    behavior: 'smooth',
                    block: 'nearest'
                });
            }
        }, 300);
    }
}

function escapeHtml(text) {
    if (!text) return '';

    const div = document.createElement('div');
    div.innerHTML = text;

    const htmlContent = div.innerHTML
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<\/p>/gi, '\n')
        .replace(/<p>/gi, '')
        .replace(/<[^>]*>/g, '');

    const cleanDiv = document.createElement('div');
    cleanDiv.textContent = htmlContent;

    return cleanDiv.innerHTML.replace(/\n/g, '<br>');
}

function updateGuide() {
    const now = new Date();
    let needsRefresh = false;

    currentPrograms.forEach(program => {
        const wasCurrent = program.isCurrent;
        program.isCurrent = program.startTime <= now && program.stopTime > now;

        if (wasCurrent !== program.isCurrent) {
            needsRefresh = true;
        }
    });

    const initialLength = currentPrograms.length;
    currentPrograms = currentPrograms.filter(program => program.stopTime > now);

    if (currentPrograms.length !== initialLength) {
        needsRefresh = true;
    }

    if (needsRefresh) {
        console.log('Schedule updated, refreshing display');
        renderTVGuide(true);
    }

    if (currentPrograms.length < 3) {
        fetchTVGuide();
    }
}

function matchGuideHeightToVideo() {
    if (window.innerWidth >= 1200) {
        const videoSection = document.querySelector('.video-section');
        const guideContainer = document.querySelector('.guide-container');

        if (videoSection && guideContainer) {
            const videoSectionHeight = videoSection.offsetHeight;

            if (videoSectionHeight > 0) {
                guideContainer.style.setProperty('height', videoSectionHeight + 'px', 'important');
                guideContainer.style.setProperty('max-height', videoSectionHeight + 'px', 'important');

                const programList = document.querySelector('.program-list');
                const guideTitle = document.querySelector('.guide-container h2');
                if (programList && guideTitle) {
                    const titleHeight = guideTitle.offsetHeight;
                    const titleMargin = parseInt(getComputedStyle(guideTitle).marginBottom);
                    const availableHeight = videoSectionHeight - titleHeight - titleMargin - 20; // 20px buffer
                    programList.style.setProperty('max-height', Math.max(200, availableHeight) + 'px', 'important');
                    programList.style.setProperty('height', Math.max(200, availableHeight) + 'px', 'important');
                }
            }
        }
    } else {
        const guideContainer = document.querySelector('.guide-container');
        const programList = document.querySelector('.program-list');
        if (guideContainer) {
            guideContainer.style.removeProperty('height');
            guideContainer.style.removeProperty('max-height');
        }
        if (programList) {
            programList.style.removeProperty('height');
            programList.style.removeProperty('max-height');
        }
    }
}

document.addEventListener('DOMContentLoaded', function() {
    document.getElementById('click-overlay').style.display = 'block';

    const overlay = document.getElementById('click-overlay');
    overlay.addEventListener('click', function() {
        console.log('Play button clicked - initializing...');
        const video = document.getElementById('andromeda-player');

        if (!video) {
            console.error('Video element not found');
            return;
        }

        if (!streamStarted) {
            overlay.innerHTML = '<div class="play-icon"></div><div class="play-text"></div>';

            initializeStreamAndPlay();
        } else {
            console.log('Stream already started');
        }
    });

    const videoElement = document.getElementById('andromeda-player');
    const videoContainer = document.querySelector('.video-container');

    if (isFirefox) {
        enableFirefoxCustomControls(videoElement, videoContainer);
    } else if (videoElement && videoContainer) {
        const showNativeControls = () => videoElement.setAttribute('controls', '');
        const hideNativeControls = () => videoElement.removeAttribute('controls');

        hideNativeControls();
        videoContainer.addEventListener('mouseenter', showNativeControls);
        videoContainer.addEventListener('mouseleave', hideNativeControls);
        videoElement.addEventListener('focus', showNativeControls);
        videoElement.addEventListener('blur', hideNativeControls);
    } else if (videoElement) {
        videoElement.setAttribute('controls', '');
    }

    if (videoElement) {
        videoElement.addEventListener('loadedmetadata', matchGuideHeightToVideo);
        videoElement.addEventListener('loadeddata', matchGuideHeightToVideo);
        videoElement.addEventListener('canplay', matchGuideHeightToVideo);
        videoElement.addEventListener('resize', matchGuideHeightToVideo);

        if (window.ResizeObserver) {
            const resizeObserver = new ResizeObserver(matchGuideHeightToVideo);
            resizeObserver.observe(videoElement);
        }

        setTimeout(matchGuideHeightToVideo, 500);
        setTimeout(matchGuideHeightToVideo, 1000);
        setTimeout(matchGuideHeightToVideo, 2000);
        setTimeout(matchGuideHeightToVideo, 5000);
    }

    window.addEventListener('resize', function() {
        clearTimeout(window.resizeTimeout);
        window.resizeTimeout = setTimeout(matchGuideHeightToVideo, 250);
    });

    fetchTVGuide();

    setTimeout(matchGuideHeightToVideo, 100);

    guideUpdateInterval = setInterval(updateGuide, 60000);

});