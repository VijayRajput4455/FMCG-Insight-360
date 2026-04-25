from pydantic import BaseModel
from typing import Optional


class ErrorResponse(BaseModel):
    status: str = "error"
    code: int
    message: str
    details: Optional[str] = None
