"""Intentionally flaky tests so the dashboard's flaky-tests view has signal."""
import os
import random
import time


_FLAKE_SEED = os.environ.get("FLAKE_SEED")
if _FLAKE_SEED:
    random.seed(int(_FLAKE_SEED))


def test_stable_one():
    assert 2 + 2 == 4


def test_flaky_thirty_percent():
    """Fails ~30% of runs."""
    time.sleep(0.05)
    assert random.random() > 0.3, "flaky test rolled below threshold"


def test_stable_two():
    assert sorted([3, 1, 2]) == [1, 2, 3]


def test_flaky_fifteen_percent():
    """Fails ~15% of runs."""
    time.sleep(0.05)
    assert random.random() > 0.15, "second flaky test rolled below threshold"


def test_stable_three():
    assert "regression".startswith("reg")
