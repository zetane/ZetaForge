import { useEffect, useRef } from "react";
import { Code, View } from "@carbon/icons-react"
import { FileBlock } from "./FileBlock";

const isTypeDisabled = (action) => {
  if (!action.parameters) {
    return false
  }
  return true
}

const BlockGenerator = ({ block, openView, id, historySink, setPipeline }) => {
  const styles = {
    top: `${block.views.node.pos_y}px`, 
    left: `${block.views.node.pos_x}px`
  }
  const disabled = isTypeDisabled(block.action)
  const preview = (block.views.node.preview?.active == "true")

  const handleInputChange = (name, value, parameterName) => {
    const updatedBlock = {
      ...block,
      action: {
        ...block.action,
        parameters: {
          ...block.action.parameters,
          [parameterName]: {
            ...block.action.parameters[parameterName],
            value: value,
          },
        },
      },
    };

    setPipeline((prevPipeline) => {
      prevPipeline.data = ({
          ...prevPipeline.data,
          [id]: updatedBlock,
      })
    });
  };

  let content = (<BlockContent html={block.views.node.html} block={block} onInputChange={handleInputChange} />)
  if (block.action.parameters?.path?.type == "file") {
    content = (<FileBlock blockId={id} block={block} setPipeline={setPipeline}  />)
  }


  return (
    <div className="parent-node">
      <div className="drawflow-node" id={`node-${id}`} style={styles}>
        <div className="drawflow_content_node">
          {preview && <BlockPreview id={id} block={block} historySink={historySink} />}

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

const BlockPreview = ({id, block, historySink}) => {
  const iframeRef = useRef(null)
  if (block.events.outputs?.html) {
    if (iframeRef.current) {
      const fileUrl = `file://${historySink}/files/${block.events.outputs.html}`  
      iframeRef.current.srcDoc = block.events.outputs.html 
    }
  }

  return (
    <div className="block-preview">
      <div>
        <iframe className="iframe-preview" id={id} srcDoc="" ref={iframeRef}>
        </iframe>
      </div>
    </div>
  )
}

const BlockTitle = ({ name, id, openView, actions}) => {
  let actionContainer = (
    <div className="action-container">
      <button id="btn_open_code" className="view-btn" onClick={() => openView(id)}><Code size={20}/></button>
      <button id="btn_show_view" className="view-btn" onClick={() => openView(id)}><View size={20}/></button>
    </div>
  )

  return (
    <div className="title-box">
      <span>{name}</span>
      { actions && actionContainer }
    </div>
  )
};

const parseHtmlToInputs = (html) => {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const inputElements = doc.querySelectorAll('input');

  const inputs = Array.from(inputElements).map((input) => {
    const parameterAttr = Array.from(input.attributes).find((attr) =>
      attr.name.startsWith('parameters-')
    );
    const parameterName = parameterAttr ? parameterAttr.name.split('-')[1] : '';

    return {
      type: input.type,
      value: input.value,
      name: input.name,
      step: input.step,
      parameterName: parameterName,
    };
  });

  return inputs;
};

const InputField = ({ type, value, name, step, parameterName, onChange }) => {
  const handleChange = (event) => {
    onChange(name, event.target.value, parameterName);
  };

  return (
    <input
      type={type}
      value={value}
      name={name}
      step={step}
      onChange={handleChange}
      {...(parameterName && { [`parameters-${parameterName}`]: '' })}
    />
  );
};

const BlockContent = ({ html, block, onInputChange }) => {
  const parsedInputs = parseHtmlToInputs(html);

  return (
    <div className="block-content">
      {parsedInputs.map((input, index) => {
        const parameterName = input.parameterName;
        const value = block.action?.parameters[parameterName]?.value || '';
        return (
          <InputField
            key={index}
            type={input.type}
            value={value}
            name={input.name}
            step={input.step}
            parameterName={input.parameterName}
            onChange={(name, value, parameterName) =>
              onInputChange(name, value, parameterName)
            }
          />
        )
      })}
    </div>
  );
};

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