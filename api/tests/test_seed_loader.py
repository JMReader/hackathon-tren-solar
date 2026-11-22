from __future__ import annotations

import os
import subprocess
import sys
from pathlib import Path

import pytest

API_DIR = Path(__file__).resolve().parents[1]


def test_seed_requires_allow_flag(settings, tmp_path, monkeypatch):
    env = os.environ.copy()
    env.pop("TS_ALLOW_SEED", None)
    env["TS_DATA_DIR"] = str(tmp_path)
    proc = subprocess.run(
        [sys.executable, "-m", "scripts.seed"],
        cwd=API_DIR,
        env=env,
        capture_output=True,
        text=True,
    )
    assert proc.returncode == 2


@pytest.mark.parametrize("allow", ["1"])
def test_seed_loads_demo_employers(settings, tmp_path, monkeypatch, allow):
    monkeypatch.setenv("TS_ALLOW_SEED", allow)
    monkeypatch.setenv("TS_DATA_DIR", str(tmp_path))
    proc = subprocess.run(
        [sys.executable, "-m", "scripts.seed", "--list"],
        cwd=API_DIR,
        capture_output=True,
        text=True,
    )
    assert proc.returncode == 0, proc.stderr
    assert "seed_emp_paid" in proc.stdout
    assert "seed-ana-ux" in proc.stdout