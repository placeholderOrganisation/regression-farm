def test_passes_first():
    assert 1 == 1


def test_passes_second():
    assert "abc"[::-1] == "cba"


def test_off_by_one_bug():
    expected = 10
    actual = sum(range(11))  # 55, not 10
    assert actual == expected, f"expected {expected}, got {actual}"


def test_passes_third():
    assert max([3, 1, 2]) == 3


def test_wrong_membership():
    assert "z" in "abcdef", "letter z is not in 'abcdef' but the test asserts it is"
