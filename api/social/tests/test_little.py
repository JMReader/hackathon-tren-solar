from social.little import escape, to_little


def test_escapes_every_reserved_character():
    assert escape(r"a|b{c}d@e[f]g(h)i<j>k#l\m*n_o~p") == r"a\|b\{c\}d\@e\[f\]g\(h\)i\<j\>k\#l\\m\*n\_o\~p"


def test_hashtags_use_template_and_other_text_is_escaped():
    text = "Armamos (en 3) una app #TrenSolar #jujuy_2026 para turnos * rápido. Mail: a@b.com"
    assert to_little(text) == (
        r"Armamos \(en 3\) una app {hashtag|\#|TrenSolar} {hashtag|\#|jujuy\_2026} para turnos \* rápido. "
        r"Mail: a\@b.com"
    )


def test_hash_inside_words_or_alone_is_plain_text():
    assert to_little("C# y # solo y a#b") == r"C\# y \# solo y a\#b"


def test_plain_text_and_newlines_are_unchanged():
    assert to_little("Hola\n\nmundo, ¡listo!") == "Hola\n\nmundo, ¡listo!"
