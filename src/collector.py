from asyncio import create_task, sleep
from datetime import datetime
from logging import getLogger

from aiohttp import ClientSession


LOG = getLogger(__name__)

COLLECT_INTERVAL = 60  # Every minute

# Data sources
VG_OVERVIEW = 'https://redutv-api.vg.no/corona/v1/sheets/norway-table-overview'
VG_CASES_TS = 'https://redutv-api.vg.no/corona/v1/sheets/norway-region-data?exclude=cases'
VG_HOSPITALS_TS = 'https://redutv-api.vg.no/corona/v1/areas/country/reports'
VG_TESTED_TS = 'https://redutv-api.vg.no/corona/v1/sheets/fhi/tested'


TMPL = {
    'confirmed': 0,
    'new_confirmed': 0,
    'dead': 0,
    'new_dead': 0,
    'tested': 0,
    'hospitalized': 0,
    'hospitalized_critical': 0,
    'hospital_staff_infected': 0,
    'hospital_staff_quarantined': 0,
    'population': 5314336
}


class Collector:
    def __init__(self):
        self.session = None
        self.task = None
        self.running = False
        self.stats = {
            'current': { **TMPL },
            'history': []
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

    async def collect(self):
        while self.running:
            LOG.info('Collecting current stats from vg.no')

            current = await self._collect_current_vg()
            case_history = await self._collect_case_history_vg()
            hospital_history = await self._collect_hospital_history_vg()
            test_history = await self._collect_testing_history_vg()

            LOG.info('Collection of current stats from vg.no complete')

            self._populate_timeseries(current, case_history, hospital_history, test_history)

            await sleep(COLLECT_INTERVAL)

    async def _collect_current_vg(self):
        async with self.session.get(VG_OVERVIEW) as response:
            if response.status == 200:
                data = await response.json()

                current = {
                    'confirmed': data['totals']['confirmed'],
                    'new_confirmed': data['totals']['changes']['newToday'],
                    'dead': data['totals']['dead'],
                    'new_dead': data['totals']['changes']['deathsToday'],
                }

                return current
            else:
                return {}


    async def _collect_case_history_vg(self):
        async with self.session.get(VG_CASES_TS) as response:
            if response.status == 200:
                data = await response.json()

                cases = {}

                confirmed = data['timeseries']['total']['confirmed']
                new_confirmed = data['timeseries']['new']['confirmed']
                dead = data['timeseries']['total']['dead']
                new_dead = data['timeseries']['new']['dead']

                for k, v in confirmed.items():
                    cases[k] = { 'confirmed': v }

                for k, v in new_confirmed.items():
                    cases[k]['new_confirmed'] = v

                for k, v in dead.items():
                    cases[k]['dead'] = v

                for k, v in new_dead.items():
                    cases[k]['new_dead'] = v

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

                for i, tsd in enumerate(data['timeseries']):
                    tested[tsd['date']] = { 'tested': tsd['count'] if tsd['count'] else data['timeseries'][i - 1]['count'] }

                return tested
            else:
                return {}

    def _populate_timeseries(self, current, case_history, hospital_history, test_history):
        LOG.debug('Updating statistics')

        history = []
        combined = {}

        dates = list(case_history) + list(hospital_history) + list(test_history)

        for d in dates:
            combined[d] = {
                'confirmed': 0,
                'new_confirmed': 0,
                'confirmed_growth_factor': 0.0,
                'new_confirmed_growth_factor': 0.0,
                'dead': 0,
                'new_dead': 0,
                'dead_growth_factor': 0.0,
                'tested': 0,
                'tested_growth_factor': 0.0,
                'hospitalized': 0,
                'hospitalized_growth_factor': 0.0,
                'hospitalized_critical': 0,
                'hospitalized_critical_growth_factor': 0.0,
                'hospital_staff_infected': 0,
                'hospital_staff_infected_growth_factor': 0.0,
                'hospital_staff_quarantined': 0,
                'hospital_staff_quarantined_growth_factor': 0.0,
            }

        for k, v in case_history.items():
            combined[k].update(v)

        for k, v in hospital_history.items():
            combined[k].update(v)

        for k, v in test_history.items():
            combined[k].update(v)

        for day, stats in sorted(combined.items()):
            history.append({ 'date': day, **stats })


        new_current = { **TMPL }
        new_current.update({
            'tested': history[-1]['tested'],
            'hospitalized': history[-1]['hospitalized'],
            'hospitalized_critical': history[-1]['hospitalized_critical'],
            'hospital_staff_infected': history[-1]['hospital_staff_infected'],
            'hospital_staff_quarantined': history[-1]['hospital_staff_quarantined'],
        })
        new_current.update(current)

        self._add_diff_metrics(history, new_current)

        new_stats = {
            'current': new_current,
            'history': history,
            'updated': datetime.now().isoformat()
        }

        self.stats = new_stats

        LOG.debug('Statistics updated')

    def _add_diff_metrics(self, history, current):
        LOG.debug('Adding growth factors')

        history[-1]['confirmed'] = current['confirmed']
        history[-1]['dead'] = current['dead']

        for i in range(1, len(history)):
            gf = {
                'confirmed_growth_factor': round(history[i]['confirmed'] / max(1, history[i-1]['confirmed']), 3),
                'new_confirmed_growth_factor': round(history[i]['new_confirmed'] / max(1, history[i-1]['new_confirmed']), 3),
                'dead_growth_factor': round(history[i]['dead'] / max(1, history[i-1]['dead']), 3),
                'tested_growth_factor': round(history[i]['tested'] / max(1, history[i-1]['tested']), 3),
                'hospitalized_growth_factor': round(history[i]['hospitalized'] / max(1, history[i-1]['hospitalized']), 3),
                'hospitalized_critical_growth_factor': round(history[i]['hospitalized_critical'] / max(1, history[i-1]['hospitalized_critical']), 3),
                'hospital_staff_infected_growth_factor': round(history[i]['hospital_staff_infected'] / max(1, history[i-1]['hospital_staff_infected']), 3),
                'hospital_staff_quarantined_growth_factor': round(history[i]['hospital_staff_quarantined'] / max(1, history[i-1]['hospital_staff_quarantined']), 3),
            }

            history[i].update(gf)

        current.update({
            'confirmed_growth_factor': 1.0 + round(current['new_confirmed'] / current['confirmed'], 3),
            'new_confirmed_growth_factor': history[-1]['new_confirmed_growth_factor'],
            'dead_growth_factor': 1.0 + round(current['new_dead'] / current['dead'], 3),
            'tested_growth_factor': history[-1]['tested_growth_factor'],
            'hospitalized_growth_factor': history[-1]['hospitalized_growth_factor'],
            'hospitalized_critical_growth_factor': history[-1]['hospitalized_critical_growth_factor'],
            'hospital_staff_infected_growth_factor': history[-1]['hospital_staff_infected_growth_factor'],
            'hospital_staff_quarantined_growth_factor': history[-1]['hospital_staff_quarantined_growth_factor'],
        })
