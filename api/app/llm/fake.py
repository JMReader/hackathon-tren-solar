from __future__ import annotations

import re
import unicodedata

from ..models import (
    ExtractedFact,
    ExtractedQuestion,
    ExtractionResult,
    Fact,
    Platform,
    VoiceContext,
)

# Marcas de primera persona (contribución propia) vs. colectivas (del equipo).
_FIRST_PERSON = (
    r"\byo\b", r"\bdiseñé\b", r"\barmé\b", r"\bcreé\b", r"\bprogramé\b",
    r"\blancé\b", r"\bescribí\b", r"\baprendí\b", r"\bdecidí\b", r"\bhice\b",
    r"\bmaqueté\b", r"\bconstruí\b", r"\btesteé\b", r"\bdeployé\b", r"\blideré\b",
    r"\borganicé\b", r"\bdocumenté\b", r"\bpresenté\b", r"\bme encargué\b",
    r"\bme tocó\b", r"\bmi rol\b", r"\bmi parte\b",
)
_COLLECTIVE = (
    r"\bhicimos\b", r"\barmamos\b", r"\bcreamos\b", r"\blanzamos\b",
    r"\bdesarrollamos\b", r"\bconstruimos\b", r"\béramos\b", r"\bequipo\b",
    r"\bentre \d+\b", r"\bpresentamos\b", r"\bganamos\b", r"\bparticipamos\b",
    r"\bsumamos\b", r"\bquedamos\b",
)
_CODING_VERBS = (
    r"\bprogramé\b", r"\bmaqueté\b", r"\bdesarrollé\b", r"\bimplementé\b",
    r"\bcodeé\b", r"\bconstruí\b", r"\bdeployé\b",
)
_TECH = (
    "react", "figma", "python", "typescript", "javascript", "next.js", "nextjs",
    "fastapi", "node", "nodejs", "django", "flask", "vue", "angular", "svelte",
    "tailwind", "postgres", "postgresql", "sqlite", "supabase", "firebase",
    "docker", "vercel", "expo", "flutter", "kotlin", "swift", "rails", "ruby",
    "java", "rust", "astro", "remix", "prisma", "mongodb", "redis", "graphql",
    "openai", "gemini", "whisper", "llm", "pandas",
)
_LEARNING = (r"\baprendí\b", r"\baprendimos\b", r"\bme di cuenta\b", r"\bentendí\b")
_DATE = (r"\beste finde\b", r"\bhoy\b", r"\bayer\b", r"\besta semana\b",
         r"\bel mes pasado\b", r"\b20\d\d\b")
_IMPACT = (r"\busuarios\b", r"\bpersonas\b", r"%", r"\bventas\b", r"\bclicks\b",
           r"\bregistros\b", r"\bhoras\b")
_UNMEASURED = (r"\bno medimos\b", r"\btodavía no\b", r"\baún no\b",
               r"\bsin métricas\b", r"\bno sabemos\b", r"\bno tenemos datos\b")


def _has_any(patterns: tuple[str, ...], text: str) -> bool:
    low = text.lower()
    return any(re.search(p, low) for p in patterns)


def _split_sentences(transcript: str) -> list[str]:
    parts = re.split(r"(?<=[.!?])\s+|\n+", transcript.strip())
    return [p.strip().rstrip(".") for p in parts if p.strip()]


def _tech_in(text: str) -> list[str]:
    low = text.lower()
    found = []
    for t in _TECH:
        if re.search(rf"(?<![\w.]){re.escape(t)}(?![\w])", low):
            found.append(t)
    return found


def _is_emoji(ch: str) -> bool:
    return unicodedata.category(ch) == "So"


def _category(sentence: str) -> str:
    if _has_any(_LEARNING, sentence):
        return "learning"
    if _has_any(_FIRST_PERSON, sentence):
        return "role"
    if _has_any(_COLLECTIVE, sentence):
        return "project"
    if re.search(r"\d", sentence) and _has_any(_IMPACT, sentence):
        return "impact"
    if _has_any(_DATE, sentence):
        return "date"
    return "context"


