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

## Features (MVP)

  * **Itinerary Generator:** Input start location, time budget, and preferences.
  * **Route Optimization:** Nearest-neighbor routing within HCMC.
  * **AI Assistant:** Natural language query parsing using Gemini 2.5 Flash.
