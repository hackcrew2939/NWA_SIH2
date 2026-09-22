# National Weather Analytics (NWA) – SIH Prototype Screen Recording Script

> **Video Target Duration:** 7 – 10 Minutes  
> **Speaker Tone:** Confident, professional, clear, and authoritative (Hackathon Pitch style)  
> **How to use this script:** Follow the **[Action]** cues to move your cursor/click on buttons while speaking the **Voiceover (VO)** text verbatim or adapting it naturally.

---

## 🎬 Part 1: Intro & Problem Statement (0:00 - 0:45)

**[Action: Start recording on the main home screen (Live Forecast & Map View). Hover over the sidebar NWA logo and top header.]**

* **Voiceover (VO):**  
  *"Hello judges and evaluation team! Welcome to the demonstration of **National Weather Analytics (NWA)** – our comprehensive Big Data and AI-powered meteorological intelligence solution built for the Smart India Hackathon.*

  *India frequently faces severe meteorological hazards like cyclones, flash floods, heatwaves, and localized downpours. Conventional weather portals often lack real-time crowd verification, multi-source social intelligence, automated acoustic alerting, and open-source scalable architecture.*

  *To solve this, we created **NWA** – an end-to-end platform that unifies official IMD Doppler radar data, Open-Meteo observational telemetry, citizen field reports, and AI credibility forensics into a unified, institutional dashboard. Let’s walk through every feature and button step-by-step."*

---

## 🌤️ Part 2: Top Header & Location Controls (0:45 - 1:30)

**[Action: Point cursor to the top navigation header.]**

* **Voiceover (VO):**  
  *"Starting at the top **Utility Header**:"*

1. **Search Bar & Autocomplete:**  
   **[Action: Click on `Search city, district, or Indian state...` input and type 'Mumbai' or 'Chennai', show autocomplete dropdown.]**  
   * **VO:** *"Here, users can search for any Indian city, district, or state with real-time autocompletion."*

2. **GPS Geolocation Button:**  
   **[Action: Click the Crosshairs GPS button next to the search input.]**  
   * **VO:** *"Clicking this **Current GPS Crosshair button** instantly detects the device's exact latitude and longitude using browser geolocation APIs."*

3. **State & City Fallback Dropdowns:**  
   **[Action: Click the `State / UT` select dropdown and pick a state, then select a city.]**  
   * **VO:** *"For administrative access, we have cascading **State/UT and District fallback dropdowns** covering all Indian states."*

4. **Header Action Buttons:**  
   **[Action: Hover over `Refresh`, `Report Incident`, and `Admin Portal` buttons.]**  
   * **VO:** *"On the top right, we have three quick action buttons:*  
   *- **Refresh Button:** Fetches fresh live telemetry instantly from the backend APIs.*  
   *- **Report Incident Button:** Opens the citizen ground incident submission form.*  
   *- **Admin Portal Button:** Directly opens the supervisory moderation console."*

---

## 🌦️ Part 3: Live Forecast & Dashboard View (1:30 - 3:00)

**[Action: Ensure `Live Forecast & Map` tab is active on the left sidebar.]**

### A. Location & Audio Briefing Bar
**[Action: Hover over location badge, IST clock, and click `Audio Summary` button.]**
* **VO:** *"In the **Location Status Bar**, we see the active city title, real-time sync status, and a live **Indian Standard Time (IST) clock**.*  
  *We also built an accessibility feature: clicking the **Audio Summary** button generates a synthesized voice briefing of the current weather conditions for visually impaired citizens or quick updates."*

### B. Cinematic Hero Card & Telemetry Pills
**[Action: Point cursor at the hero temperature banner, dew point, rain chance, and AQI pills.]**
* **VO:** *"The **Hero Weather Panorama** features an animated HTML5 particle canvas displaying real-time weather effects like rain, fog, or clear skies. It highlights current temperature, feels-like temp, max/min range, and condition icon.*  
  *Below it, the **Telemetry Strip** displays key atmospheric parameters: Dew Point, Rain Probability, Air Quality Index (AQI), and IMD Radar feed source."*

