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
            console.error('Error fetching TV guide:', error);
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
            '<div class="error">No schedule data available for channel.</div>';
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
    const today = new Date();
    const isStartToday = startDate.toDateString() === today.toDateString();
    const isSameDay = startDate.toDateString() === endDate.toDateString();

    if (isStartToday) {
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
        guideContainer.innerHTML = '<div class="error">No upcoming scheduled items found.</div>';
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

document.addEventListener('DOMContentLoaded', function () {

    fetchTVGuide();

    guideUpdateInterval = setInterval(updateGuide, 60000);
});