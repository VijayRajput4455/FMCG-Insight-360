import uuid
from contextvars import ContextVar

_request_id_var: ContextVar[str] = ContextVar("request_id", default="-")


def set_request_id(request_id: str | None = None) -> str:
    rid = request_id or str(uuid.uuid4())
    _request_id_var.set(rid)
    return rid


def get_request_id() -> str:
    return _request_id_var.get()