### C. 5-Hour Trend & 8 Key Metrics Grid
**[Action: Hover over the 5-hour capsule strip and point to the 8 metric cards.]**
* **VO:** *"Next is the **5-Hour Hourly Trend Capsule Strip** for quick short-term planning, followed by our **8 Key Telemetry Cards Grid** showing:*  
  1. *Rainfall (mm)*  
  2. *Relative Humidity (%)*  
  3. *Wind Speed & Dynamic Compass Direction*  
  4. *Surface Barometric Pressure (hPa)*  
  5. *UV Index level*  
  6. *Visibility (km)*  
  7. *Sunrise Time (IST)*  
  8. *Sunset Time (IST)"*

### D. Interactive Leaflet Map of India
**[Action: Scroll down to the Interactive Map. Click on the layer toggles `Weather Stations`, `Citizen Reports`, `Public Notices`, `Deduplication Clusters`. Hover over map to show coordinate updates.]**
* **VO:** *"On the right, we have an **Interactive Leaflet GIS Map of India**.*  
  *Notice the layer toggle buttons at the top right:*  
  *- **Weather Stations:** Shows official IMD/AWS stations.*  
  *- **Citizen Reports:** Pins verified citizen ground reports.*  
  *- **Public Notices:** Pins official disaster advisories.*  
  *- **Deduplication Clusters:** Visualizes Big Data spatial clustering.*  
  *Hovering over any region updates the live latitude, longitude, and state telemetry in the map footer. Clicking the **Fullscreen Button** expands the map across the screen."*

### E. 24-Hour Diurnal Progression & Extended Forecast Table
**[Action: Scroll down to the 24-Hour Diurnal Progression section. Click `Today`, `Tomorrow`, `Day After`, and click `Pick Custom Date` button.]**
* **VO:** *"Moving down, the **24-Hour Diurnal Progression Strip** allows switching between Today, Tomorrow, Day After, or choosing a **Custom Date** up to a 16-day forecast window. Clicking any hourly pill opens a detailed atmospheric drawer.*

  **[Action: Scroll to the 10-Day Extended Weather Forecast card. Click `3 Days`, `7 Days`, `10 Days` range pills. Hover over the ML-calibrated Chart.]**  
  *Below, the **Extended Forecast Table** offers range filtering (1-Day, 3-Day, 7-Day, 10-Day), a **Machine Learning NWP-MOS calibrated Trajectory Chart**, a complete table, and a **Download CSV Button**."*

---

## 🚨 Part 4: Severe Weather Alerts & Early Warning Hub (3:00 - 4:15)

**[Action: Click on the `Weather Alerts` tab in the left sidebar.]**

* **Voiceover (VO):**  
  *"Next, let's explore the **National Severe Weather Alerts & Early Warning Hub**."*

1. **Surveillance Banner & Controls:**  
   **[Action: Hover over `Dispatch Agency Alert`, `Test Alert Audio & Push`, and `Refresh Warnings` buttons.]**  
   * **VO:** *"At the top, we have action buttons to dispatch agency warnings, refresh alerts, and test acoustic sirens."*

2. **Personal Weather Alert Configurator:**  
   **[Action: Show the `Set Personal Weather Alert` form on the left. Click `Current GPS`, select hazard `Torrential / Heavy Rain`, select alert audio tone `Emergency Broadcast Siren`, click `Preview` audio button, and click `Test Notification`.]**  
   * **VO:** *"This allows citizens to set personalized early-warning triggers for their specific area. They can enter a city or click **Current GPS**, select hazards (Heavy Rain, Heatwave, Thunderstorm, Cold Wave), set threshold values, pick an **Acoustic Siren Tone** (EAS Siren, Municipal Alarm, Pulse Staccato, Sonar Ping), toggle browser notifications, and click **Activate Weather Alert**. Clicking **Preview** plays the actual siren audio tone!"*

3. **Active Subscriptions:**  
   **[Action: Point to the `My Active Alerts` card on the right.]**  
   * **VO:** *"The active subscriptions card lists all running user triggers continuously monitored against incoming satellite models."*

4. **Areas Highly Affected & Helpline Reference:**  
   **[Action: Scroll down. Click hazard filter pills (`Heavy Rain`, `Heatwave`, `Cyclone`, `Flood`) and severity pills (`Red`, `Orange`, `Yellow`). Point to Emergency Helplines.]**  
   * **VO:** *"The **Areas Highly Affected** section provides real-time radar cards filterable by hazard and IMD color code severity (Red Warning, Orange Alert, Yellow Watch). Below it, we provide authoritative IMD warning standards and national emergency helplines (NDRF 1078, Emergency 112)."*

