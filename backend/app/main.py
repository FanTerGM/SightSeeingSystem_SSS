"""
SSS (Sight Seeing System) - FastAPI Backend
Main application file with API endpoints
"""
from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from app import models
from app.database import get_db

from app.routers import (
    user_router,
    category_router,
    location_router,
    review_router,
    itinerary_router,
)

app = FastAPI(
    title="SSS API",
    description="SightSeeing System - Smart Tourism API for Ho Chi Minh City",
    version="1.0.0",
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify your frontend domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================
# API ENDPOINTS
# ============================================


@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "🎯 SSS API - SightSeeing System for Ho Chi Minh City",
        "version": "1.0.0",
        "docs": "/docs",
        "status": "running",
    }


@app.get("/health")
async def health_check(db: Session = Depends(get_db)):
    """Health check endpoint"""
    try:
        # Test database connection
        db.execute("SELECT 1")
        return {"status": "healthy", "database": "connected"}
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Database error: {str(e)}")


# ==========================================
# Routers
# ============================================

app.include_router(user_router)
app.include_router(category_router)
app.include_router(location_router)
app.include_router(review_router)
app.include_router(itinerary_router)


# ============================================
# STATISTICS ENDPOINTS
# ============================================


@app.get("/api/stats")
async def get_statistics(db: Session = Depends(get_db)):
    """Get general statistics"""
    total_locations = (
        db.query(models.Location).filter(models.Location.is_active == True).count()
    )
    total_reviews = db.query(models.Review).count()
    total_users = db.query(models.User).count()
    total_categories = db.query(models.Category).count()

    avg_rating = (
        db.query(models.Location)
        .filter(models.Location.is_active == True, models.Location.rating.isnot(None))
        .with_entities(models.Location.rating)
        .all()
    )

    avg_rating_value = (
        sum(r[0] for r in avg_rating if r[0]) / len(avg_rating) if avg_rating else 0
    )

    return {
        "total_locations": total_locations,
        "total_reviews": total_reviews,
        "total_users": total_users,
        "total_categories": total_categories,
        "average_rating": round(avg_rating_value, 2),
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
