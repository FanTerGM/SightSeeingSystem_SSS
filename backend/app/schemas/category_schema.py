import uuid
from pydantic import BaseModel
from typing import Optional


class CategoryResponse(BaseModel):
    id: uuid.UUID
    name: str
    name_vi: str
    icon: Optional[str]

    class Config:
        from_attributes = True
