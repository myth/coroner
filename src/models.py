from __future__ import annotations

from datetime import date, datetime, timedelta
from logging import getLogger
from math import log10
from json import dumps
from typing import Any, Dict, List, Union

import numpy as np

from utils import (
    create_date_range,
    doubling_rate,
    ensure_field,
    get_today_local,
    percent_change
)

LOG = getLogger(__name__)
POPULATION: int = 5367580
PROJECTION_DEFAULT_POLY_ORDER: int = 3
PROJECTION_DEFAULT_HISTORY_LENGTH: int = 14
PROJECTION_DEFAULT_PROJECTION_LENGTH: int = 7


def create_date_range_from_data(data):
    start = date.fromisoformat(min(data))
    today = get_today_local()
    end = date.fromisoformat(max(data))

    if end != today:
        end = today

    return create_date_range(start, end)


def update_from_data(current: Stats, previous: Stats, data: Dict[str, Any]):
    def get_biggest_valid(field: str):
        ensure_field(previous, field)

        if data[field] is not None and data[field] > getattr(previous, field):
            return data[field]
        return getattr(previous, field)

    def get_valid(field: str):
        ensure_field(previous, field)

        if data[field] is not None and data[field] > 0:
            return data[field]
        return getattr(previous, field)

    current.infected = get_biggest_valid('infected')
    current.infected_today = data['infected_new']
    current.dead = get_biggest_valid('dead')
    current.dead_today = data['dead_new']
    current.tested = get_biggest_valid('tested')
    current.hospitalized = get_valid('hospitalized')
    current.hospitalized_critical = get_valid('hospitalized_critical')
    current.hospital_staff_infected = get_valid('hospital_staff_infected')
    current.hospital_staff_quarantined = get_valid(
        'hospital_staff_quarantined')


def calculate_changes(current: Stats, previous: Stats):
    current.infected_yesterday = previous.infected_today
    current.dead_yesterday = previous.dead_today
    current.tested_today = current.tested - previous.tested
    current.tested_yesterday = previous.tested_today
    current.hospitalized_today = current.hospitalized - previous.hospitalized
    current.hospitalized_yesterday = previous.hospitalized_today
    current.hospitalized_critical_today = current.hospitalized_critical - previous.hospitalized_critical
    current.hospitalized_critical_yesterday = previous.hospitalized_critical_today
    current.hospital_staff_infected_today = current.hospital_staff_infected - previous.hospital_staff_infected
    current.hospital_staff_infected_yesterday = previous.hospital_staff_infected_today
    current.hospital_staff_quarantined_today = current.hospital_staff_quarantined - previous.hospital_staff_quarantined
    current.hospital_staff_quarantined_yesterday = previous.hospital_staff_quarantined_today


def calculate_moving_average(stats: List[Stats], field: str, window: int):
    start = window - 1

    for i in range(start, len(stats)):
        s = stats[i]

        ensure_field(s, field)

        slice = [getattr(obj, field) for obj in stats[i-start:i+1]]
        ma = round(sum(slice) / window, 2)

        ma_field = f'{field}_mov_avg_{window}'
        ensure_field(s, ma_field)

        setattr(s, ma_field, ma)


def calculate_moving_averages(stats: List[Stats]):
    LOG.debug('Calculating moving averages')

    windows = [3, 5]
    fields = [
        'infected_today',
        'dead_today',
        'tested_today',
        'hospitalized_today',
        'hospitalized_critical_today',
        'hospital_staff_infected_today',
        'hospital_staff_quarantined_today'
    ]

    for w in windows:
        for f in fields:
            calculate_moving_average(stats, f, w)


def calculate_doubling_rate(stats: List[Stats], field: str, mov_avg_3: bool = False):
    for i in range(1, len(stats)):
        current = stats[i]
        previous = stats[i-1]

        ensure_field(current, field)
        ensure_field(previous, field)

        current_val = getattr(current, field)

        if mov_avg_3:
            ma_field = f'{field}_today_mov_avg_3'
            ensure_field(current, ma_field)
            previous_val = current_val - getattr(current, ma_field)
        else:
            previous_val = getattr(previous, field)

        dr = doubling_rate(current_val, previous_val)

        if mov_avg_3:
            dr_field = f'{field}_doubling_rate_from_mov_avg_3'
        else:
            dr_field = f'{field}_doubling_rate'

        ensure_field(current, dr_field)

        setattr(current, dr_field, dr)


