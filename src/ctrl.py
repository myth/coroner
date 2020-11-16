from logging import getLogger
from os.path import abspath, dirname, join

from aiohttp import web

from collector import Collector

LOG = getLogger(__name__)


class Controller:
    def __init__(self):
        with open(join(dirname(abspath(__file__)), "public", "index.html")) as f:
            self.index_page = f.read()

        self.collector = Collector()

        LOG.debug("Controller initialized")

    async def index(self, request):
        return web.Response(text=self.index_page, content_type="text/html")

    async def api(self, request):
        return web.json_response(self.collector.stats)

    async def websocket(self, request):
        ws = web.WebSocketResponse()

        await ws.prepare(request)

        request.app["ws"].add(ws)

        try:
            async for _ in ws:
                pass
        finally:
            request.app["ws"].discard(ws)

        return ws

    @property
    def routes(self):
        return [web.get("/", self.index), web.get("/api", self.api), web.get("/ws", self.websocket)]
