"""Long-running tests for parallelism / utilization demonstrations."""
import os
import time


_SLEEP_BASE = float(os.environ.get("SLOW_SLEEP_SECONDS", "30"))


def test_warmup():
    time.sleep(2)
    assert True


def test_long_calc():
    start = time.time()
    total = 0
    for i in range(2_000_000):
        total += i
    time.sleep(_SLEEP_BASE)
    assert total > 0
    assert time.time() - start >= _SLEEP_BASE


def test_cooldown():
    time.sleep(1)
    assert True
