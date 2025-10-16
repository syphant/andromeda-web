<p align="center">
  <img src="https://raw.githubusercontent.com/syphant/andromeda-web/refs/heads/main/logo.png" /><br><br>
</p>

<p align="center">
  A modern, minimalist implementation of a web interface for viewing an ErsatzTV channel livestream with an integrated TV guide display.
</p>

<p align="center">
  <br><a href="https://andromedatv.cc/"><img src="https://img.shields.io/badge/DEMO-3388FE?style=for-the-badge"></a><br>
</p>

## Features

### Video Streaming
- **Manual Play Control**: Click-to-connect streaming to avoid autoplay blocking due to browser policies
- **HLS Support**: Compatible with both HLS.js and native HLS playback
- **Minimal Controls**: Clean player interface with only volume control, fullscreen and PIP buttons
- **Responsive Design**: Optimized for both desktop and mobile viewing

### TV Guide Integration
- **Real-time Schedule**: JavaScript consumes ErsatzTV's native XMLTV program guide to be displayed in a custom format with live updates
- **Smart Time Display**: Clean time ranges with contextual date information
- **Program Details**: Expandable episode/movie descriptions with smooth animations
- **Episode Number / Release Year Display**: Movie release years and series episode numbers and episode titles are shown below the movie and series titles
- **Live Indicator**: "LIVE" badge shown in schedule entry for currently playing content

### Design & UX
- **Pure Black & White**: Exclusively monochrome color scheme
- **Custom Typography**: NewDetroit font for headers, Inter for body text
- **Smooth Animations**: Cubic-bezier transitions for schedule updates
- **Mobile Optimized**: Touch-friendly interface with clean layouts
- **Progressive Enhancement**: Graceful fallbacks for all browser capabilities
- **Browser-Theme-Dependent Favicon**: Via realfavicongenerator.net

## Technology Stack

- **Frontend**: HTML5, CSS, JavaScript + HLS.js library
- **Backend**: Cloudflare Tunnel to Caddy for ErsatzTV XMLTV & M3U8 on isolated iptv path, Cloudflare Tunnel to Nginx for hosting HTML/CSS/JS and proxying transport stream

## File Structure

```
html/
├── index.html              # Main page with video player and schedule
├── schedule.html           # Dedicated schedule page
├── iptv.html               # IPTV instructions page
├── newdetroit.ttf          # Custom font file
├── *.png/*.ico/*.svg       # Favicons / web app icons
└── site.webmanifest        # Web app manifest
nginx/
└── default.conf            # Nginx proxy config
README.md                   # This file
```

## Setup & Configuration

### Prerequisites
- ErsatzTV server
- Nginx
- Cloudflare Tunnel
- Caddy
- Your own domain

### Cloudflare Tunnel & Caddy Configuration
- In Cloudflare Tunnel, create a route to point your subdomain to your LAN server running Caddy on port 80, example: "http://192.168.1.100:80"
- In Caddyfile, add entry to point these subdomain requests to ErsatzTV, restricted to ONLY the "[https://subdomain.yourdomain.com/iptv/*]()" path so that the ErsatzTV admin UI is NOT exposed:
```
:80 {
    handle /iptv/* {
    reverse_proxy http://192.168.1.100:8409
    }
    respond "Not Found" 404
}
```
- Confirm ErsatzTV admin UI **is not** accessible at https://subdomain.yourdomain.com (should get a "Not Found" 404 error)
- Confirm xmltv.xml **is** accessible at https://subdomain.yourdomain.com/iptv/xmltv.xml
- Confirm m3u8 file **is** accessible at [https://subdomain.yourdomain.com/iptv/channel/`<channel_number>`.m3u8?mode=segmenter]()
- In Cloudflare Tunnel, create another route to point just the domain "yourdomain.com" to LAN server running Nginx on another port of your choosing, example: "http://192.168.1.100:9884"

### Nginx Configuration
The `nginx/default.conf` file provides:
- Proxy pass to ErsatzTV stream endpoints (`/stream/`)
- XMLTV guide data proxy (`/guide/`)
- CORS headers for cross-origin requests
- URL rewriting for seamless integration
- Docker compose file for this nginx implementation:
```
services:
  nginx:
    image: nginx:stable-alpine
    container_name: nginx
    ports:
      - 9884:80
    volumes:
      - /path/to/here/html:/usr/share/nginx/html:ro
      - /path/to/here/nginx/default.conf:/etc/nginx/conf.d/default.conf:ro
    restart: unless-stopped
```

### ErsatzTV Integration
- **Stream URL**: `https://subdomain.yourdomain.com/iptv/channel/2.m3u8?mode=segmenter`
- **Guide Data**: `https://subdomain.yourdomain.com/iptv/xmltv.xml`
- **Channel**: Currently configured for channel ID "2"
- Example ErsatzTV docker compose file for this implementation:
```
services:
  ersatztv:
    image: ghcr.io/ersatztv/ersatztv:latest
    restart: unless-stopped
    ports:
      - 8409:8409
    devices:
      - /dev/dri:/dev/dri
    volumes:
      - ./config:/config
      - /path/to/media:/media
      - type: tmpfs
        target: /transcode
    environment:
      - TZ=America/New_York
```

## Key Features Explained

### Manual Connection System
Unlike traditional video players, Andromeda requires user interaction to connect to the stream. This design choice:
- Ensures unmuted playback (due to browser autoplay policies)
- Provides real-time stream access when user is ready (prevents buffering delay due to time between page load and clicking play)

### Smart Time Formatting
The schedule displays times intelligently:
- **Today**: Simple time ranges (6:19 PM - 6:48 PM)
- **Future Days**: Clean format with separate date line
- **Cross-day Programs**: Handles midnight crossings gracefully

### Expandable Program Details
- Click any program with a description to expand
- Smooth animations with staggered timing
- HTML content sanitization for safe display
- Automatic cleanup of animation classes

## Browser Compatibility

- **Chrome/Chromium**: Full HLS.js support
- **Firefox**: Full HLS.js support  
- **Safari**: Native HLS support fallback
- **Mobile Browsers**: Optimized touch interface
- **Legacy Browsers**: Graceful degradation

## Customization

### Colors
The interface uses a pure black and white color scheme for a "Y2K underground adult swim / toonami" vibe:
- Background: `#000000` (pure black)
- Text: `#ffffff` (pure white)
- Secondary: Various grays (`#cccccc`, `#aaaaaa`, etc.)

### Fonts
- **Headers**: NewDetroit (custom) → Inter → sans-serif
- **Body**: Inter → sans-serif
- **Sizes**: Optimized for readability across devices

### Animation Timing
- Schedule updates: 400ms cubic-bezier transitions
- Hover effects: 300ms ease transitions
- Program expansions: 400ms cubic-bezier(0.4, 0, 0.2, 1)

## Development Notes

### JavaScript Architecture
- Modular function design with clear separation of concerns
- Event-driven updates with 60-second guide refresh intervals
- Error handling with user-friendly fallbacks
- Progressive enhancement principles

### CSS Methodology
- Mobile-first responsive design
- Component-based styling approach
- CSS custom properties for maintainability
- Performance-optimized animations

### Data Handling
- XMLTV parsing with DOMParser
- Time zone aware date/time processing
- HTML sanitization for security
- Graceful handling of missing data

## Future Enhancements

Potential improvements for future versions:
- Support for switching between multiple channels

---
