import { useEffect, useState } from "react";
import { Code, View } from "@carbon/icons-react"
import { FileBlock } from "./FileBlock";

const isTypeDisabled = (action) => {
  if (!action.parameters) {
    return false
  }
  return true
}

const BlockGenerator = ({ block, openView, id, editor}) => {
  const styles = {
    top: `${block.views.node.pos_y}px`, 
    left: `${block.views.node.pos_x}px`
  }
  const disabled = isTypeDisabled(block.action)
  const preview = (block.views.node.preview?.active == "true")

  let content = (<BlockContent html={block.views.node.html} />)
  if (block.action.parameters?.path?.type == "file") {
    content = (<FileBlock blockId={id} />)
  }

  useEffect(() => {
    let outputNames = block.outputs
    for (const [outputKey, output] of Object.entries(outputNames)) {
      let inputConnections = output.connections;
      for (const input of inputConnections) {
        editor.addConnection(id, input.block, outputKey, input.variable);
      }
    }
  }, [])

  return (
    <div className="parent-node">
      <div className="drawflow-node" id={`node-${id}`} style={styles}>
        <div className="drawflow_content_node">
          { preview && <BlockPreview id={id} />}

          <BlockTitle
            name={block.information.name}
            id={id}
            openView={openView}
            actions={!disabled} 
          />
          <div className="block-body">
            <div className="block-io">
              <BlockInputs inputs={block.inputs} />
              <BlockOutputs outputs={block.outputs} />
            </div>
            { content }
          </div>
        </div>
      </div>
    </div>
  );
};

const BlockPreview = ({id, override}) => {
  return (
    <div className="block-preview">
      <div>
        <iframe class="iframe-preview" id={id} src=""></iframe>
      </div>
    </div>
  )

}

// BlockTitle component with conditional rendering for buttons
const BlockTitle = ({ name, id, openView, actions}) => {
  let actionContainer = (
    <div className="action-container">
      <button id="btn_open_code" className="view-btn" onClick={() => openView(id)}><Code size={20}/></button>
      <button id="btn_show_view" className="view-btn" onClick={() => openView(id)}><View size={20}/></button>
    </div>
  )

  return (<div className="title-box">
    <span>{name}</span>
    { actions && actionContainer }
  </div>)
};

// BlockContent component for parsing and injecting data
const BlockContent = ({html, override}) => {
  if (override) {
    return ({override})
  } return (
    <div className="block-content" dangerouslySetInnerHTML={{ __html: html }}></div>
  )
};

// BlockInputs component for rendering inputs
const BlockInputs = ({ inputs }) => (
  <div className="inputs">
    {Object.entries(inputs).map(([name, input]) => (
      <div key={name} className="block-input">
        <div className={`input ${name}`}></div>
        <span className="type-icon">
          <i className={getIcon(input.type)}></i>
        </span>
        <span className="input-name">{name}</span>
      </div>
    ))}
  </div>
);

// BlockOutputs component for rendering outputs
const BlockOutputs = ({ outputs }) => (
  <div className="outputs">
    {Object.entries(outputs).map(([name, output]) => (
      <div key={name} className="block-output">
        <span className="output-name">{name}</span>
        <span className="type-icon">
          <i className={getIcon(output.type)}></i>
        </span>
        <div className={`output ${name}`}></div>
      </div>
    ))}
  </div>
);

const getIcon = (type) => {
  if (type == 'filepath') {
    return 'fas fa-regular fa-file'
  }
  else if (type == 'image') {
    return 'fas fa-thin fa-images'
  }
  else if (type == 'text') {
    return 'fa fa-font'
  }
  else if (type == 'str') {
    return 'fa fa-font'
  }
  else if (type == 'int') {
    return 'fa fa-hashtag'
  }
  else if (type == 'float') {
    return 'fa fa-hashtag'
  }
  else if (type == 'List[int]') {
    return 'fa fa-hashtag'
  }
  else if (type == 'view') {
    return 'fa fa-eye'
  }
  else if (type == 'controller') {
    return 'fa fa-gamepad'
  }
  else {
    return 'fa fa-star'
  }
}

export default BlockGenerator;