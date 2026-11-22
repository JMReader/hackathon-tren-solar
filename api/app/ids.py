from __future__ import annotations

import secrets
import time

_CROCKFORD = "0123456789ABCDEFGHJKMNPQRSTVWXYZ"


def _b32(value: int, length: int) -> str:
    chars = []
    for _ in range(length):
        chars.append(_CROCKFORD[value & 31])
        value >>= 5
    return "".join(reversed(chars))


def new_id(prefix: str) -> str:
    """IDs estilo ULID-corto: `ach_01J9X8K2M4` (tiempo + aleatorio en base32)."""
    ms = int(time.time() * 1000) & ((1 << 30) - 1)
    rand = secrets.randbits(20)
    return f"{prefix}_{_b32(ms, 6)}{_b32(rand, 4)}"