def calculate_doubling_rates(stats: List[Stats]):
    LOG.debug('Calculating doubling rates')

    fields = [
        'infected',
        'hospitalized',
        'hospital_staff_infected'
    ]

    for f in fields:
        calculate_doubling_rate(stats, f)

    calculate_doubling_rate(stats, 'infected', mov_avg_3=True)


def project_curve(stats: List[Stats],
                  field: str,
                  *,
                  projection_length: int = PROJECTION_DEFAULT_PROJECTION_LENGTH,
                  order: int = PROJECTION_DEFAULT_POLY_ORDER,
                  can_decline: bool = False,
                  exp_error_bounds: bool = True):
    """
    Project the future evolution of a curve using polynomial regression.

    :param stats: A list of Stats objects with historical data.
    :param field: Which attribute on the Stats object to read.
    :param projection_length: How many days into the future to project the curve.
    :param can_decline: Whether or not the curve is allowed to go back down (i.e not allowed for total infections).
    :param exp_error_bounds: Whether or not exponential or constant error percentage should be used to calculate upper/lower bounds.
    """
    curve = []

    x = np.array(range(len(stats)))
    y = np.array([getattr(s, field) for s in stats])

    # Grab the last known value to use for flooring if the curve is not allowed to decline
    baseline = float(y[-1])

    # Calculate the coefficients of the polynomial and grab the covariance matrix
    c, cov = np.polyfit(x, y, order, cov=True)

    # Calculate the standard deviation of each of the coefficients
    err = np.sqrt(np.diag(cov))

    # Create the polynomlial functions based on the coefficients
    f = np.poly1d(c)

    abs_error_percent = []

    for i in range(len(stats) + projection_length):
        if i >= len(stats):
            #print(i, f(i), 0)
            curve.append(int(round(f(i))))
        else:
            val = getattr(stats[i], field)

            # Calculate the absolute error in percent
            err = abs(val - f(i)) / max(1, val)
            abs_error_percent.append(err)

    # Apply a floor to the curve if it is not allowed to decline
    if not can_decline:
        for i in range(1, len(curve)):
            if curve[i] < baseline:
                curve[i] = baseline
            if curve[i] < curve[i-1]:
                curve[i] = curve[i-1]

    median_err = np.median(abs_error_percent)

    upper_bound = []
    lower_bound = []

    for i, d in enumerate(curve):
        if exp_error_bounds:
            upper_bound.append(d * (1 + median_err)**(1 + i))
            lower_bound.append(d * (1 - median_err)**(1 + i))
        else:
            upper_bound.append(d * (1 + median_err))
            lower_bound.append(d * (1 - median_err))

    # Apply a floor to the lower bound if the curve is not allowed to decline
    if not can_decline:
        for i in range(1, len(curve)):
            if lower_bound[i] < baseline:
                lower_bound[i] = baseline
            if lower_bound[i] < lower_bound[i-1]:
                lower_bound[i] = lower_bound[i-1]


    # Apply a cutoff if any of the curves reaches below 0
    for i in range(len(curve)):
        if curve[i] < 0:
            curve[i] = 0
        if upper_bound[i] < 0:
            upper_bound[i] = 0
        if lower_bound[i] < 0:
            lower_bound[i] = 0

    return curve, lower_bound, upper_bound


def project_curves(stats: List[Stats]):
    LOG.debug('Projecting curves')

    length = PROJECTION_DEFAULT_PROJECTION_LENGTH
    history = PROJECTION_DEFAULT_HISTORY_LENGTH

    fields = [
        'infected',
        'infected_today',
        'hospitalized',
        'hospital_staff_infected',
    ]

    # Only start from the point where we have at least "history" number of historical stats objects
    for t, s in enumerate(stats[history:]):
        projected_dates = [s.date + timedelta(days=1 + i) for i in range(length)]
        projections = [ProjectionStats(d) for d in projected_dates]

        # Grab the N last historical samples up to and including this stat
        data = stats[t:history + t + 1]

        for f in fields:
            # Daily infections and current number of hospitalizations can decline
            if f in ('infected_today', 'hospitalized'):
                can_decline = True
                order = 4
            else:
                can_decline = False
                order = 3

            # Make some predictions
            curve, lower, upper = project_curve(
                data,
                f,
                projection_length=length,
                can_decline=can_decline,
                order=order
            )

            # Update the projection stats objects with the curve data
            for ps, c, l, u in zip(projections, curve, lower, upper):
                setattr(ps, f, int(round(c)))
                setattr(ps, f'{f}_lower', int(round(l)))
                setattr(ps, f'{f}_upper', int(round(u)))

        s.projections = projections


