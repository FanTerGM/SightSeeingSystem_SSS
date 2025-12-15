# Sight Seeing System (SSS)

A web-based application that helps tourists visiting Ho Chi Minh City generate personalized sightseeing itineraries.

## Tech Stack

  * **Frontend:** Next.js (React)
  * **Backend:** FastAPI (Python)
  * **Database:** PostgreSQL / SQLite
  * **AI:** Gemini 2.5 Flash

-----

## Prerequisites

  * [Docker Desktop](https://www.docker.com/products/docker-desktop/) (Recommended)
  * [Node.js](https://nodejs.org/) (If running manually)
  * [Python 3.10+](https://www.python.org/) (If running manually)
  * Git

-----

## 1\. Clone the Repository

```bash
git clone https://github.com/FanTerGM/SightSeeingSystem_SSS.git
cd SightSeeingSystem_SSS
```

## 2\. Environment Configuration

Create a `.env` file in the root directory (or separate ones for `/frontend` and `/backend` if not using Docker).

```ini
# API Keys
GEMINI_API_KEY=your_actual_api_key_here
VIETMAP_API_KEY=your_vietmap_key

# Database (Optional overrides)
POSTGRES_USER=tourism_user
POSTGRES_PASSWORD=dev_password
```

-----

## 3\. Run with Docker (Recommended)

The system is designed to be deployed via Docker Compose.

1.  Build and start the services:
    ```bash
    docker-compose up --build
    ```
2.  Access the application:
      * **Frontend:** `http://localhost:3000`
      * **Backend API Docs:** `http://localhost:8000/docs`

-----

## 4\. Run Manually (Development)

### Backend

To run both your Python backend and the Node.js AI script manually, you need to open **two separate terminal windows** (or tabs) so they can run at the same time.

#### Terminal 1: Python API (FastAPI)

Run this to start the main backend server.

```bash
cd backend
# Install Python dependencies (ensure you reference the file inside 'app')
pip install -r app/requirements.txt

# Start the server (referencing 'app.main' because main.py is inside the 'app' folder)
uvicorn app.main:app --reload --port 8000
```

#### Terminal 2: AI Service (Node.js)

Open a **new** terminal window and run this to start the AI listener.

```bash
cd backend/src
# Install Node.js dependencies
npm install

# Start the AI script
node ai.js
```

**Note:** Ensure `ai.js` is listening on a different port than `8000` (e.g., `3000` or `3001`) to avoid conflicts.

### Frontend

```bash
cd frontend
npm install
npm run dev
```

-----

## Features (MVP)

  * **Itinerary Generator:** Input start location, time budget, and preferences.
  * **Route Optimization:** Nearest-neighbor routing within HCMC.
  * **AI Assistant:** Natural language query parsing using Gemini 2.5 Flash.
