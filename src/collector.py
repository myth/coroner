from asyncio import create_task, sleep
from logging import getLogger

from aiohttp import ClientSession


LOG = getLogger(__name__)

COLLECT_INTERVAL = 60  # Every minute

# Data sources
VG_OVERVIEW = 'https://redutv-api.vg.no/corona/v1/sheets/norway-table-overview'
VG_CASES_TS = 'https://redutv-api.vg.no/corona/v1/sheets/world/timeseries?compare=Norway'
VG_TESTED_TS = 'https://redutv-api.vg.no/corona/v1/sheets/fhi/tested'


class Collector:
    def __init__(self):
        self.session = None
        self.task = None
        self.running = False
        self.stats = {
            'current': {
                'confirmed': 0,
                'new_confirmed': 0,
                'dead': 0,
                'new_dead': 0,
                'recovered': 0,
                'new_recovered': 0,
                'tested': 0
            },
            'history': {
                'cases': [],
                'tested': [],
            }
        }

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

    def load_previous_stats(self):
        pass

    async def collect(self):
        while self.running:
            await self._collect_current_vg()
            await self._collect_case_history_vg()
            await self._collect_testing_history_vg()
            await sleep(COLLECT_INTERVAL)

    async def _collect_current_vg(self):
        LOG.info('Collecting current stats from vg.no')

        async with self.session.get(VG_OVERVIEW) as response:
            if response.status == 200:
                data = await response.json()

                self.stats['current']['confirmed'] = data['totals']['confirmed']
                self.stats['current']['dead'] = data['totals']['dead']
                self.stats['current']['recovered'] = data['totals']['recovered']

                LOG.info('Collection of current stats from vg.no complete')

    async def _collect_case_history_vg(self):
        LOG.info('Collecting case history from vg.no')

        async with self.session.get(VG_CASES_TS) as response:
            if response.status == 200:
                data = await response.json()

                confirmed = sorted(data['Norway']['confirmed'].items())
                dead = sorted(data['Norway']['deaths'].items())
                recovered = sorted(data['Norway']['recovered'].items())

                cases = [
                    {
                        'date': date,
                        'confirmed': c,
                        'dead': d,
                        'recovered': r
                    } for (date, c), (_, d), (_, r) in zip(confirmed, dead, recovered)
                ]

                self.stats['history']['cases'] = cases

                self.stats['current']['new_confirmed'] = self.stats['current']['confirmed'] - cases[-1]['confirmed']
                self.stats['current']['new_dead'] = self.stats['current']['dead'] - cases[-1]['dead']
                self.stats['current']['new_recovered'] = self.stats['current']['recovered'] - cases[-1]['recovered']

                LOG.info('Collection of case history from vg.no complete')

    async def _collect_testing_history_vg(self):
        LOG.info('Collecting testing history from vg.no')

        async with self.session.get(VG_TESTED_TS) as response:
            if response.status == 200:
                data = await response.json()

                tested = []

                for i, tsd in enumerate(data['timeseries']):
                    d = {
                        'date': tsd['date'],
                        'count': tsd['count'] if tsd['count'] else data['timeseries'][i - 1]['count']
                    }

                    tested.append(d)

                self.stats['current']['tested'] = data['current']['count']
                self.stats['history']['tested'] = tested

                LOG.info('Collection of testing history from vg.no complete')
