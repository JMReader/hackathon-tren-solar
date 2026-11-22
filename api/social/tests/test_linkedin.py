from __future__ import annotations

import json
from datetime import timedelta
from urllib.parse import parse_qs, urlsplit

import httpx2
import pytest
from conftest import NOW
from social.linkedin import LinkedInAdapter, LinkedInConfig
from social.models import Connection, OutcomeKind, Platform, PublishableDraft, PublishableMedia
from social.ports import OAuthError

CONFIG = LinkedInConfig("client-123", "secret-xyz", "http://localhost:8000/api/v1/social/linkedin/callback", "202610")
CONNECTION = Connection(Platform.LINKEDIN, "token-abc", frozenset({"w_member_social"}), account_id="member-1")


class Recorder:
    def __init__(self, handler):
        self.requests: list[httpx2.Request] = []
        self._handler = handler

    def __call__(self, request: httpx2.Request) -> httpx2.Response:
        self.requests.append(request)
        return self._handler(request)


def adapter(handler) -> tuple[LinkedInAdapter, Recorder]:
    recorder = Recorder(handler)
    return LinkedInAdapter(CONFIG, httpx2.Client(transport=httpx2.MockTransport(recorder)), clock=lambda: NOW), recorder


def draft(media: PublishableMedia | None = None, body: str = "Hola (mundo) #TrenSolar") -> PublishableDraft:
    return PublishableDraft("drf_1", 1, Platform.LINKEDIN, body, media)


def created(urn: str = "urn:li:share:123") -> httpx2.Response:
    return httpx2.Response(201, headers={"x-restli-id": urn})


def test_authorization_url_requests_minimal_scopes():
    linkedin, _ = adapter(lambda r: httpx2.Response(500))
    url = urlsplit(linkedin.authorization_url("state-1"))
    assert f"{url.scheme}://{url.netloc}{url.path}" == "https://www.linkedin.com/oauth/v2/authorization"
    assert parse_qs(url.query) == {
        "response_type": ["code"],
        "client_id": ["client-123"],
        "redirect_uri": [CONFIG.redirect_uri],
        "state": ["state-1"],
        "scope": ["openid profile w_member_social"],
    }


def test_complete_exchanges_code_and_reads_member():
    def handler(request: httpx2.Request) -> httpx2.Response:
        if request.url.path == "/oauth/v2/accessToken":
            assert parse_qs(request.content.decode()) == {
                "grant_type": ["authorization_code"],
                "code": ["code-1"],
                "redirect_uri": [CONFIG.redirect_uri],
                "client_id": ["client-123"],
                "client_secret": ["secret-xyz"],
            }
            return httpx2.Response(
                200, json={"access_token": "tok", "expires_in": 5184000, "scope": "openid,profile,w_member_social"}
            )
        assert request.headers["Authorization"] == "Bearer tok"
        return httpx2.Response(200, json={"sub": "member-9", "name": "Mayko Fernandez"})

    linkedin, recorder = adapter(handler)
    connection = linkedin.complete("code-1")
    assert [r.url.path for r in recorder.requests] == ["/oauth/v2/accessToken", "/v2/userinfo"]
    assert (connection.access_token, connection.account_id, connection.account_handle) == (
        "tok",
        "member-9",
        "Mayko Fernandez",
    )
    assert connection.scopes == {"openid", "profile", "w_member_social"}
    assert connection.expires_at == NOW + timedelta(days=60)
    assert "tok" not in repr(connection)


@pytest.mark.parametrize(
    ("token_response", "code"),
    [
        (httpx2.Response(400, json={"error": "invalid_request"}), "invalid_request"),
        (httpx2.Response(500, text="oops"), "token_http_500"),
    ],
)
def test_complete_reports_provider_error_codes(token_response, code):
    linkedin, _ = adapter(lambda r: token_response)
    with pytest.raises(OAuthError) as error:
        linkedin.complete("bad")
    assert error.value.code == code


def test_text_post_uses_versioned_api_and_little_format():
    linkedin, recorder = adapter(lambda r: created())
    outcome = linkedin.publish(CONNECTION, draft())
    assert (outcome.kind, outcome.external_post_id, outcome.external_url) == (
        OutcomeKind.SUCCEEDED,
        "urn:li:share:123",
        "https://www.linkedin.com/feed/update/urn:li:share:123/",
    )
    [request] = recorder.requests
    assert str(request.url) == "https://api.linkedin.com/rest/posts"
    assert request.headers["Linkedin-Version"] == "202610"
    assert request.headers["X-Restli-Protocol-Version"] == "2.0.0"
    assert request.headers["Authorization"] == "Bearer token-abc"
    body = json.loads(request.content)
    assert body["author"] == "urn:li:person:member-1"
    assert body["commentary"] == r"Hola \(mundo\) {hashtag|\#|TrenSolar}"
    assert (body["visibility"], body["lifecycleState"]) == ("PUBLIC", "PUBLISHED")
    assert "content" not in body


