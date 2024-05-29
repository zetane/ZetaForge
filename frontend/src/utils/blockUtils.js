import { customAlphabet } from "nanoid";

const processConnections = (connections) => {
  const jsonConns = {}
  for (const key in connections) {
    jsonConns[key] = { "connections": []};
    // jsonConns[key] = { "connections": [{"node": id, [type]: key}]};
  }
  return jsonConns;
}

export const genJSON = (block, id) => {
  return {
    id: id,
    name: block.information.name,
    block: {...block},
    class: block.information.id.substring(0, block.information.id.lastIndexOf("-")),
    html: block.views.node.html,
    typenode: false,
    inputs: (block.inputs),
    outputs: (block.outputs),
    // inputs: processConnections(block.inputs, id, "input"),
    // outputs: processConnections(block.outputs, id, "output"),
    // inputs: processConnections(block.inputs),
    // outputs: processConnections(block.outputs),
    pos_x: block.views.node.pos_x,
    pos_y: block.views.node.pos_y,
  };

}

export function generateId(block) {
  const nanoid = customAlphabet('1234567890abcedfghijklmnopqrstuvwxyz', 12);
  const newNanoid = nanoid();
  const id = `${block.information.id}-${newNanoid}`;
  return id;
}

export function replaceIds(block, id){
  if (block.action?.container) {
    block.action.container.version = id;
  }
  return block;
}
