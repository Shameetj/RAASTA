# 🧭 RAASTA (रास्ता) — Accessible Navigation System
> **Routes that understand physical accessibility.** Real-time step-free pathfinding, live GPS navigation, and community barrier reporting.

[![Cloudflare Pages](https://img.shields.io/badge/Live-raasta.pages.dev-blue?style=for-the-badge&logo=cloudflare)](https://raasta.pages.dev/)
[![React](https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react)](https://react.dev/)
[![Python](https://img.shields.io/badge/Python-3.10+-3776AB?style=for-the-badge&logo=python)](https://python.org/)
[![OpenStreetMap](https://img.shields.io/badge/Maps-OpenStreetMap-7EBC6F?style=for-the-badge&logo=openstreetmap)](https://openstreetmap.org/)

---

## 📱 Live Web Application (No Download Required)

You can open and use RAASTA instantly on any smartphone, tablet, or computer:

👉 **[https://raasta.pages.dev/](https://raasta.pages.dev/)**

### 📲 Install on Mobile (PWA — Works like a Native App)
RAASTA is a Progressive Web App (PWA). You can install it directly onto your phone without using the Play Store or App Store:
- **Android (Chrome)**: Open [https://raasta.pages.dev/](https://raasta.pages.dev/) $\rightarrow$ Tap the 3 dots (**⋮**) in top right $\rightarrow$ Tap **"Add to Home screen"** or **"Install app"**.
- **iPhone (Safari)**: Open [https://raasta.pages.dev/](https://raasta.pages.dev/) $\rightarrow$ Tap the Share icon ($\uparrow$) at the bottom $\rightarrow$ Tap **"Add to Home Screen"**.
- The **RAASTA app icon** will appear on your home screen, launching full-screen with instant GPS location locking.

---

## 🎯 What is RAASTA?

Conventional map applications optimize strictly for distance and travel time. They often guide pedestrians into insurmountable barriers:
- Flight of stairs with no ramp
- Steep curbs or broken sidewalks
- Blocked accessibility corridors
- Construction hazards

**RAASTA asks a different question:**
> *“Can the person actually navigate this path safely?”*

RAASTA evaluates routes against real physical accessibility barriers and automatically calculates detours around hazards.

---

## ✨ Key Features

| Feature | Description |
| :--- | :--- |
| ♿ **Step-Free Routing** | Automatically detours around pedestrian stairs, broken ramps, and steep slopes. Prioritizes gentle ramps and flat sidewalks. |
| 🦻 **Deaf & Hard of Hearing Mode** | Replaces audio guidance with high-contrast visual cues, turn notifications, and crosswalk warning banners. |
| 📍 **Real-Time GPS Centering** | Fast dual-mode geolocation locks onto your live mobile GPS position in <150ms and keeps you centered on the map. |
| ⚠️ **Live Hazard Reporting** | Users can report blockages (stairs, construction, damaged ramps) directly on the map. The system immediately registers the obstacle and routes around it. |
| 🌐 **24/7 Cloud Architecture** | Hosted on Cloudflare Pages with OpenStreetMap integration. Completely resilient, working seamlessly anywhere in the world. |

---

## 💻 How to Download and Run Locally

If you want to clone this project to your computer and run it locally:

### 1. Prerequisites
- **Git**: [Download Git](https://git-scm.com/)
- **Node.js (v18 or higher)**: [Download Node.js](https://nodejs.org/)
- **Python (v3.10 or higher)**: [Download Python](https://python.org/) *(Optional, for local backend development)*

### 2. Clone the Repository
Open your terminal (PowerShell, Command Prompt, or Bash) and run:
```bash
git clone https://github.com/Shameetj/RAASTA.git
cd RAASTA
```

### 3. Run the Frontend
```bash
cd frontend
npm install
npm run dev
```
Open your browser and visit: **`http://localhost:5173`**

---

### 4. Run the Backend (Optional)
If you want to run the local Python pathfinding engine alongside the frontend:

```bash
# From the project root:
cd backend
pip install -r developer1/requirements.txt
pip install -r developer2/requirements.txt
python server.py
```
The unified backend will start on **`http://localhost:8000`**.

> **Tip for Windows Users**: You can double-click `start_silent_backend.vbs` to launch all backend services silently in the background without keeping any command prompt windows open.

---

## 🏗️ Architecture & Technology Stack

```text
               +-------------------------------------------+
               |        User Interface (React + Vite)      |
               |  - Leaflet / OpenStreetMap Canvas         |
               |  - Real Mobile GPS Geolocation Tracker    |
               |  - Wheelchair / Deaf Mode Profiles        |
               +---------------------+---------------------+
                                     |
               +---------------------+---------------------+
               |      Cloudflare Edge Serverless API       |
               |  - /api/routes/calculate                  |
               |  - /api/blockages & /api/locations        |
               +---------------------+---------------------+
                                     |
               +---------------------+---------------------+
               |    OSRM & Dijkstra Pathfinding Engine     |
               |  - Global OpenStreetMap Road Network      |
               |  - Collision & Hazard Buffer Detection    |
               |  - Real-Time Detour Rerouting             |
               +-------------------------------------------+
```

- **Frontend**: React 18, Vite, React-Leaflet, TailwindCSS, Lucide Icons, Canvas-Confetti.
- **Routing Engine**: OpenStreetMap (OSRM) Road Graph, Dijkstra Shortest Path, Haversine collision math.
- **Backend**: Python FastAPI, HTTP server, SQLite/In-memory store.
- **Hosting**: Cloudflare Pages, Edge Functions, GitHub.

---

## 🤝 How to Contribute
1. Fork the repository on GitHub.
2. Create a feature branch: `git checkout -b feature/accessible-feature`.
3. Commit your changes: `git commit -m "Add new accessible route metric"`.
4. Push to the branch: `git push origin feature/accessible-feature`.
5. Open a Pull Request.

---

## 📄 License
This project is open source and available under the [MIT License](LICENSE).
