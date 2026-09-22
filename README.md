<<<<<<< HEAD
# ⛈️ NWA Platform — National Weather Big Data Analytics & Early Warning Platform

> **Smart India Hackathon (SIH) Solution**  
> An enterprise-grade, high-throughput meteorological intelligence system designed to collect, process, analyze, deduplicate, and visualize real-time weather observations and public incident telemetry across India.

---

## 🏗️ System Architecture & Data Pipeline

```
                              ┌────────────────────────────────────────────────────────┐
                              │                 LIVE DATA INGESTION                    │
                              └──────────────────────────┬─────────────────────────────┘
                                                         │
         ┌───────────────────┬───────────────────┬───────┴───────────┬───────────────────┐
         ▼                   ▼                   ▼                   ▼                   ▼
 ┌───────────────┐   ┌───────────────┐   ┌───────────────┐   ┌───────────────┐   ┌───────────────┐
 │ Public APIs   │   │ Social Streams│   │ Citizen Posts │   │ UN GDACS      │   │ Reddit API    │
 │ (Open-Meteo / │   │ (X/Twitter,   │   │ (Form + File  │   │ Disaster      │   │ Weather       │
 │ WeatherAPI)   │   │ Instagram)    │   │ Uploads)      │   │ Feed)         │   │ Discussions)  │
 └───────┬───────┘   └───────┬───────┘   └───────┬───────┘   └───────┬───────┘   └───────┬───────┘
         │                   │                   │                   │                   │
         └───────────────────┴─────────┬─────────┴───────────────────┴───────────────────┘
                                       │
                                       ▼
                     ┌──────────────────────────────────┐
                     │ Stream Ingestion Buffer / Kafka  │
                     │ (Redis Cache & Multi-Partition)  │
                     └─────────────────┬────────────────┘
                                       │
                                       ▼
                     ┌──────────────────────────────────┐
                     │  AI / ML Telemetry Engine        │
                     │  • Naive Bayes Classifier        │
                     │  • TF-IDF NLP Credibility        │
                     │  • Jaccard + Haversine Deduplication
                     │  • Source Trust Scoring          │
                     └─────────────────┬────────────────┘
                                       │
                                       ▼
                     ┌──────────────────────────────────┐
                     │ Centralized Relational Persistence│
                     │ (SQLite WAL Mode + Redis Store)  │
                     └─────────────────┬────────────────┘
                                       │
                                       ▼
                     ┌──────────────────────────────────┐
                     │  Real-Time Visualization & SSE   │
                     │  • Leaflet Interactive Heatmap   │
                     │  • Chart.js Analytics Dashboard  │
                     │  • Supervisory Moderation Portal │
                     └──────────────────────────────────┘
```

---

## ✨ Key Features & Capability Matrix

| Feature | Tech Stack / Standard | Description |
|---|---|---|
| **Multi-Source Data Ingestion** | Open-Meteo, WeatherAPI, Twitter v2, Instagram Graph, UN GDACS, Reddit API | Automatically ingests live weather observations, severe alerts, and social media posts every 25 seconds. |
| **Hashtag Tracking** | NLP + Hashtag Regex Parser | Extracts `#IMD`, `#MumbaiRains`, `#CycloneAlert`, `#DelhiWeather` and categorizes posts by severity. |
| **Photo & Video Upload** | Express Media Processor, Static File Server | Handles image/video file uploads (`/api/v1/upload-media`), saves to `public/uploads/`, and renders HTML5 media previews inside report cards. |
| **AI Fake Detection** | TF-IDF Vectorizer + Naive Bayes Classifier | Automatically flags hoaxes, gibberish, and off-topic reports using meteorological lexicon checks and confidence scoring. |
| **AI Deduplication** | Jaccard Similarity + Haversine Distance | Detects duplicate reports within a 20km radius and 4-hour window, grouping them into cluster advisories. |
| **Source Trust Verification** | Multi-Tier Trust Algorithm | Assigns credibility scores (Official IMD = 99, Verified News = 94, Media Proof = 88, Anonymous = 45). |
| **Geographic Heatmap Layer** | Leaflet.heat Canvas Engine | Visualizes severe weather incident density and spatial clustering across India states. |
| **High-Performance Database** | SQLite WAL Mode + Redis | Supports high-concurrency read/write operations without locking issues. |
| **Real-Time Push Streaming** | Server-Sent Events (SSE) | Pushes live incident notifications and moderated report updates to active web clients instantly. |

---

## 🛠️ Technology Stack

- **Backend**: Node.js v24, Express.js 5
- **Database & Cache**: SQLite (`node:sqlite` WAL mode), Redis 7 (caching & pub/sub)
- **AI/ML Engine**: Custom Natural Language Processing (TF-IDF, Naive Bayes Classifier, Haversine Distance, Jaccard Token Match)
- **Frontend**: HTML5, Vanilla JavaScript, CSS3 (Glassmorphism design system)
- **Mapping & Visualization**: Leaflet 1.9, Leaflet.heat, Chart.js 4
- **Containerization**: Docker, Docker Compose, Nginx Load Balancer

---

## 🚀 Quick Start Guide

### 1. Local Development (Node.js)

```bash
# Install dependencies
npm install

# Start development server
npm start
```

Open `http://localhost:3000` in your web browser.

### 2. Production Cluster Deployment (Docker Compose)

```bash
# Build & start full microservice stack (Nginx LB + 3 App Workers + Redis + Kafka + ClickHouse)
docker-compose up -d
```

Access the platform at `http://localhost`.

---

## 📡 Key API Endpoints

- `GET /api/v1/weather/current?lat=28.6139&lon=77.2090` — Fetch live station weather data & forecast.
- `GET /api/v1/reports` — Fetch citizen weather reports with filtering options.
- `POST /api/v1/reports` — Submit a citizen weather incident report.
- `POST /api/v1/upload-media` — Upload photo/video file attachments for report cards.
- `GET /api/v1/social/stream` — Live social media intelligence feed (`#IMD`, Google News, GDACS, Reddit).
- `GET /api/v1/admin/analytics` — High-level analytics, category distribution, and top state counts.
- `POST /api/v1/admin/login` — Supervisory admin authentication.

---

## 📄 License
ISC License — Developed for National Meteorological Intelligence & Early Warning Research.
=======
# NWA_SIH2
>>>>>>> cf6795a2972620ada6a533a9d4247265dde1b39c
