import json
import os


def find_block(nested_dict, target_key, target_value):
    def search(nested_dict, key_path=None):
        if key_path is None:
            key_path = []

        for key, value in nested_dict.items():
            if isinstance(value, dict):
                if len(key_path) >= 1 and target_key in value and value[target_key] == target_value:
                    return key_path[-1]
                result = search(value, key_path + [key])
                if result:
                    return result

    return search(nested_dict)


def frontend_block_to_taskgraph(block_from_frontend, run_id, run_path):
    initial_port = 5001
    graph = {}
    blockst = []

    block_keys = list(block_from_frontend.keys())
    block_uuids = []
    for k in block_keys:
        id = block_from_frontend[k]["information"]["id"]
        block_uuids.append(id)

    # get the previous outputs from the inputs or get the parameter if no input
    for index, p in enumerate(block_uuids):
        args = [p]
        args.append(initial_port + index)
        args.append(run_id)
        args.append(run_path)
        inputs = []
        block_key = find_block(block_from_frontend, "id", p)
        block = block_from_frontend[block_key]

        for key, value in block["inputs"].items():
            inputs.append((key, value))

        outputs = []
        for key, value in block["outputs"].items():
            outputs.append((key, value))

        parameters = []
        for key, value in block["parameters"].items():
            parameters.append((key, value))

        if len(inputs) == 0:
            args.append("data")
        else:
            for var in inputs:
                node_id = var[1]["connections"][0]["node"]
                connection_block_id = block_from_frontend[node_id]["information"]["id"]
                args.append('task_' + connection_block_id)

        task = {'task_' + p: {"function": "block_handler", "args": args}}
        graph.update(task)

    return graph


def block_to_dask(graph_to_convert, run_id, run_path):
    graph = frontend_block_to_taskgraph(graph_to_convert, run_id, run_path)
    print('Converted pipeline to dask graph\n')

    with open(os.path.join(run_path, "active_dask_pipeline.json"), "w") as outfile:
        json.dump(graph, outfile)
    return graph
