from logging import getLogger

from aiohttp import web

from collector import Collector


LOG = getLogger(__name__)


class Controller:
    def __init__(self):
        self.collector = Collector()

        print(self.collector)

        LOG.debug('Controller initialized')

    async def api(self, request):
        return web.json_response(self.collector.stats)

    async def websocket(self, request):
        ws = web.WebSocketResponse()

        await ws.prepare(request)

        request.app['ws'].add(ws)

        try:
            async for _ in ws:
                pass
        finally:
            request.app['ws'].discard(ws)

        return ws

    @property
    def routes(self):
        return [
            web.get('/api', self.api),
            web.get('/ws', self.websocket)
        ]
