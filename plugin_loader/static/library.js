class PluginEventTarget extends EventTarget { }
method_call_ev_target = new PluginEventTarget();

window.addEventListener("message", function(evt) {
    console.log(evt);
    let ev = new Event(evt.data.call_id);
    ev.data = evt.data.result;
    method_call_ev_target.dispatchEvent(ev);
}, false);

async function call_server_method(method_name, arg_object={}) {
    let id = `${new Date().getTime()}`;
    console.debug(JSON.stringify({
        "id": id,
        "method": method_name,
        "args": arg_object
    }));
    return new Promise((resolve, reject) => {
        method_call_ev_target.addEventListener(`${id}`, function (event) {
            if (event.data.success) resolve(event.data.result);
            else reject(event.data.result);
        });
    });
}

async function fetch_nocors(url, request={}) {
    let args = { method: "POST", headers: {}, body: "" };
    request = {...args, ...request};
    request.url = url;
    return await call_server_method("http_request", request);
}

async function call_plugin_method(method_name, arg_object={}) {
    if (plugin_name == undefined) 
        throw new Error("Plugin methods can only be called from inside plugins (duh)");
    return await call_server_method("plugin_method", {
        'plugin_name': plugin_name,
        'method_name': method_name,
        'args': arg_object
    });
}