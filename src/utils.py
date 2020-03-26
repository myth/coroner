from datetime import date, datetime
from itertools import tee
from typing import Union

from pytz import timezone

UTC = timezone('UTC')
NLT = timezone('Europe/Oslo')


def pairwise(iterable):
    a, b = tee(iterable)

    next(b, None)

    return zip(a, b)


def percent_change(new: Union[int, float], change: Union[int, float]):
    old = new - change

    return round((new - old) / max(old, 1) * 100, 2)


def get_today_local():
    return UTC.localize(datetime.utcnow()).astimezone(NLT).date()


def get_now_local():
    return UTC.localize(datetime.utcnow()).astimezone(NLT)
