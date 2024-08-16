import { customAlphabet } from "nanoid";

const processConnections = (connections) => {
  const jsonConns = {};
  for (const key in connections) {
    jsonConns[key] = { connections: [] };
  }
  return jsonConns;
};

export const genJSON = (block, id) => {
  return {
    id: id,
    name: block.information.name,
    block: { ...block },
    class: block.information.id.substring(
      0,
      block.information.id.lastIndexOf("-"),
    ),
    html: block.views.node.html,
    typenode: false,
    inputs: processConnections(block.inputs),
    outputs: processConnections(block.outputs),
    pos_x: block.views.node.pos_x,
    pos_y: block.views.node.pos_y,
  };
};

export function generateId(prefix) {
  const nanoid = customAlphabet("abcdefghijklmnopqrstuvwxyz0123456789", 12);

  const newNanoid = nanoid();
  const basePrefix = prefix ? prefix.split("-")[0] : "pipeline";
  const newId = `${basePrefix}-${newNanoid}`;
  return newId;
}

export function replaceIds(block, id) {
  if (block.action?.container) {
    block.action.container.version = id;
  }
  return block;
}

export function trimQuotes(str) {
  if (typeof str !== "string") {
    return str;
  }

  if (
    str.length >= 2 &&
    (str[0] === '"' || str[0] === "'") &&
    str[0] === str[str.length - 1]
  ) {
    return str.slice(1, -1);
  }

  return str;
}
