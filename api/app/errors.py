from __future__ import annotations

from .models import ErrorDetail


class ApiError(Exception):
    def __init__(self, http_status: int, code: str, message: str, retryable: bool = False):
        super().__init__(message)
        self.http_status = http_status
        self.detail = ErrorDetail(code=code, message=message, retryable=retryable)


def bad_request(message: str, code: str = "bad_request") -> ApiError:
    return ApiError(400, code, message)


def not_found(resource: str, resource_id: str) -> ApiError:
    return ApiError(404, "not_found", f"{resource} '{resource_id}' no existe.")


def revision_conflict(resource: str, expected: int, current: int) -> ApiError:
    return ApiError(
        409,
        "revision_conflict",
        f"Revisión desactualizada en {resource}: enviaste {expected}, la actual es {current}. Releé el recurso y reintentá.",
    )


def invalid_state(message: str) -> ApiError:
    return ApiError(409, "invalid_state", message)


class ProfileResponse(Exception):
    """Respuesta 503 de sync-style: el contrato devuelve AuthorProfile, no ApiError."""

    def __init__(self, http_status: int, profile):
        super().__init__(f"profile response {http_status}")
        self.http_status = http_status
        self.profile = profile
