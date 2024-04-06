import { useCallback, useRef, useState, useEffect } from "react";
import { Code, View } from "@carbon/icons-react"
import { FileBlock } from "./FileBlock";
import { useImmerAtom } from "jotai-immer";

const isTypeDisabled = (action) => {
  if (!action.parameters) {
    return false
  }
  return true
}

const BlockGenerator = ({ block, openView, id, historySink, pipelineAtom}) => {
  const [_, setFocusAction] = useImmerAtom(pipelineAtom)

  const styles = {
    top: `${block.views.node.pos_y}px`, 
    left: `${block.views.node.pos_x}px`
  }

  const [iframeSrc, setIframeSrc] = useState("")
  useEffect(() => {
    if (block.events.outputs?.html) {
      const fileUrl = `${import.meta.env.VITE_S3_ENDPOINT}/zetaforge/${historySink}/${block.events.outputs.html}`
      // there are so many reasons why this sucks
      // TODO: make it suck less, if it's possible
      // CORS makes this very difficult to use iFrames
      setTimeout(() => setIframeSrc(fileUrl), 1500)
    }
  }, [block.events.outputs?.html])

  console.log("src: ", iframeSrc)

  const disabled = isTypeDisabled(block.action)
  const preview = (block.views.node.preview?.active == "true")

  const handleInputChange = useCallback((name, value, parameterName) => {
    setFocusAction((draft) => { draft.data[id].action.parameters[parameterName].value = value })
  }, [focus]);

  let content = (<BlockContent html={block.views.node.html} block={block} onInputChange={handleInputChange} />)
  if (block.action.parameters?.path?.type == "file") {
    content = (<FileBlock blockId={id} block={block} setFocusAction={setFocusAction} />)
  }

  const backgroundColor = block.views?.node?.title_bar?.background_color || 'var(--title-background-color)';

  return (
    <div className="parent-node">
      <div className="drawflow-node" id={`node-${id}`} style={styles}>
        <div className="drawflow_content_node">
          {preview && <BlockPreview id={id} src={iframeSrc} />}

          <BlockTitle
            name={block.information.name}
            id={id}
            color={backgroundColor}
            openView={openView}
            actions={!disabled} 
            src={iframeSrc}
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

const BlockPreview = ({id, src}) => {
  console.log(src)

  return (
    <div className="block-preview">
      <div>
        <iframe className="iframe-preview" id={id} src={src}>
        </iframe>
      </div>
    </div>
  )
}

const BlockTitle = ({ name, id, color, openView, actions, src}) => {
  let actionContainer = (
    <div className="action-container">
      <button id="btn_open_code" className="view-btn" onClick={() => openView(id)}><Code size={20}/></button>
      <a href={src} target="_blank" rel="noopener noreferrer"><button id="btn_show_view" className="view-btn"><View size={20}/></button></a>
    </div>
  )

  return (
    <div className="title-box" style={{ backgroundColor: color }}>
      <span>{name}</span>
      { actions && actionContainer }
    </div>
  )
};
const parseHtmlToInputs = (html) => {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const inputElements = doc.querySelectorAll('input, textarea');

  const inputs = Array.from(inputElements).map((element) => {
    const parameterAttr = Array.from(element.attributes).find((attr) =>
      attr.name.startsWith('parameters-')
    );
    const parameterName = parameterAttr ? parameterAttr.name.split('-')[1] : '';

    return {
      type: element.tagName.toLowerCase(),
      value: element.value,
      name: element.name,
      step: element.step,
      parameterName: parameterName,
    };
  });

  return inputs;
};

const InputField = ({ type, value, name, step, parameterName, onChange }) => {
  const handleChange = (event) => {
    onChange(name, event.target.value, parameterName);
  };

  if (type === 'textarea') {
    return (
      <textarea
        value={value}
        name={name}
        onChange={handleChange}
        {...(parameterName && { [`parameters-${parameterName}`]: '' })}
      />
    );
  }

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