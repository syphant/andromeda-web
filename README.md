<div align="center">
  <h2>Andromeda</h2>
  <p>A customizable template of a web interface for viewing an ErsatzTV channel livestream with an integrated TV guide display.</p><br>
  <img src="https://raw.githubusercontent.com/ccorb324/andromeda-web/refs/heads/main/preview.png" />
</div>


## Features

### Video Player
- Requires user interaction to connect to the stream to avoid issues with browser autoplay policies and prevents stream delay due to time between page load and clicking play
- Clean player interface with minimal controls (only volume control, fullscreen and PIP buttons)
- Responsive design compatible with desktop, tablet and mobile displays

### Schedule
- JavaScript consumes ErsatzTV's native XMLTV program guide to be displayed in a custom format with 60s refresh interval
- Displays time ranges intelligently with contextual date information
- Click a schedule item to expand and display the episode/movie synopsis with smooth animations
- Movie release years, series episode numbers and episode titles are shown below the main movie and series titles
- "LIVE" badge shown on schedule entry for the currently playing content
- Provides a separately accessible page with schedule display

### IPTV Proxy
- Extends ErsatzTV's IPTV capability by proxying M3U and XMLTV sources so they are reachable by IPTV clients remotely over the internet
- Provides a separately accessible page with instructions for remote client IPTV setup

### Design & UX
- Monochrome dark theme
- NewDetroit font for headers, Inter for body text, JetBrains Mono for monospaced text
- Smooth cubic-bezier transition animations for schedule updates
- Touch-friendly interface for mobile devices
- Graceful fallbacks for all browser capabilities
- Browser-theme-dependent favicon generated with [realfavicongenerator.net](https://realfavicongenerator.net)

## Technology Stack

- **Frontend**: HTML5, CSS, JavaScript + HLS.js library
- **Backend**: ErsatzTV, Cloudflare Tunnel, Caddy (for ErsatzTV XMLTV & M3U8 on isolated `iptv/*` path), Nginx (for hosting HTML/CSS/JavaScript and proxying http transport stream from ErsatzTV)

## File Structure

```
nginx/
  └── default.conf             # Nginx config template
webroot/
  ├── index.html               # Main page with video player and schedule
  ├── iptv.html                # IPTV setup instructions page
  ├── schedule.html            # Dedicated schedule page
  ├── css/
  │     ├── index.css          # Stylesheet for main page
  │     ├── iptv.css           # Stylesheet for IPTV page
  │     └── schedule.css       # Stylesheet for schedule page
  ├── js/
  │     ├── index.js           # Scripts for main page
  │     ├── iptv.js            # Scripts for IPTV page
  │     └── schedule.js        # Scripts for schedule page
  ├── favicon/
  │     ├── *.png/*.ico/*.svg  # Favicons / web app icons
  │     └── site.webmanifest   # Web app manifest
  └── fonts/
        └── newdetroit.ttf     # Custom font file
README.md                      # This file
```

## Setup & Configuration

### Prerequisites
- ErsatzTV server
- Nginx
- Cloudflare Tunnel
- Caddy
- Your own domain

### Caddy Configuration
#### Example Caddy docker compose file (using Caddy build with Cloudflare module):
```
services:
  caddy:
    image: ghcr.io/caddybuilds/caddy-cloudflare:latest
    restart: unless-stopped
    cap_add:
      - NET_ADMIN
    ports:
      - 80:80
      - 443:443
      - 443:443/udp
    volumes:
      - ./caddy/Caddyfile:/etc/caddy/Caddyfile
      - ./caddy/site:/srv
      - ./caddy/caddy_data:/data
      - ./caddy/caddy_config:/config
    environment:
      - CLOUDFLARE_API_TOKEN=<xxxxxxxxxxxxxxxxx>
```
- In Caddyfile, use the below config to point these subdomain requests to ErsatzTV, restricted to **ONLY** the `https://subdomain.yourdomain.com/iptv/*` path so that the ErsatzTV admin UI is **NOT** exposed:
```
:80 {
    handle /iptv/* {
    reverse_proxy http://192.168.1.100:8409
    }
    respond "Not Found" 404
}
```

### Cloudflare Tunnel Configuration
- In Cloudflare Tunnel, create an http (not https) route to point `subdomain.yourdomain.com` to your LAN server running Caddy, example: `http://192.168.1.100:80`
- In Cloudflare Tunnel, create another route to point just the domain `yourdomain.com` to LAN server running Nginx on another port of your choosing, example: `http://192.168.1.100:9884`
- Confirm ErsatzTV admin UI **is not** accessible at `https://subdomain.yourdomain.com` (you should get a "Not Found" 404 error)
- Confirm xmltv.xml **is** accessible at `https://subdomain.yourdomain.com/iptv/xmltv.xml`
- Confirm m3u8 file **is** accessible at `https://subdomain.yourdomain.com/iptv/channel/<channel_number>.m3u8?mode=segmenter`

### Nginx Configuration
The `nginx/default.conf` file template provides:
- Proxy pass to ErsatzTV stream endpoints (`/stream/`)
- XMLTV guide data proxy (`/guide/`)
- CORS headers for cross-origin requests
- URL rewriting for seamless integration
- Simply replace `http://subdomain.yourdomain.com` in the `nginx/default.conf` file with what you configured in Cloudflare Tunnel

#### Example Nginx docker compose file:
```
services:
  nginx:
    image: nginx:stable-alpine
    container_name: nginx
    ports:
      - 9884:80
    volumes:
      - /path/to/repo/webroot:/usr/share/nginx/html:ro
      - /path/to/repo/nginx/default.conf:/etc/nginx/conf.d/default.conf:ro
    restart: unless-stopped
```

### ErsatzTV Integration
- **Stream URL**: `https://subdomain.yourdomain.com/iptv/channel/1.m3u8?mode=segmenter`
- **Guide Data**: `https://subdomain.yourdomain.com/iptv/xmltv.xml`
- **Channel**: Current scripts are configured for `C1.148.ersatztv.org`, you can change this in the `index.js` file if needed based on the channel ID shown in your XMLTV file

#### Example ErsatzTV docker compose file:
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
      - ./ersatztv/config:/config
      - /path/to/media:/media
      - type: tmpfs
        target: /transcode
    environment:
      - TZ=America/New_York
```

## Browser Compatibility

- **Chrome/Chromium**: Full HLS.js support
- **Firefox**: Full HLS.js support  
- **Safari**: Native HLS support fallback
- **Mobile Browsers**: Optimized touch interface
- **Legacy Browsers**: Graceful degradation

## Future Enhancements

Potential improvements for future versions:
- Support for switching between multiple channels (maybe)

---
