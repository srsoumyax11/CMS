from typing import Any, Generic, TypeVar, Optional
from pydantic import BaseModel

DataT = TypeVar("DataT")

class APIResponse(BaseModel, Generic[DataT]):
    success: bool
    data: Optional[DataT] = None
    error: Optional[str] = None
    message: Optional[str] = None

