import time


def test_addition():
    assert 1 + 1 == 2


def test_string():
    assert "regression".upper() == "REGRESSION"


def test_list_membership():
    assert 3 in [1, 2, 3, 4]


def test_dict_keys():
    d = {"a": 1, "b": 2}
    assert sorted(d.keys()) == ["a", "b"]


def test_tuple_unpack():
    a, b, c = 1, 2, 3
    assert a + b + c == 6


def test_set_ops():
    assert {1, 2} | {2, 3} == {1, 2, 3}


def test_sleep_quick():
    start = time.time()
    time.sleep(0.05)
    assert time.time() - start >= 0.05


def test_truthy():
    assert bool([1])
