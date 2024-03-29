from logging import basicConfig, getLogger, DEBUG
from os.path import abspath, dirname, join

from aiohttp.web import run_app, Application

from ctrl import Controller


LOG = getLogger(__name__)

basicConfig(level=DEBUG, format="%(asctime)s.%(msecs)03d %(levelname)s %(message)s", datefmt="%Y-%m-%d %H:%M:%S")


class Coroner:
    def __init__(self):
        self.app = Application()
        self.ctrl = Controller()

        LOG.debug("Setting up routes")

        self.app.add_routes(self.ctrl.routes)
        self.app.router.add_static("/static/", path=join(dirname(abspath(__file__)), "public/static/"), name="static")
        self.app.on_startup.append(self.on_startup)
        self.app.cleanup_ctx.append(self.ctrl.collector.persistent_session)
        self.app.on_shutdown.append(self.on_shutdown)

        LOG.debug("Coroner initialized")

    def run(self):
        LOG.info("Starting Coroner")

        run_app(self.app, host="0.0.0.0")

    async def on_startup(self, app):
        LOG.info("Starting periodic tasks")

        self.ctrl.collector.start()

    async def on_shutdown(self, app):
        LOG.info("Coroner shutting down")

        LOG.debug("Shutting down Collector")
        await self.ctrl.collector.stop()
        LOG.debug("Collector session stopped")

        LOG.info("Coroner stopped")


if __name__ == "__main__":
    coroner = Coroner()
    coroner.run()
