const processConnections = (connections) => {
  const jsonConns = {}
  for (const key in connections) {
    jsonConns[key] = { "connections": []};
  }
  return jsonConns;
}

export const genJSON = (block, id) => {
  return {
    id: id,
    name: block.information.name,
    block: {...block},
    data: {}, 
    class: block.information.id.substring(0, block.information.id.lastIndexOf("-")),
    html: block.views.node.html,
    typenode: false,
    inputs: processConnections(block.inputs),
    outputs: processConnections(block.outputs),
    pos_x: block.views.node.pos_x,
    pos_y: block.views.node.pos_y,
  };

}
