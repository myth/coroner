from __future__ import annotations

from datetime import date, datetime, timedelta
from logging import getLogger
from json import dumps
from typing import Any, Dict, List

from utils import get_today_local, percent_change

LOG = getLogger(__name__)
POPULATION: int = 5367580


def create_date_range(data):
    start = date.fromisoformat(min(data))
    today = get_today_local()
    end = date.fromisoformat(max(data))

    if end < today:
        end = today

    dates = [start]

    while start < end:
        start += timedelta(days=1)

        dates.append(start)

    return dates


def update_from_data(current: Stats, previous: Stats, data: Dict[str, Any]):
    def get_biggest_valid(field: str):
        if data[field] is not None and data[field] > getattr(previous, field):
            return data[field]
        return getattr(previous, field)

    def get_valid(field: str):
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
    current.hospital_staff_quarantined = get_valid('hospital_staff_quarantined')


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
    for i in range(window, len(stats)):
        s = stats[i]

        ma = round(sum(getattr(obj, field) for obj in stats[i-window:i]) / window, 2)

        setattr(s, f'{field}_mov_avg_{window}', ma)


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


class Stats:
    def __init__(self, day):
        self.date = day

        self.infected = 0
        self.infected_today = 0
        self.infected_yesterday = 0
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
        self.hospital_staff_infected_today_mov_avg_3 = 0
        self.hospital_staff_infected_today_mov_avg_5 = 0

        self.hospital_staff_quarantined = 0
        self.hospital_staff_quarantined_today = 0
        self.hospital_staff_quarantined_yesterday = 0
        self.hospital_staff_quarantined_today_mov_avg_3 = 0
        self.hospital_staff_quarantined_today_mov_avg_5 = 0

    @property
    def infected_diff(self):
        return self.infected_today - self.infected_yesterday

    @property
    def infected_diff_percent(self):
        return percent_change(
            self.infected_today,
            self.infected_diff
        )

    @property
    def dead_diff(self):
        return self.dead_today - self.dead_yesterday

    @property
    def dead_diff_percent(self):
        return percent_change(
            self.dead_today,
            self.dead_diff
        )

    @property
    def tested_diff(self):
        return self.tested_today - self.tested_yesterday

    @property
    def tested_diff_percent(self):
        return percent_change(
            self.tested_today,
            self.tested_diff
        )

    @property
    def tested_hit_ratio_percent(self):
        if self.tested == 0:
            return 0

        return round(self.infected / self.tested * 100, 2)

    @property
    def hospitalized_diff(self):
        return self.hospitalized_today - self.hospitalized_yesterday

    @property
    def hospitalized_diff_percent(self):
        return percent_change(
            self.hospitalized_today,
            self.hospitalized_diff
        )

    @property
    def hospitalized_critical_diff(self):
        return self.hospitalized_critical_today - self.hospitalized_critical_yesterday

    @property
    def hospitalized_critical_diff_percent(self):
        return percent_change(
            self.hospitalized_critical_today,
            self.hospitalized_critical_diff
        )

    @property
    def hospital_staff_infected_diff(self):
        return self.hospital_staff_infected_today - self.hospital_staff_infected_yesterday

    @property
    def hospital_staff_infected_diff_percent(self):
        return percent_change(
            self.hospital_staff_infected_today,
            self.hospital_staff_infected_diff
        )

    @property
    def hospital_staff_quarantined_diff(self):
        return self.hospital_staff_quarantined_today - self.hospital_staff_quarantined_yesterday

    @property
    def hospital_staff_quarantined_diff_percent(self):
        return percent_change(
            self.hospital_staff_quarantined_today,
            self.hospital_staff_quarantined_diff
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
                'diff': self.infected_diff,
                'diff_percent': self.infected_diff_percent,
                'today_mov_avg_3': self.infected_today_mov_avg_3,
                'today_mov_avg_5': self.infected_today_mov_avg_5,
            },
            'dead': {
                'total': self.dead,
                'today': self.dead_today,
                'yesterday': self.dead_yesterday,
                'diff': self.dead_diff,
                'diff_percent': self.dead_diff_percent,
                'today_mov_avg_3': self.dead_today_mov_avg_3,
                'today_mov_avg_5': self.dead_today_mov_avg_5,
                'mortality_percent': self.mortality_percent,
            },
            'tested': {
                'total': self.tested,
                'today': self.tested_today,
                'yesterday': self.tested_yesterday,
                'diff': self.tested_diff,
                'diff_percent': self.tested_diff_percent,
                'hit_ratio_percent': self.tested_hit_ratio_percent,
                'today_mov_avg_3': self.tested_today_mov_avg_3,
                'today_mov_avg_5': self.tested_today_mov_avg_5,
            },
            'hospitalized': {
                'general': {
                    'total': self.hospitalized,
                    'today': self.hospitalized_today,
                    'yesterday': self.hospitalized_yesterday,
                    'diff': self.hospitalized_diff,
                    'diff_percent': self.hospitalized_diff_percent,
                    'today_mov_avg_3': self.hospitalized_today_mov_avg_3,
                    'today_mov_avg_5': self.hospitalized_today_mov_avg_5,
                },
                'critical': {
                    'total': self.hospitalized_critical,
                    'today': self.hospitalized_critical_today,
                    'yesterday': self.hospitalized_critical_yesterday,
                    'diff': self.hospitalized_critical_diff,
                    'diff_percent': self.hospitalized_critical_diff_percent,
                    'today_mov_avg_3': self.hospitalized_critical_today_mov_avg_3,
                    'today_mov_avg_5': self.hospitalized_critical_today_mov_avg_5,
                }
            },
            'hospital_staff': {
                'infected': {
                    'total': self.hospital_staff_infected,
                    'today': self.hospital_staff_infected_today,
                    'yesterday': self.hospital_staff_infected_yesterday,
                    'diff': self.hospital_staff_infected_diff,
                    'diff_percent': self.hospital_staff_infected_diff_percent,
                    'today_mov_avg_3': self.hospital_staff_infected_today_mov_avg_3,
                    'today_mov_avg_5': self.hospital_staff_infected_today_mov_avg_5,
                },
                'quarantined': {
                    'total': self.hospital_staff_quarantined,
                    'today': self.hospital_staff_quarantined_today,
                    'yesterday': self.hospital_staff_quarantined_yesterday,
                    'diff': self.hospital_staff_quarantined_diff,
                    'diff_percent': self.hospital_staff_quarantined_diff_percent,
                    'today_mov_avg_3': self.hospital_staff_quarantined_today_mov_avg_3,
                    'today_mov_avg_5': self.hospital_staff_quarantined_today_mov_avg_5,
                }
            },
            'population': {
                'total': POPULATION,
                'infected_percent': self.population_infected_percent,
                'tested_percent': self.population_tested_percent
            }
        }

    @staticmethod
    def assemble(data):
        """
        Assemble stats objects from raw data.

        :param data: Dict with ISO dates as keys, and data in different fields.
        """

        LOG.debug('Assembling stats objects from raw data')

        stats = []

        for i, d in enumerate(create_date_range(data)):
            current = Stats(d)
            k = d.isoformat()

            if i == 0:
                update_from_data(current, Stats(d), data[k])
            else:
                update_from_data(current, stats[i-1], data[k])

            stats.append(current)

        LOG.debug('Calculating changesets')

        for i in range(1, len(stats)):
            calculate_changes(stats[i], stats[i-1])

        calculate_moving_averages(stats)

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
