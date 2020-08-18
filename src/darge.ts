import * as dagre from 'dagre';
import { Model } from './model';
import { Connection } from './connection';
import { Vec } from './vector';


const type = ["LR", "RL", "TB", "BT"]
let selection = 0
export function autolayout(models: Model[], connections: Connection[], toggle = false){
  const g = new dagre.graphlib.Graph();
  
  // Set an object for the graph label
  g.setGraph({
    rankdir: type[selection],
    // ranker: 'longest-path'
  });
  
  // Default to assigning a new object as a label for each new edge.
  g.setDefaultEdgeLabel(function() { return {}; });
  

  models.forEach((model, i) => {
    g.setNode(i.toString(), { label: model.model.name,  width: model.width, height: model.height });
  })
  connections.forEach((conn, i) => {
    g.setEdge(conn.from_model_idx.toString(), conn.to_model_idx.toString());

  })
  dagre.layout(g)
  g.nodes().forEach(v =>  {
    const node = g.node(v)
    const pos = new Vec(node.x, node.y)
    models[parseInt(v)].pos = pos
  });
  const graph = g.graph()
  if(toggle){
    if(selection === 4){
      selection = 0
    } else {
      selection +=1
    }
  }
  return {width: graph.width, height: graph.height}

}