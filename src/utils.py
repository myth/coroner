from datetime import date, datetime, timedelta
from itertools import tee
from logging import getLogger
from math import log10
from typing import Any, Union

from pytz import timezone

LOG = getLogger(__name__)
UTC = timezone('UTC')
NLT = timezone('Europe/Oslo')


def pairwise(iterable):
    a, b = tee(iterable)

    next(b, None)

    return zip(a, b)


def ensure_field(obj: Any, field: str):
    if not hasattr(obj, field):
        raise ValueError(f'Object {obj} did not have attribute "{field}"')


def percent_change(new: Union[int, float], old: Union[int, float]):
    return round((new - old) / max(old, 1) * 100, 2)


def doubling_rate(new: Union[int, float], old: Union[int, float]):
    if new == 0 or old == 0 or new == old:
        return 0

    return round(log10(2) / log10(1 + (new - old) / max(old, 1)), 2)


def get_today_local():
    return UTC.localize(datetime.utcnow()).astimezone(NLT).date()


def get_now_local():
    return UTC.localize(datetime.utcnow()).astimezone(NLT)


def create_date_range(start: date, end: date):
    dates = [start]

    while start < end:
        start += timedelta(days=1)

        dates.append(start)

    return dates
