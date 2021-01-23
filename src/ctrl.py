from logging import getLogger
from os.path import abspath, dirname, join

from aiohttp import web

from collector import Collector

LOG = getLogger(__name__)


class Controller:
    def __init__(self):
        self.collector = Collector()

        LOG.debug("Controller initialized")

    async def index(self, request):
        return web.FileResponse(join(dirname(abspath(__file__)), "public", "index.html"))

    async def api(self, request):
        return web.json_response(text=self.collector.json)

    @property
    def routes(self):
        return [web.get("/", self.index), web.get("/api", self.api)]
