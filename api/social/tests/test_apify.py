from __future__ import annotations

import json

import httpx2
import pytest
from conftest import NOW
from social.apify import ApifyConfig, ApifyLinkedInPosts, profile_slug, same_person
from social.linkedin import LinkedInAdapter, LinkedInConfig
from social.models import Connection, Platform
from social.ports import ProviderReadError

CONNECTION = Connection(
    Platform.LINKEDIN, "tok", frozenset({"w_member_social"}), account_id="m-1", account_handle="Mayko Fernández"
)


def item(text: str, slug: str = "mayko-dev", name: str = "Mayko Fernandez") -> dict:
    return {"type": "post", "content": text, "author": {"publicIdentifier": slug, "name": name}}


def reader(handler) -> tuple[ApifyLinkedInPosts, list[httpx2.Request]]:
    requests: list[httpx2.Request] = []

    def record(request: httpx2.Request) -> httpx2.Response:
        requests.append(request)
        return handler(request)

    client = httpx2.Client(transport=httpx2.MockTransport(record))
    return ApifyLinkedInPosts(ApifyConfig("apify-token"), client), requests


@pytest.mark.parametrize(
    ("url", "slug"),
    [
        ("https://www.linkedin.com/in/mayko-dev/", "mayko-dev"),
        ("linkedin.com/in/mayko-dev", "mayko-dev"),
        ("https://ar.linkedin.com/in/jos%C3%A9-p", "josé-p"),
        ("https://www.linkedin.com/company/google", None),
        ("https://evil.com/in/mayko-dev", None),
        ("https://www.linkedin.com/in/mayko-dev/recent-activity/", None),
    ],
)
def test_profile_slug(url, slug):
    assert profile_slug(url) == slug


def test_same_person_ignores_accents_case_and_extra_names():
    assert same_person("Mayko Fernández", "mayko fernandez")
    assert same_person("Mayko", "Mayko Fernandez")
    assert not same_person("Bill Gates", "Mayko Fernandez")
    assert not same_person("", "Mayko")


def test_reads_own_posts_and_caps_cost():
    def handler(request: httpx2.Request) -> httpx2.Response:
        return httpx2.Response(
            201,
            json=[
                item("Gané la hackatón con mi equipo. https://lnkd.in/abc"),
                item("Repost de otra persona", slug="otra-persona", name="Otra Persona"),
                item(""),
                item("Segundo post propio"),
            ],
        )

    apify, requests = reader(handler)
    assert apify.read("linkedin.com/in/mayko-dev", "Mayko Fernández", 5) == [
        "Gané la hackatón con mi equipo.",
        "Segundo post propio",
    ]
    [request] = requests
    assert request.url.path == "/v2/acts/harvestapi~linkedin-profile-posts/run-sync-get-dataset-items"
    assert request.headers["Authorization"] == "Bearer apify-token"
    assert "apify-token" not in str(request.url)
    assert request.url.params["maxTotalChargeUsd"] == "0.10"
    assert json.loads(request.content) == {
        "targetUrls": ["https://www.linkedin.com/in/mayko-dev/"],
        "maxPosts": 10,
        "includeReposts": False,
    }


def test_rejects_someone_elses_profile():
    apify, _ = reader(lambda r: httpx2.Response(201, json=[item("Hola", slug="williamhgates", name="Bill Gates")]))
    with pytest.raises(ProviderReadError) as error:
        apify.read("https://www.linkedin.com/in/williamhgates/", "Mayko Fernández", 5)
    assert (error.value.code, error.value.retryable) == ("PROFILE_MISMATCH", False)
    assert "Bill Gates" in error.value.message


def test_invalid_url_never_calls_apify():
    apify, requests = reader(lambda r: httpx2.Response(201, json=[]))
    with pytest.raises(ProviderReadError) as error:
        apify.read("https://www.linkedin.com/company/google", "Mayko", 5)
    assert error.value.code == "INVALID_PROFILE_URL" and requests == []


@pytest.mark.parametrize(
    ("status", "code", "retryable"),
    [
        (401, "READ_UNAVAILABLE", False),
        (402, "READ_UNAVAILABLE", False),
        (408, "PROVIDER_TIMEOUT", True),
        (429, "RATE_LIMITED", True),
        (500, "PROVIDER_ERROR", True),
    ],
)
def test_apify_errors(status, code, retryable):
    apify, _ = reader(lambda r: httpx2.Response(status, json={"error": {"type": "x"}}))
    with pytest.raises(ProviderReadError) as error:
        apify.read("linkedin.com/in/mayko-dev", "Mayko", 5)
    assert (error.value.code, error.value.retryable) == (code, retryable)


def test_network_error_is_retryable():
    def boom(request):
        raise httpx2.ConnectError("down", request=request)

    apify, _ = reader(boom)
    with pytest.raises(ProviderReadError) as error:
        apify.read("linkedin.com/in/mayko-dev", "Mayko", 5)
    assert (error.value.code, error.value.retryable) == ("PROVIDER_UNREACHABLE", True)


def test_linkedin_adapter_reads_only_with_apify_and_profile_url():
    http = httpx2.Client(transport=httpx2.MockTransport(lambda r: httpx2.Response(201, json=[item("Post")])))
    config = LinkedInConfig("cid", "secret", "http://localhost/cb")
    assert LinkedInAdapter(config, http, clock=lambda: NOW).supports_read_posts is False

    linkedin = LinkedInAdapter(config, http, posts=ApifyLinkedInPosts(ApifyConfig("t"), http))
    assert linkedin.supports_read_posts is True
    with pytest.raises(ProviderReadError) as error:
        linkedin.read_recent_posts(CONNECTION, 5)
    assert error.value.code == "PROFILE_URL_REQUIRED"
    assert linkedin.read_recent_posts(CONNECTION, 5, "linkedin.com/in/mayko-dev") == ["Post"]