def test_photo_is_uploaded_before_post(tmp_path):
    photo = tmp_path / "foto.jpg"
    photo.write_bytes(b"jpeg-bytes")

    def handler(request: httpx2.Request) -> httpx2.Response:
        if request.url.path == "/rest/images":
            assert request.url.params["action"] == "initializeUpload"
            assert json.loads(request.content) == {"initializeUploadRequest": {"owner": "urn:li:person:member-1"}}
            return httpx2.Response(
                200, json={"value": {"uploadUrl": "https://upload.test/img", "image": "urn:li:image:C1"}}
            )
        if request.url.host == "upload.test":
            assert (request.method, request.content) == ("PUT", b"jpeg-bytes")
            return httpx2.Response(201)
        return created()

    linkedin, recorder = adapter(handler)
    outcome = linkedin.publish(CONNECTION, draft(PublishableMedia("med_1", "image/jpeg", str(photo), "Pantalla")))
    assert outcome.kind is OutcomeKind.SUCCEEDED
    assert [r.url.path for r in recorder.requests] == ["/rest/images", "/img", "/rest/posts"]
    assert json.loads(recorder.requests[-1].content)["content"] == {
        "media": {"id": "urn:li:image:C1", "altText": "Pantalla"}
    }


def test_failed_photo_upload_never_sends_the_post(tmp_path):
    photo = tmp_path / "foto.jpg"
    photo.write_bytes(b"x")
    linkedin, recorder = adapter(lambda r: httpx2.Response(500))
    outcome = linkedin.publish(CONNECTION, draft(PublishableMedia("med_1", "image/jpeg", str(photo))))
    assert (outcome.kind, outcome.error.code, outcome.error.retryable) == (
        OutcomeKind.REJECTED,
        "IMAGE_UPLOAD_FAILED",
        True,
    )
    assert all(r.url.path != "/rest/posts" for r in recorder.requests)


def test_missing_photo_file_is_safe_to_retry():
    linkedin, recorder = adapter(lambda r: created())
    outcome = linkedin.publish(CONNECTION, draft(PublishableMedia("med_1", "image/jpeg", "/no/existe.jpg")))
    assert (outcome.kind, outcome.error.code) == (OutcomeKind.REJECTED, "IMAGE_UPLOAD_FAILED")
    assert recorder.requests == []


def raise_(error):
    def handler(request):
        raise error

    return handler


@pytest.mark.parametrize(
    ("handler", "kind", "code", "retryable"),
    [
        (raise_(httpx2.ReadTimeout("slow")), OutcomeKind.UNKNOWN, "PROVIDER_TIMEOUT_AFTER_SEND", False),
        (raise_(httpx2.ConnectError("down")), OutcomeKind.REJECTED, "PROVIDER_UNREACHABLE", True),
        (raise_(httpx2.ConnectTimeout("down")), OutcomeKind.REJECTED, "PROVIDER_UNREACHABLE", True),
        (lambda r: httpx2.Response(401), OutcomeKind.REJECTED, "OAUTH_TOKEN_EXPIRED", True),
        (lambda r: httpx2.Response(403), OutcomeKind.REJECTED, "PERMISSION_DENIED", False),
        (lambda r: httpx2.Response(429), OutcomeKind.REJECTED, "RATE_LIMITED", True),
        (lambda r: httpx2.Response(422, json={"message": "Too long"}), OutcomeKind.REJECTED, "CONTENT_REJECTED", False),
        (lambda r: httpx2.Response(500), OutcomeKind.UNKNOWN, "PROVIDER_ERROR_AFTER_SEND", False),
    ],
)
def test_failures_never_look_like_success(handler, kind, code, retryable):
    linkedin, _ = adapter(handler)
    outcome = linkedin.publish(CONNECTION, draft())
    assert (outcome.kind, outcome.error.code, outcome.error.retryable) == (kind, code, retryable)


def test_created_without_post_id_is_not_confirmed():
    linkedin, _ = adapter(lambda r: httpx2.Response(201))
    outcome = linkedin.publish(CONNECTION, draft())
    assert (outcome.kind, outcome.external_post_id, outcome.external_url) == (OutcomeKind.SUCCEEDED, None, None)


def test_cannot_look_up_member_posts():
    linkedin, recorder = adapter(lambda r: httpx2.Response(500))
    assert linkedin.lookup(CONNECTION, None) is None
    assert recorder.requests == []


def test_config_repr_hides_secret():
    assert "secret-xyz" not in repr(CONFIG)