5. **Registered Community Incident Reports:**  
   **[Action: Point to the registered community ground reports list at the bottom.]**  
   * **VO:** *"At the bottom of this tab, registered ground incident reports from citizens nationwide are synchronized in real time."*

---

## 👥 Part 5: Citizen Crowd Reports & AI Forensics Inspector (4:15 - 5:30)

**[Action: Click on `Citizen Reports` tab in the left sidebar.]**

* **Voiceover (VO):**  
  *"Moving to **Citizen Reports**: NWA empowers citizens to report localized disasters while preventing false reports using AI."*

1. **Submitting a Ground Incident:**  
   **[Action: Click `Report Severe Event` or `Report Incident` button to open the modal. Show form fields: Category, State, City, Landmark, Lat/Lon, Description, Reporter Name, Photo Upload with drag-and-drop preview.]**  
   * **VO:** *"Clicking **Report Severe Event** opens the submission modal. Citizens can auto-fill GPS location, select event type, upload photo/video evidence, enter description, and submit. Photos feature instant thumbnail preview and validation."*  
   **[Action: Close the modal.]**

2. **Report Queue & Verification Filter:**  
   **[Action: Click filter pills `All Reports`, `Pending Verification`, `Verified`.]**  
   * **VO:** *"Citizens and authorities can filter incoming ground reports by status."*

3. **AI Multi-Modal Credibility & Forensics Inspector:**  
   **[Action: On any report card, click the `AI Credibility Score / Grade` or `Inspect AI Forensics` button to open the AI Forensics Modal.]**  
   * **VO:** *"Here is one of our key innovations: **The AI Multi-Modal Credibility Inspector Modal**!  
     When a report is submitted, our backend AI pipeline evaluates it across 4 distinct dimensions:*  
     1. ***NLP & Sentiment (TF-IDF Vectorizer):*** *Checks terminology against IMD meteorological dictionary and detects anti-spam.*  
     2. ***Geospatial Validation:*** *Corroborates GPS coordinates against Indian land boundaries and regional hazard rules.*  
     3. ***Visual Media Forensics:*** *Inspects attached photos for stock image manipulation or deepfake anomalies.*  
     4. ***Ground Station Corroboration:*** *Cross-checks the report against nearest active IMD Doppler radar data.*  
     *It calculates a Composite Trust Score (e.g. 88% Grade A) with complete Explainable AI reasoning logs!"*  
   **[Action: Close the AI Forensics modal.]**

---

## 📲 Part 6: Social Intelligence Stream (5:30 - 6:15)

**[Action: Click on `Social Intelligence` tab in the left sidebar.]**

* **Voiceover (VO):**  
  *"Now let's view **Social Intelligence**.*

  *During natural disasters, public updates flood social platforms. Our streaming ingestion engine aggregates multi-platform signals live from:*  
  *- **UN GDACS Disaster Alerting**  
  *- **Google News RSS**  
  *- **X / Twitter API v2**  
  *- **IMD Official Feeds**  
  *- **Instagram Graph API***

  **[Action: Click platform filter buttons (`UN GDACS`, `Google News`, `X / Twitter`, `IMD Official`). Click `Fetch Live Signals` button. Click on monitored hashtag pills like `#IMD`, `#CycloneAlert`, `#MumbaiRains`.]**  
  *Users can filter by platform, click **Fetch Live Signals** for instant ingestion, or click monitored weather hashtags to filter social posts instantly."*

---

## 📊 Part 7: Analytics & Official PDF/Excel Export (6:15 - 7:15)

### A. Analytics & Trends View
**[Action: Click on `Analytics & Trends` tab in the left sidebar.]**
* **VO:** *"In **Analytics & Trends**, decision-makers get high-level operational metrics:*  
  *- High-level KPIs: Total Events Monitored, Citizen Reports, Social Signals, Data Verification Rate %.*  
  *- **Weather Event Category Breakdown Chart** (Interactive Doughnut Chart).*  
  *- **State-wise Event Frequency Chart** (Interactive Bar Chart).*  
  *- **Regional Weather Station Observations Matrix** with live sensor telemetry."*

