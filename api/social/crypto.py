from __future__ import annotations

from cryptography.fernet import Fernet, InvalidToken


class TokenCipher:
    def __init__(self, key: str | bytes) -> None:
        self._fernet = Fernet(key)

    @staticmethod
    def generate_key() -> str:
        return Fernet.generate_key().decode()

    def encrypt(self, token: str) -> bytes:
        return self._fernet.encrypt(token.encode())

    def decrypt(self, data: bytes) -> str:
        try:
            return self._fernet.decrypt(data).decode()
        except InvalidToken as error:
            raise ValueError("No se pudo descifrar el token guardado.") from error
