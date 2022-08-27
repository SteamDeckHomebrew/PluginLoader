# Full imports
import json

# Partial imports
from aiohttp import ClientSession, web
from asyncio import get_event_loop
from concurrent.futures import ProcessPoolExecutor
from hashlib import sha256
from io import BytesIO
from logging import getLogger
from os import path, rename, listdir
from shutil import rmtree
from subprocess import call
from time import time
from zipfile import ZipFile

# Local modules
from helpers import get_ssl_context, get_user, get_user_group
from injector import get_tab, inject_to_tab

logger = getLogger("Browser")

class PluginInstallContext:
    def __init__(self, artifact, name, version, hash) -> None:
        self.artifact = artifact
        self.name = name
        self.version = version
        self.hash = hash

class PluginBrowser:
    def __init__(self, plugin_path, plugins) -> None:
        self.plugin_path = plugin_path
        self.plugins = plugins
        self.install_requests = {}

    def _unzip_to_plugin_dir(self, zip, name, hash):
        zip_hash = sha256(zip.getbuffer()).hexdigest()
        if hash and (zip_hash != hash):
            return False
        zip_file = ZipFile(zip)
        zip_file.extractall(self.plugin_path)
        code_chown = call(["chown", "-R", get_user()+":"+get_user_group(), self.plugin_path])
        code_chmod = call(["chmod", "-R", "555", self.plugin_path])
        if code_chown != 0 or code_chmod != 0:
            logger.error(f"chown/chmod exited with a non-zero exit code (chown: {code_chown}, chmod: {code_chmod})")
            return False
        return True

    def find_plugin_folder(self, name):
        for folder in listdir(self.plugin_path):
            try:
                with open(path.join(self.plugin_path, folder, 'plugin.json'), 'r') as f:
                    plugin = json.load(f)

                if plugin['name'] == name:
                    return path.join(self.plugin_path, folder)
            except:
                logger.debug(f"skipping {folder}")

    async def uninstall_plugin(self, name):
        tab = await get_tab("SP")
        try:
            logger.info("uninstalling " + name)
            logger.info(" at dir " + self.find_plugin_folder(name))
            await tab.evaluate_js(f"DeckyPluginLoader.unloadPlugin('{name}')")
            if self.plugins[name]:
                self.plugins[name].stop()
                self.plugins.remove(name)
            rmtree(self.find_plugin_folder(name))
        except FileNotFoundError:
            logger.warning(f"Plugin {name} not installed, skipping uninstallation")

    async def _install(self, artifact, name, version, hash):
        try:
            await self.uninstall_plugin(name)
        except:
            logger.error(f"Plugin {name} not installed, skipping uninstallation")
        logger.info(f"Installing {name} (Version: {version})")
        async with ClientSession() as client:
            logger.debug(f"Fetching {artifact}")
            res = await client.get(artifact, ssl=get_ssl_context())
            if res.status == 200:
                logger.debug("Got 200. Reading...")
                data = await res.read()
                logger.debug(f"Read {len(data)} bytes")
                res_zip = BytesIO(data)
                logger.debug("Unzipping...")
                ret = self._unzip_to_plugin_dir(res_zip, name, hash)
                if ret:
                    logger.info(f"Installed {name} (Version: {version})")
                    await inject_to_tab("SP", "window.syncDeckyPlugins()")
                else:
                    self.log.fatal(f"SHA-256 Mismatch!!!! {name} (Version: {version})")
            else:
                logger.fatal(f"Could not fetch from URL. {await res.text()}")

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
