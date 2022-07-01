from injector import get_tab
from logging import getLogger
from os import path, rename
from shutil import rmtree
from aiohttp import ClientSession, web
from io import BytesIO
from zipfile import ZipFile
from concurrent.futures import ProcessPoolExecutor
from asyncio import get_event_loop
from time import time
from hashlib import sha256
from subprocess import Popen

class PluginInstallContext:
    def __init__(self, artifact, name, version, hash) -> None:
        self.artifact = artifact
        self.name = name
        self.version = version
        self.hash = hash

class PluginBrowser:
    def __init__(self, plugin_path, server_instance) -> None:
        self.log = getLogger("browser")
        self.plugin_path = plugin_path
        self.install_requests = {}

        server_instance.add_routes([
            web.post("/browser/install_plugin", self.install_plugin),
            web.post("/browser/uninstall_plugin", self.uninstall_plugin)
        ])

    def _unzip_to_plugin_dir(self, zip, name, hash):
        zip_hash = sha256(zip.getbuffer()).hexdigest()
        if hash and (zip_hash != hash):
            return False
        zip_file = ZipFile(zip)
        zip_file.extractall(self.plugin_path)
        rename(path.join(self.plugin_path, zip_file.namelist()[0]), path.join(self.plugin_path, name))
        Popen(["chown", "-R", "deck:deck", self.plugin_path])
        Popen(["chmod", "-R", "555", self.plugin_path])
        return True

    async def _uninstall(self, name):
        tab = await get_tab("SP")
        await tab.open_websocket()

        try:
            await tab.evaluate_js(f"DeckyPluginLoader.plugins['{name}'].onDismount?.()")
            rmtree(path.join(self.plugin_path, name))
        except FileNotFoundError:
            self.log.warning(f"Plugin {name} not installed, skipping uninstallation")

    async def _install(self, artifact, name, version, hash):
        self._uninstall(name)
        self.log.info(f"Installing {name} (Version: {version})")
        async with ClientSession() as client:
            self.log.debug(f"Fetching {artifact}")
            res = await client.get(artifact)
            if res.status == 200:
                self.log.debug("Got 200. Reading...")
                data = await res.read()
                self.log.debug(f"Read {len(data)} bytes")
                res_zip = BytesIO(data)
                with ProcessPoolExecutor() as executor:
                    self.log.debug("Unzipping...")
                    ret = await get_event_loop().run_in_executor(
                        executor,
                        self._unzip_to_plugin_dir,
                        res_zip,
                        name,
                        hash
                    )
                    if ret:
                        self.log.info(f"Installed {name} (Version: {version})")
                    else:
                        self.log.fatal(f"SHA-256 Mismatch!!!! {name} (Version: {version})")
            else:
                self.log.fatal(f"Could not fetch from URL. {await res.text()}")

    async def install_plugin(self, request):
        data = await request.post()
        get_event_loop().create_task(self.request_plugin_install(data.get("artifact", ""), data.get("name", "No name"), data.get("version", "dev"), data.get("hash", False)))
        return web.Response(text="Requested plugin install")

    async def uninstall_plugin(self, request):
        data = await request.post()
        get_event_loop().create_task(self.request_plugin_uninstall(data.get("name", "")))
        return web.Response(text="Requested plugin uninstall")

    async def request_plugin_install(self, artifact, name, version, hash):
        request_id = str(time())
        self.install_requests[request_id] = PluginInstallContext(artifact, name, version, hash)
        tab = await get_tab("SP")
        await tab.open_websocket()
        await tab.evaluate_js(f"DeckyPluginLoader.addPluginInstallPrompt('{name}', '{version}', '{request_id}', '{hash}')")
    
    async def confirm_plugin_install(self, request_id):
        request = self.install_requests.pop(request_id)
        await self._install(request.artifact, request.name, request.version, request.hash)

    def cancel_plugin_install(self, request_id):
        self.install_requests.pop(request_id)

    async def request_plugin_uninstall(self, artifact):
        tab = await get_tab("SP")
        await tab.open_websocket()
        await tab.evaluate_js(f"DeckyPluginLoader.addPluginUninstallPrompt('{artifact}')")

    async def confirm_plugin_uninstall(self, artifact):
        await self._uninstall(artifact)