class FakeLLM:
    """Determinista: los hechos son citas verbatím del transcript (R1 por construcción).

    Caso testigo: "Hicimos una app de turnos en React. Yo diseñé las pantallas"
    produce un hecho de proyecto colectivo y uno de rol propio — jamás afirma
    autoría total de la app.
    """

    def extract(self, transcript: str) -> ExtractionResult:
        sentences = _split_sentences(transcript)
        facts: list[ExtractedFact] = []
        questions: list[ExtractedQuestion] = []
        tech_found: list[str] = []
        role_facts = 0

        for sentence in sentences:
            if len(sentence) < 4:
                continue
            tech_found.extend(t for t in _tech_in(sentence) if t not in tech_found)
            category = _category(sentence)
            if category == "role":
                role_facts += 1
            if category == "context" and not _tech_in(sentence) and not re.search(r"\d", sentence):
                continue  # relleno sin señal: ni hecho ni ruido
            facts.append(ExtractedFact(category=category, text=sentence, source_quote=sentence))

        role_has_coding = any(
            _has_any(_CODING_VERBS, f.text) for f in facts if f.category == "role"
        )
        if tech_found and role_facts and not role_has_coding:
            questions.append(ExtractedQuestion(
                field="tech_contribution",
                question=f"Se menciona {', '.join(tech_found)}: ¿también escribiste código o tu rol fue de diseño/producto?",
            ))
        if _has_any(_UNMEASURED, transcript):
            questions.append(ExtractedQuestion(
                field="impact",
                question="Indicaste que aún no hay métricas. ¿Querés destacar algún problema concreto que resolvía?",
            ))
        if not role_facts:
            questions.append(ExtractedQuestion(
                field="role",
                question="¿Cuál fue tu contribución concreta dentro del equipo?",
            ))
        return ExtractionResult(facts=facts, open_questions=questions)

    # --- redacción ---

    def _style(self, voice: VoiceContext | None, platform: Platform) -> dict:
        samples = []
        if voice and voice.sample_posts:
            samples = getattr(voice.sample_posts, platform, []) or []
        lower = bool(samples) and all(
            (next((c for c in s if c.isalpha()), "a")).islower() for s in samples
        )
        prefs = voice.preferences if voice else None
        emoji = bool(samples and any(_is_emoji(c) for s in samples for c in s))
        hashtags = bool(samples and any("#" in s for s in samples))
        if prefs:
            emoji = emoji or prefs.use_emojis
            hashtags = hashtags or prefs.use_hashtags
        language = (voice.language if voice else "es-AR") or "es-AR"
        return {"lower": lower, "emoji": emoji, "hashtags": hashtags, "language": language}

    def draft(self, *, platform: Platform, facts: list[Fact],
              voice: VoiceContext | None, max_chars: int) -> str:
        style = self._style(voice, platform)
        en = style["language"].lower().startswith("en")
        role = [f.text for f in facts if f.category == "role"]
        rest = [f.text for f in facts if f.category != "role"]

        if platform == "linkedin":
            para1 = ". ".join(rest) + ("." if rest else "")
            para2 = ". ".join(role) + ("." if role else "")
            if en:
                para3 = "What's the first thing you look at when tackling a project like this?"
            else:
                para3 = "¿Qué es lo primero que miran cuando encaran un proyecto así?"
            body = "\n\n".join(p for p in (para1, para2, para3) if p)
            if style["emoji"]:
                body = "✨ " + body
        else:
            pieces = rest + role
            body = "; ".join(pieces) + ("." if pieces else "")
            if style["emoji"]:
                body = "✨ " + body

        if style["hashtags"]:
            tags = self._hashtags(facts, en)
            body = f"{body}\n\n{tags}" if platform == "linkedin" else f"{body} {tags}"
        if style["lower"]:
            body = _smart_lower(body)
        return body

    def _hashtags(self, facts: list[Fact], en: bool) -> str:
        tags: list[str] = []
        for f in facts:
            for t in _tech_in(f.text):
                tag = "#" + t.replace(".", "").replace(" ", "")
                if tag not in tags:
                    tags.append(tag)
        if not tags:
            tags = ["#buildinpublic"] if en else ["#construidoEnPúblico"]
        return " ".join(tags[:4])


def _smart_lower(body: str) -> str:
    """Minúsculas estilo X casual, conservando siglas en mayúsculas comunes."""
    def low_word(m: re.Match) -> str:
        w = m.group(0)
        return w if w.isupper() and len(w) <= 5 else w.lower()
    return re.sub(r"\b[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+\b", low_word, body)
