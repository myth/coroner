from asyncio import create_task, sleep
from datetime import datetime
from json import dumps
from logging import getLogger
from os.path import abspath, dirname, join
from random import randint
from sys import stdout
from time import time
from traceback import print_exc
from typing import List, Union

from aiohttp import ClientSession

from models import TimeSeries
from utils import get_now_local, get_today_local

LOG = getLogger(__name__)

BACKUP_INTERVAL = 3600 * 12
COLLECT_INTERVAL = 3600

# Data sources
VG_MAIN_STATS = "https://redutv-api.vg.no/corona/v1/areas/country/key"
VG_VACCINATION_STATS = "https://redutv-api.vg.no/corona/v1/areas/country/vaccinations/timeseries"


class Collector:
    def __init__(self):
        self.session = None
        self.task = None
        self.backup_task = None
        self.running = False
        self.status = "ok"
        self._populate_timeseries({}, {})
        self.json = dumps(self.stats)

        LOG.debug("Collector initialized")

    def start(self):
        if not self.running and not self.task:
            self.running = True
            self.task = create_task(self.collect())
            self.backup_task = create_task(self.backup())

    async def stop(self):
        if not self.running and self.task:
            LOG.info("Stopping statistics collector")

            await self.task.cancel()
            LOG.debug("Cancelled collector task")

            await self.backup_task.cancel()
            LOG.debug("Cancelled backup task")

            self.running = False

            LOG.info("Statistics collector stopped")

    async def persistent_session(self, app):
        self.session = ClientSession()
        yield
        await self.session.close()
        LOG.debug("Closed client session")

    async def collect(self):
        LOG.info("Starting statistics collector")

        while self.running:
            LOG.info("Collecting current stats from vg.no")

            try:
                start_time = time()
                case_history = await self._collect_case_history_vg()
                vaccine_history = await self._collect_vaccine_history_vg()

                self._populate_timeseries(
                    case_history,
                    vaccine_history
                )

                self.stats["status"] = "ok"
                elapsed_time = time() - start_time

                LOG.info(f"Collection of current stats from vg.no complete in {elapsed_time:.3f}s")
            except Exception as e:
                LOG.error(e)
                print_exc(file=stdout)
                self._set_error()

            await sleep(COLLECT_INTERVAL)

    async def backup(self):
        LOG.debug("Starting backup routine")

        while self.running:
            await sleep(BACKUP_INTERVAL)

            filename = f"{get_today_local()}.json"

            LOG.info(f"Updating backup file: {filename}")

            path = join(dirname(abspath(__name__)), "..", "data", filename)

            try:
                with open(path, "w") as f:
                    f.write(dumps(self.stats, indent=2, separators=(",", ": ")))
            except Exception as e:
                self._set_error()

                LOG.error(f"Failed to update backup file {filename}: {e}")

    async def _collect_case_history_vg(self):
        async with self.session.get(f"{VG_MAIN_STATS}") as response:
            if response.status == 200:
                data = await response.json()
                data = data["items"]

                # (deaths, cases, tests, positive, trends, hosp, icu, ventilator, mutants)
                deaths = data[0]
                cases = data[1]
                tests = data[2]
                positive = data[3]
                hospitalized = data[5]
                intensive_care = data[6]
                ventilator = data[7]

                stats = {}

                for row in cases["data"]:
                    day = stats.setdefault(row["date"], {})
                    day["infected.today"] = row["value"]

                for row in deaths["data"]:
                    day = stats.setdefault(row["date"], {})
                    day["dead.today"] = row["value"]

                for a, b in zip(tests["data"], positive["data"]):
                    day = stats.setdefault(a["date"], {})
                    day["tests.today"] = a["value"]
                    day["tests.positive"] = b["value"]

                for a, b, c in zip(hospitalized["data"], intensive_care["data"], ventilator["data"]):
                    day = stats.setdefault(a["date"], {})
                    t = a["value"] if a["value"] else 0
                    i = b["value"] if b["value"] else 0
                    v = c["value"] if c["value"] else 0
                    # First few fields are null instead of 0 in VG API
                    day["hospitalized.general.total"] = t - i
                    day["hospitalized.intensive_care.total"] = max(i - v, 0)
                    day["hospitalized.ventilator.total"] = v

                return stats
            else:
                LOG.error(response.text)
                return {}

    async def _collect_vaccine_history_vg(self):
        async with self.session.get(f"{VG_VACCINATION_STATS}") as response:
            if response.status == 200:
                data = await response.json()
                data = data["items"]

                stats = {}

                for row in data:
                    day = stats.setdefault(row["date"], {})
                    d1 = row["new"].get("peopleDose1", 0) or 0
                    d2 = row["new"].get("peopleDose2", 0) or 0
                    day["vaccinated.doses.today"] = d1 + d2
                    day["vaccinated.dose_1.today"] = d1
                    day["vaccinated.dose_2.today"] = d2

                return stats
            else:
                LOG.error(response.text)
                return {}

    def _populate_timeseries(self, case_history, vaccine_history):
        LOG.debug("Updating statistics")
        start_time = time()

        combined = {}

        for k, v in case_history.items():
            combined.setdefault(k, {}).update(v)
        for k, v in vaccine_history.items():
            combined.setdefault(k, {}).update(v)

        self.timeseries = TimeSeries(combined)
        self.stats = {
            "status": self.status,
            "updated": get_now_local().isoformat(),
            "current": self.timeseries.data[-1],
            "history": self.timeseries.data,
        }
        self.json = dumps(self.stats)

        elapsed_time = time() - start_time

        LOG.debug(f"Statistics updated in {elapsed_time:.3f}s")

    def _set_error(self):
        self.stats["status"] = "error"
        self.json = dumps(self.stats)
