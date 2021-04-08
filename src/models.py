from __future__ import annotations

from datetime import date, datetime, timedelta
from json import dumps
from logging import getLogger
from typing import Any, Dict, List, NamedTuple, Union

from utils import create_date_range, percent_change

LOG = getLogger(__name__)
POPULATION: int = 5367580
START: date = date(2020, 2, 24)


def calculate_moving_average(data: list, field: str, window_size: int):
    start = window_size - 1

    for i, day in enumerate(data):
        current_window = [obj[field] for obj in data[max(i - start, 0) : i + 1]]

        ma = round(sum(current_window) / window_size, 2)
        ma_field = f"{field}_avg_{window_size}"

        day[ma_field] = ma


class TimeSeries:
    DEFAULT: Dict[str, int] = {
        "infected.today": 0,
        "dead.today": 0,
        "tests.today": 0,
        "tests.positive": 0.0,
        "hospitalized.general.total": 0,
        "hospitalized.intensive_care.total": 0,
        "hospitalized.ventilator.total": 0,
        "vaccinated.doses.today": 0,
        "vaccinated.dose_1.today": 0,
        "vaccinated.dose_2.today": 0,
    }

    def __init__(self, raw_data: Dict[str, dict]):
        LOG.debug("Constructing TimeSeries")

        # Populate defaults
        self.data = [
            {
                "date": d.isoformat(),
                **TimeSeries.DEFAULT,
            } for d in create_date_range(START, date.today())
        ]

        # Update with API data
        for d in self.data:
            day = d["date"]
            if day in raw_data:
                d.update(raw_data[day])

        # Enrich the data
        self.compute_totals()
        self.compute_dailies()
        self.compute_averages()
        self.compute_changes()
        self.compute_additional_metrics()

    def compute_totals(self):
        LOG.debug("Calculating totals")

        fields = (
            "infected",
            "dead",
            "tests",
            "vaccinated.doses",
            "vaccinated.dose_1",
            "vaccinated.dose_2"
        )

        for i, today in enumerate(self.data):
            yesterday = self.data[max(i-1, 0)]

            for f in fields:
                if i == 0:
                    today[f"{f}.total"] = today[f"{f}.today"]
                else:
                    today[f"{f}.total"] = yesterday[f"{f}.total"] + today[f"{f}.today"]

    def compute_dailies(self):
        LOG.debug("Calculating dailies")

        fields = (
            "hospitalized.general",
            "hospitalized.intensive_care",
            "hospitalized.ventilator",
        )

        for i, today in enumerate(self.data):
            yesterday = self.data[max(i-1, 0)]

            for f in fields:
                if i == 0:
                    today[f"{f}.today"] = today[f"{f}.total"]
                else:
                    today[f"{f}.today"] = today[f"{f}.total"] - yesterday[f"{f}.total"]

    def compute_averages(self):
        LOG.debug("Calculating moving averages")

        windows = [3, 7]
        fields = (
            "infected.today",
            "dead.today",
            "tests.today",
            "tests.positive",
            "vaccinated.doses.today",
            "vaccinated.dose_1.today",
            "vaccinated.dose_2.today"
        )

        for f in fields:
            for w in windows:
                calculate_moving_average(self.data, f, w)

    def compute_changes(self):
        LOG.debug("Calculating changes")

        fields = (
            "infected",
            "tests",
            "vaccinated.doses"
        )

        for day in self.data:
            for f in fields:
                d = day[f"{f}.today"]
                t = day[f"{f}.total"]
                day[f"{f}.delta_percent"] = percent_change(t, t - d)

    def compute_additional_metrics(self):
        LOG.debug("Calculating additional metrics")

        for day in self.data:
            day["population.total"] = POPULATION
            day["dead.mortality_rate"] = round(day["dead.total"] / max(day["infected.total"], 1) * 100, 3)
            day["population.infected"] = round(day["infected.total"] / POPULATION * 100, 3)
            day["population.vaccinated"] = round(day["vaccinated.dose_1.total"] / POPULATION * 100, 3)
            day["population.vaccinated_full"] = round(day["vaccinated.dose_2.total"] / POPULATION * 100, 3)
