from __future__ import annotations

import re

RESERVED = re.compile(r"([\\|{}@\[\]()<>#*_~])")
HASHTAG = re.compile(r"(?<![\w#])#(\w+)")


def escape(text: str) -> str:
    return RESERVED.sub(r"\\\1", text)


def to_little(text: str) -> str:
    parts: list[str] = []
    position = 0
    for match in HASHTAG.finditer(text):
        parts.append(escape(text[position : match.start()]))
        parts.append(f"{{hashtag|\\#|{escape(match.group(1))}}}")
        position = match.end()
    parts.append(escape(text[position:]))
    return "".join(parts)
