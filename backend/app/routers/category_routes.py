from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.services.category_service import CategoryService

router = APIRouter(prefix="/api/categories", tags=["Categories"])


@router.get("/")
def list_categories(db: Session = Depends(get_db)):
    return CategoryService(db).get_all_categories()


@router.get("/{category_id}")
def get_category(category_id: int, db: Session = Depends(get_db)):
    return CategoryService(db).get_category_by_id(category_id)