### B. Download Official Reports Center
**[Action: Click on `Download Official Reports` in the sidebar or header.]**
* **VO:** *"For administration and emergency response teams, our **Official Reports Center** formats live weather telemetry into accredited documents.*

  **[Action: Click `Download Excel (.xlsx)`, `Download PDF (.pdf)`, and `Print Report` buttons.]**  
  *With one click, users can download an **Excel Spreadsheet (.xlsx)**, generate an official **PDF Report (.pdf)** complete with station observation tables, or print hard copies."*

---

## 🛡️ Part 8: Admin Panel, Big Data & K8s Cluster Scalability (7:15 - 9:00)

**[Action: Click on `Admin Panel` tab in the left sidebar.]**

### A. Admin Authentication Gate
**[Action: Show the login card. Click password toggle eye icon, type password `admin@imd2026`, and click `Log In to Admin Portal`.]**
* **VO:** *"Access to supervisory moderation is protected by the **Admin Security Gate**. Logging in opens the operational console."*

### B. Citizen Incident Moderation Console
**[Action: Show the 4 admin sub-tabs. Ensure `Citizen Incident Moderation` sub-tab is active. Click audit preset date filters (`Today`, `7 Days`, `All Time`), dropdown filters (Category, State, Status, AI Risk Level). Point to table action buttons (`Verify`, `Flag Fake`, `Reject`, `Delete`).]**
* **VO:** *"In **Incident Moderation**, supervisors view real-time queue KPIs (Total, Verification Rate %, Flagged Fake, Duplicate Clusters).  
  The **Multi-Criteria Filter Console** allows spatial and AI risk searching. Admins can verify, flag, reject, or deduplicate reports with instant database sync."*

### C. Emergency Alerts Broadcast Console
**[Action: Click `Weather Alerts & Warnings Management` sub-tab. Click `Detect Device GPS` button in the broadcast card.]**
* **VO:** *"Under **Weather Alerts Management**, administrators can broadcast national emergency warnings. Clicking **Detect Device GPS** auto-fills current coordinates, allows setting RED/ORANGE/YELLOW alert tiers, advisory instructions, and dispatches the warning across the national alerts network."*

### D. Big Data Streaming Pipeline & Benchmark
**[Action: Click `Big Data Pipeline & Ingestion Architecture` sub-tab. Point to throughput/latency cards, Kafka partition visualizer strip. Click `Trigger 1,000 Event Benchmark` button.]**
* **VO:** *"Under **Big Data Pipeline**, we showcase our streaming architecture telemetry (Kafka Partition Buffer, AI NLP Worker, SQLite WAL Storage Sink).  
  Clicking **Trigger 1,000 Event Benchmark** blasts 1,000 synthetic weather stream records in under 2 seconds, proving zero dropped packets, real-time batch commits, and throughput over 800 records/sec!"*

### E. Horizontal Cluster & Kubernetes Scalability
**[Action: Click `Horizontal Cluster & K8s Scalability` sub-tab. Click `Test Self-Healing` button. Select `2,500 Concurrent Requests` and click `Run Scalability Benchmark`.]**
* **VO:** *"Finally, under **Horizontal Cluster Scalability**, we demonstrate enterprise cloud readiness:*  
  *- Shows active Node.js cluster worker processes, NGINX Layer-7 least-conn load balancing, and Kubernetes HPA configuration.*  
  *- Clicking **Test Self-Healing** simulates a worker process crash and demonstrates instant zero-downtime revival by the cluster supervisor!*  
  *- Clicking **Run Scalability Benchmark** executes parallel stress traffic (500 to 5,000 concurrent requests), measuring sub-10ms P50 latency and demonstrating a 3.2x horizontal multi-core speedup!"*

---

## 🎯 Part 9: Conclusion & Summary (9:00 - 9:30)

**[Action: Switch back to the main `Live Forecast & Map` home screen. Hover over the whole layout.]**

* **Voiceover (VO):**  
  *"To summarize: **National Weather Analytics (NWA)** is a complete, production-ready, open-source platform combining real-time meteorology, crowd verification, AI forensics, multi-platform social streams, automated acoustic sirens, and high-concurrency cloud architecture.*

  *Thank you for watching our prototype demonstration!"*

---
