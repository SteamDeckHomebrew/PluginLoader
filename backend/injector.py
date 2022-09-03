#Injector code from https://github.com/SteamDeckHomebrew/steamdeck-ui-inject. More info on how it works there.

from asyncio import sleep
from logging import debug, getLogger
from traceback import format_exc

from aiohttp import ClientSession
from aiohttp.client_exceptions import ClientConnectorError

BASE_ADDRESS = "http://localhost:8080"

logger = getLogger("Injector")

class Tab:
    def __init__(self, res) -> None:
        self.title = res["title"]
        self.id = res["id"]
        self.ws_url = res["webSocketDebuggerUrl"]

        self.websocket = None
        self.client = None

    async def open_websocket(self):
        self.client = ClientSession()
        self.websocket = await self.client.ws_connect(self.ws_url)

    async def listen_for_message(self):
        async for message in self.websocket:
            yield message

    async def _send_devtools_cmd(self, dc, receive=True):
        if self.websocket:
            await self.websocket.send_json(dc)
            return (await self.websocket.receive_json()) if receive else None
        raise RuntimeError("Websocket not opened")

    async def evaluate_js(self, js, run_async=False, manage_socket=True, get_result=True):
        if manage_socket:
            await self.open_websocket()

        res = await self._send_devtools_cmd({
            "id": 1,
            "method": "Runtime.evaluate",
            "params": {
                "expression": js,
                "userGesture": True,
                "awaitPromise": run_async
            }
        }, get_result)

        if manage_socket:
            await self.client.close()
        return res

    async def get_steam_resource(self, url):
        res = await self.evaluate_js(f'(async function test() {{ return await (await fetch("{url}")).text() }})()', True)
        return res["result"]["result"]["value"]

    def __repr__(self):
        return self.title

async def get_tabs():
    async with ClientSession() as web:
        res = {}

        while True:
            try:
                res = await web.get(f"{BASE_ADDRESS}/json")
            except ClientConnectorError:
                logger.debug("ClientConnectorError excepted.")
                logger.debug("Steam isn't available yet. Wait for a moment...")
                logger.error(format_exc())
                await sleep(5)
            else:
                break

        if res.status == 200:
            r = await res.json()
            return [Tab(i) for i in r]
        else:
            raise Exception(f"/json did not return 200. {await res.text()}")

async def get_tab(tab_name):
    tabs = await get_tabs()
    tab = next((i for i in tabs if i.title == tab_name), None)
    if not tab:
        raise ValueError(f"Tab {tab_name} not found")
    return tab

async def inject_to_tab(tab_name, js, run_async=False):
    tab = await get_tab(tab_name)

    return await tab.evaluate_js(js, run_async)

async def tab_has_global_var(tab_name, var_name):
    try:
        tab = await get_tab(tab_name)
    except ValueError:
        return False
    res = await tab.evaluate_js(f"window['{var_name}'] !== null && window['{var_name}'] !== undefined", False)

    if not "result" in res or not "result" in res["result"] or not "value" in res["result"]["result"]:
        return False

    return res["result"]["result"]["value"]

async def tab_has_element(tab_name, element_name):
    try:
        tab = await get_tab(tab_name)
    except ValueError:
        return False
    res = await tab.evaluate_js(f"document.getElementById('{element_name}') != null", False)
    
    if not "result" in res or not "result" in res["result"] or not "value" in res["result"]["result"]:
        return False

    return res["result"]["result"]["value"]