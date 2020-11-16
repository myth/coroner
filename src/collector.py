from asyncio import create_task, sleep
from datetime import datetime
from json import dumps
from logging import getLogger
from os.path import abspath, dirname, join
from random import randint
from sys import stdout
from traceback import print_exc
from typing import List, Union

from aiohttp import ClientSession

from models import Stats
from utils import get_now_local, get_today_local

LOG = getLogger(__name__)

BACKUP_INTERVAL = 7200  # Every 2 hours
COLLECT_INTERVAL = 3600  # Every hour

# Data sources
VG_MAIN_STATS = "https://redutv-api.vg.no/corona/v1/areas/country/key"


class Collector:
    def __init__(self):
        self.session = None
        self.task = None
        self.backup_task = None
        self.running = False
        self.status = "ok"
        self.stats = {}
        self.stats_objects = []

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
                case_history = await self._collect_case_history_vg()

                self._populate_timeseries(case_history)

                self.stats["status"] = "ok"

                LOG.info("Collection of current stats from vg.no complete")
            except Exception as e:
                LOG.error(e)
                print_exc(file=stdout)
                self.stats["status"] = "error"

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
                self.stats["status"] = "error"

                LOG.error(f"Failed to update backup file {filename}: {e}")

    def timeseries(self, field):
        return [getattr(o, field) for o in self.stats_objects]

    async def _collect_case_history_vg(self):
        async with self.session.get(f"{VG_MAIN_STATS}") as response:
            if response.status == 200:
                data = await response.json()

                (
                    deaths,
                    cases,
                    tested,
                    _,
                    _,
                    hospitalized,
                    intensive_care,
                    ventilator
                ) = data["items"]

                stats = {}

                total = 0
                for row in cases["data"]:
                    d = row["date"]

                    if d not in stats:
                        stats[d] = {}

                    total += row["value"]

                    stats[d]["infected"] = total
                    stats[d]["infected_new"] = row["value"]

                total = 0
                for row in deaths["data"]:
                    d = row["date"]

                    if d not in stats:
                        stats[d] = {}

                    total += row["value"]

                    stats[d]["dead"] = total
                    stats[d]["dead_new"] = row["value"]

                for row in tested["data"]:
                    d = row["date"]

                    if d not in stats:
                        stats[d] = {}

                    stats[d]["tested"] = row["cumulativeValue"]
                    stats[d]["tested_new"] = row["value"]

                for row in hospitalized["data"]:
                    d = row["date"]

                    if d not in stats:
                        stats[d] = {}

                    stats[d]["hospitalized"] = row["value"]

                for row in intensive_care["data"]:
                    d = row["date"]

                    if d not in stats:
                        stats[d] = {}

                    stats[d]["hospitalized_intensive_care"] = row["value"]

                for row in ventilator["data"]:
                    d = row["date"]

                    if d not in stats:
                        stats[d] = {}

                    stats[d]["hospitalized_ventilator"] = row["value"]

                return stats
            else:
                LOG.error(response.text)
                return {}

    def _populate_timeseries(self, case_history):
        LOG.debug("Updating statistics")

        combined = {}

        dates = sorted(list(case_history))

        for d in dates:
            combined[d] = {
                "infected": 0,
                "infected_new": 0,
                "dead": 0,
                "dead_new": 0,
                "tested": 0,
                "tested_new": 0,
                "hospitalized": 0,
                "hospitalized_intensive_care": 0,
                "hospitalized_ventilator": 0,
            }

        for k, v in case_history.items():
            combined[k].update(v)

        self.stats_objects = Stats.assemble(combined)
        self.stats = {
            "status": self.status,
            "updated": get_now_local().isoformat(),
            "current": self.stats_objects[-1].json(),
            "history": [s.json() for s in self.stats_objects],
        }

        LOG.debug("Statistics updated")