class ProjectionStats:
    def __init__(self, date: date):
        self.date = date

        self.infected = 0
        self.infected_lower = 0
        self.infected_upper = 0

        self.infected_today = 0
        self.infected_today_lower = 0
        self.infected_today_upper = 0

        self.hospitalized = 0
        self.hospitalized_lower = 0
        self.hospitalized_upper = 0

        self.hospital_staff_infected = 0
        self.hospital_staff_infected_lower = 0
        self.hospital_staff_infected_upper = 0

    def json(self) -> Dict[str, Union[int, float]]:
        return {
            'date': self.date.isoformat(),
            'infected': self.infected,
            'infected_lower': self.infected_lower,
            'infected_upper': self.infected_upper,
            'infected_today': self.infected_today,
            'infected_today_lower': self.infected_today_lower,
            'infected_today_upper': self.infected_today_upper,
            'hospitalized': self.hospitalized,
            'hospitalized_lower': self.hospitalized_lower,
            'hospitalized_upper': self.hospitalized_upper,
            'hospital_staff_infected': self.hospital_staff_infected,
            'hospital_staff_infected_lower': self.hospital_staff_infected_lower,
            'hospital_staff_infected_upper': self.hospital_staff_infected_upper
        }


class Stats:
    def __init__(self, day):
        self.date = day

        self.infected = 0
        self.infected_today = 0
        self.infected_yesterday = 0
        self.infected_doubling_rate = 0
        self.infected_doubling_rate_from_mov_avg_3 = 0
        self.infected_today_mov_avg_3 = 0
        self.infected_today_mov_avg_5 = 0

        self.dead = 0
        self.dead_today = 0
        self.dead_yesterday = 0
        self.dead_today_mov_avg_3 = 0
        self.dead_today_mov_avg_5 = 0

        self.tested = 0
        self.tested_today = 0
        self.tested_yesterday = 0
        self.tested_today_mov_avg_3 = 0
        self.tested_today_mov_avg_5 = 0

        self.hospitalized = 0
        self.hospitalized_today = 0
        self.hospitalized_yesterday = 0
        self.hospitalized_doubling_rate = 0
        self.hospitalized_today_mov_avg_3 = 0
        self.hospitalized_today_mov_avg_5 = 0

        self.hospitalized_critical = 0
        self.hospitalized_critical_today = 0
        self.hospitalized_critical_yesterday = 0
        self.hospitalized_critical_today_mov_avg_3 = 0
        self.hospitalized_critical_today_mov_avg_5 = 0

        self.hospital_staff_infected = 0
        self.hospital_staff_infected_today = 0
        self.hospital_staff_infected_yesterday = 0
        self.hospital_staff_infected_doubling_rate = 0
        self.hospital_staff_infected_today_mov_avg_3 = 0
        self.hospital_staff_infected_today_mov_avg_5 = 0

        self.hospital_staff_quarantined = 0
        self.hospital_staff_quarantined_today = 0
        self.hospital_staff_quarantined_yesterday = 0
        self.hospital_staff_quarantined_today_mov_avg_3 = 0
        self.hospital_staff_quarantined_today_mov_avg_5 = 0

        self.projections: List[ProjectionStats] = []

    @property
    def infected_change_percent(self):
        return percent_change(self.infected, self.infected - self.infected_today)

    @property
    def infected_daily_diff(self):
        return self.infected_today - self.infected_yesterday

    @property
    def infected_daily_diff_percent(self):
        return percent_change(
            self.infected_today,
            self.infected_yesterday
        )

    @property
    def dead_change_percent(self):
        return percent_change(self.dead, self.dead - self.dead_today)

    @property
    def dead_daily_diff(self):
        return self.dead_today - self.dead_yesterday

    @property
    def dead_daily_diff_percent(self):
        return percent_change(
            self.dead_today,
            self.dead_yesterday
        )

    @property
    def tested_change_percent(self):
        return percent_change(self.tested, self.tested - self.tested_today)

    @property
    def tested_daily_diff(self):
        return self.tested_today - self.tested_yesterday

    @property
    def tested_daily_diff_percent(self):
        return percent_change(
            self.tested_today,
            self.tested_yesterday
        )

    @property
    def tested_hit_ratio_percent(self):
        if self.tested == 0:
            return 0

        return round(self.infected / self.tested * 100, 2)

    @property
    def hospitalized_change_percent(self):
        return percent_change(self.hospitalized, self.hospitalized - self.hospitalized_today)

    @property
    def hospitalized_daily_diff(self):
        return self.hospitalized_today - self.hospitalized_yesterday

    @property
    def hospitalized_daily_diff_percent(self):
        return percent_change(
            self.hospitalized_today,
            self.hospitalized_yesterday
        )

    @property
    def hospitalized_critical_change_percent(self):
        return percent_change(self.hospitalized_critical, self.hospitalized_critical - self.hospitalized_critical_today)

    @property
    def hospitalized_critical_daily_diff(self):
        return self.hospitalized_critical_today - self.hospitalized_critical_yesterday

    @property
    def hospitalized_critical_daily_diff_percent(self):
        return percent_change(
            self.hospitalized_critical_today,
            self.hospitalized_critical_yesterday
        )

    @property
    def hospital_staff_infected_change_percent(self):
        return percent_change(self.hospital_staff_infected, self.hospital_staff_infected - self.hospital_staff_infected_today)

    @property
    def hospital_staff_infected_daily_diff(self):
        return self.hospital_staff_infected_today - self.hospital_staff_infected_yesterday

    @property
    def hospital_staff_infected_daily_diff_percent(self):
        return percent_change(
            self.hospital_staff_infected_today,
            self.hospital_staff_infected_yesterday
        )

    @property
    def hospital_staff_quarantined_change_percent(self):
        return percent_change(self.hospital_staff_quarantined, self.hospital_staff_quarantined - self.hospital_staff_quarantined_today)

    @property
    def hospital_staff_quarantined_daily_diff(self):
        return self.hospital_staff_quarantined_today - self.hospital_staff_quarantined_yesterday

    @property
    def hospital_staff_quarantined_daily_diff_percent(self):
        return percent_change(
            self.hospital_staff_quarantined_today,
            self.hospital_staff_quarantined_yesterday
        )

    @property
    def population_infected_percent(self):
        return round(self.infected / POPULATION * 100, 3)

    @property
    def population_tested_percent(self):
        return round(self.tested / POPULATION * 100, 3)

    @property
    def mortality_percent(self):
        return round(self.dead / max(self.infected, 1) * 100, 3)

    def json(self):
        return {
            'date': self.date.isoformat(),
            'infected': {
                'total': self.infected,
                'today': self.infected_today,
                'yesterday': self.infected_yesterday,
                'doubling_rate': self.infected_doubling_rate,
                'doubling_rate_from_mov_avg_3': self.infected_doubling_rate_from_mov_avg_3,
                'change_percent': self.infected_change_percent,
                'daily_diff': self.infected_daily_diff,
                'daily_diff_percent': self.infected_daily_diff_percent,
                'today_mov_avg_3': self.infected_today_mov_avg_3,
                'today_mov_avg_5': self.infected_today_mov_avg_5,
            },
            'dead': {
                'total': self.dead,
                'today': self.dead_today,
                'yesterday': self.dead_yesterday,
                'change_percent': self.dead_change_percent,
                'daily_diff': self.dead_daily_diff,
                'daily_diff_percent': self.dead_daily_diff_percent,
                'today_mov_avg_3': self.dead_today_mov_avg_3,
                'today_mov_avg_5': self.dead_today_mov_avg_5,
                'mortality_percent': self.mortality_percent,
            },
            'tested': {
                'total': self.tested,
                'today': self.tested_today,
                'yesterday': self.tested_yesterday,
                'change_percent': self.tested_change_percent,
                'daily_diff': self.tested_daily_diff,
                'daily_diff_percent': self.tested_daily_diff_percent,
                'hit_ratio_percent': self.tested_hit_ratio_percent,
                'today_mov_avg_3': self.tested_today_mov_avg_3,
                'today_mov_avg_5': self.tested_today_mov_avg_5,
            },
            'hospitalized': {
                'general': {
                    'total': self.hospitalized,
                    'today': self.hospitalized_today,
                    'yesterday': self.hospitalized_yesterday,
                    'doubling_rate': self.hospitalized_doubling_rate,
                    'change_percent': self.hospitalized_change_percent,
                    'daily_diff': self.hospitalized_daily_diff,
                    'daily_diff_percent': self.hospitalized_daily_diff_percent,
                    'today_mov_avg_3': self.hospitalized_today_mov_avg_3,
                    'today_mov_avg_5': self.hospitalized_today_mov_avg_5,
                },
                'critical': {
                    'total': self.hospitalized_critical,
                    'today': self.hospitalized_critical_today,
                    'yesterday': self.hospitalized_critical_yesterday,
                    'change_percent': self.hospitalized_critical_change_percent,
                    'daily_diff': self.hospitalized_critical_daily_diff,
                    'daily_diff_percent': self.hospitalized_critical_daily_diff_percent,
                    'today_mov_avg_3': self.hospitalized_critical_today_mov_avg_3,
                    'today_mov_avg_5': self.hospitalized_critical_today_mov_avg_5,
                }
            },
            'hospital_staff': {
                'infected': {
                    'total': self.hospital_staff_infected,
                    'today': self.hospital_staff_infected_today,
                    'yesterday': self.hospital_staff_infected_yesterday,
                    'doubling_rate': self.hospital_staff_infected_doubling_rate,
                    'change_percent': self.hospital_staff_infected_change_percent,
                    'daily_diff': self.hospital_staff_infected_daily_diff,
                    'daily_diff_percent': self.hospital_staff_infected_daily_diff_percent,
                    'today_mov_avg_3': self.hospital_staff_infected_today_mov_avg_3,
                    'today_mov_avg_5': self.hospital_staff_infected_today_mov_avg_5,
                },
                'quarantined': {
                    'total': self.hospital_staff_quarantined,
                    'today': self.hospital_staff_quarantined_today,
                    'yesterday': self.hospital_staff_quarantined_yesterday,
                    'change_percent': self.hospital_staff_quarantined_change_percent,
                    'daily_diff': self.hospital_staff_quarantined_daily_diff,
                    'daily_diff_percent': self.hospital_staff_quarantined_daily_diff_percent,
                    'today_mov_avg_3': self.hospital_staff_quarantined_today_mov_avg_3,
                    'today_mov_avg_5': self.hospital_staff_quarantined_today_mov_avg_5,
                }
            },
            'population': {
                'total': POPULATION,
                'infected_percent': self.population_infected_percent,
                'tested_percent': self.population_tested_percent
            },
            'projections': [p.json() for p in self.projections]
        }

    @staticmethod
    def assemble(data):
        """
        Assemble stats objects from raw data.

        :param data: Dict with ISO dates as keys, and data in different fields.
        """

        LOG.debug('Assembling stats objects from raw data')

        stats = []

        for i, d in enumerate(create_date_range_from_data(data)):
            current = Stats(d)
            k = d.isoformat()

            if i == 0:
                update_from_data(current, Stats(d), data[k])
            else:
                if k not in data:
                    k = d - timedelta(days=1).isoformat()

                update_from_data(current, stats[i-1], data[k])

            stats.append(current)

        LOG.debug('Calculating changesets')

        for i in range(1, len(stats)):
            calculate_changes(stats[i], stats[i-1])

        calculate_moving_averages(stats)
        calculate_doubling_rates(stats)
        project_curves(stats)

        return stats

    def __eq__(self, other):
        return self.date == other.date

    def __lt__(self, other):
        return self.date < other.date

    def __lte__(self, other):
        return self.date <= other.date

    def __gt__(self, other):
        return self.date > other.date

    def __gte__(self, other):
        return self.date >= other.date

    def __str__(self) -> str:
        return dumps(self.json(), indent=2, separators=(',', ': '))
