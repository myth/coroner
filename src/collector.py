from asyncio import create_task, sleep
from datetime import datetime
from logging import getLogger
from sys import stdout
from traceback import print_exc

from aiohttp import ClientSession

from models import Stats
from utils import get_now_local


LOG = getLogger(__name__)

COLLECT_INTERVAL = 60  # Every minute

# Data sources
VG_CASES_TS = 'https://redutv-api.vg.no/corona/v1/sheets/norway-region-data?exclude=cases'
VG_HOSPITALS_TS = 'https://redutv-api.vg.no/corona/v1/areas/country/reports'
VG_TESTED_TS = 'https://redutv-api.vg.no/corona/v1/sheets/fhi/tested'


class Collector:
    def __init__(self):
        self.session = None
        self.task = None
        self.running = False
        self.status = 'ok'
        self.stats = {}

        LOG.debug('Collector initialized')

    def start(self):
        if not self.running and not self.task:
            LOG.info('Starting statistics collector')

            self.running = True
            self.task = create_task(self.collect())

    async def stop(self):
        if not self.running and self.task:
            LOG.info('Stopping statistics collector')

            await self.task.cancel()
            LOG.debug('Cancelled collector task')

            self.running = False

            LOG.info('Statistics collector stopped')

    async def persistent_session(self, app):
        self.session = ClientSession()
        yield
        await self.session.close()
        LOG.debug('Closed client session')

    async def collect(self):
        while self.running:
            LOG.info('Collecting current stats from vg.no')

            self.status = 'ok'

            try:
                case_history = await self._collect_case_history_vg()
                hospital_history = await self._collect_hospital_history_vg()
                test_history = await self._collect_testing_history_vg()

                self._populate_timeseries(case_history, hospital_history, test_history)

                LOG.info('Collection of current stats from vg.no complete')
            except Exception as e:
                LOG.error(e)
                print_exc(file=stdout)
                self.status = 'error'

            await sleep(COLLECT_INTERVAL)


    async def _collect_case_history_vg(self):
        async with self.session.get(VG_CASES_TS) as response:
            if response.status == 200:
                data = await response.json()

                cases = {}

                infected = data['timeseries']['total']['confirmed']
                infected_new = data['timeseries']['new']['confirmed']
                dead = data['timeseries']['total']['dead']
                dead_new = data['timeseries']['new']['dead']

                for k, v in infected.items():
                    cases[k] = { 'infected': v }

                for k, v in infected_new.items():
                    cases[k]['infected_new'] = v

                for k, v in dead.items():
                    cases[k]['dead'] = v

                for k, v in dead_new.items():
                    cases[k]['dead_new'] = v

                return cases
            else:
                return {}

    async def _collect_hospital_history_vg(self):
        async with self.session.get(VG_HOSPITALS_TS) as response:
            if response.status == 200:
                data = await response.json()

                hospital = {}

                for h in data['hospitals']['timeseries']['total']:
                    d = h['date']

                    hospital[d] = {
                        'hospitalized': 0,
                        'hospitalized_critical': 0,
                        'hospital_staff_infected': 0,
                        'hospital_staff_quarantined': 0
                    }

                    if h['hospitalized']:
                        hospital[d]['hospitalized'] = h['hospitalized']
                    if h['respiratory']:
                        hospital[d]['hospitalized_critical'] = h['respiratory']
                    if h['infectedEmployees']:
                        hospital[d]['hospital_staff_infected'] = h['infectedEmployees']
                    if h['quarantineEmployees']:
                        hospital[d]['hospital_staff_quarantined'] = h['quarantineEmployees']

                return hospital
            else:
                return {}

    async def _collect_testing_history_vg(self):
        async with self.session.get(VG_TESTED_TS) as response:
            if response.status == 200:
                data = await response.json()

                tested = {}

                for ts in data['timeseries']:
                    tested[ts['date']] = { 'tested': ts['count'] }

                return tested
            else:
                return {}

    def _populate_timeseries(self, case_history, hospital_history, test_history):
        LOG.debug('Updating statistics')

        combined = {}

        dates = sorted(list(case_history) + list(hospital_history) + list(test_history))

        for d in dates:
            combined[d] = {
                'infected': 0,
                'infected_new': 0,
                'dead': 0,
                'dead_new': 0,
                'tested': 0,
                'hospitalized': 0,
                'hospitalized_critical': 0,
                'hospital_staff_infected': 0,
                'hospital_staff_quarantined': 0,
            }

        for k, v in case_history.items():
            combined[k].update(v)

        for k, v in hospital_history.items():
            combined[k].update(v)

        for k, v in test_history.items():
            combined[k].update(v)


        stats = Stats.assemble(combined)

        self.stats = {
            'status': self.status,
            'updated': get_now_local().isoformat(),
            'current': stats[-1].json(),
            'history': [s.json() for s in stats]
        }

        LOG.debug('Statistics updated')
