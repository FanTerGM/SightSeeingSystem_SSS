from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.services.user_service import UserService

router = APIRouter(prefix="/api/users", tags=["Users"])


@router.get("/")
def get_all_users(db: Session = Depends(get_db)):
    return UserService(db).get_all_users()


@router.get("/{user_id}")
def get_user(user_id: str, db: Session = Depends(get_db)):
    user = UserService(db).get_user_by_id(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


@router.post("/")
def create_user(data: dict, db: Session = Depends(get_db)):
    return UserService(db).create_user(data)
