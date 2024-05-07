import React, { useEffect, useState } from 'react';
import { TextInput, Button, Loading, TextArea } from '@carbon/react';
import { pipelineAtom } from '@/atoms/pipelineAtom';
import { useImmerAtom } from 'jotai-immer';
import { Save } from "@carbon/icons-react";

function SpecsInterface({ blockPath }) {
  const [specs, setSpecs] = useState({});
  const [flattenedSpecs, setFlattenedSpecs] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [pipeline, setPipeline] = useImmerAtom(pipelineAtom);
  const serverAddress = "http://localhost:3330";

  useEffect(() => {
    setIsLoading(true);
    fetch(`${serverAddress}/get-specs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ blockPath: blockPath })
    })
    .then(response => response.json())
    .then(data => {
      setSpecs(data);
      setFlattenedSpecs(flattenSpecs(data)); // Flatten the specs and update state
      setIsLoading(false);
    })
    .catch(error => {
      console.error('Error fetching specs:', error);
      setIsLoading(false);
    });
  }, [blockPath, serverAddress]);

  const flattenSpecs = (data, prefix = '', path = []) => {
    let fields = [];
    Object.keys(data).forEach(key => {
      if (['connections', 'relays', 'command_line', 'pos_x', 'pos_y', 'pos_z', 'parameters'].includes(key)) {
        return; // Skip these keys
      }
  
      const newPath = path.concat(key);
      const newKey = prefix ? `${prefix}.${key}` : key;
      if (typeof data[key] === 'object' && !Array.isArray(data[key]) && data[key] !== null) {
        // Recursively call flattenSpecs for nested objects
        fields = fields.concat(flattenSpecs(data[key], newKey, newPath));
      } else {
        // Construct label based on the path
        let label = key; // Default label
        if (newPath.includes('inputs') || newPath.includes('outputs')) {
          const typeLabel = newPath[0].charAt(0).toUpperCase() + newPath[0].slice(1); // Capitalize first letter
          const varName = newPath[newPath.length - 2]; // Get variable name from the second last item in the path
          label = `${typeLabel} ${varName} Type`; // Correctly format label
        }
        fields.push({ key: newKey, label, value: data[key] });
      }
    });
    return fields;
  };

  const handleInputChange = (field, value) => {
    // Update the value in the flattened specs array
    const newFlattenedSpecs = flattenedSpecs.map(item => {
      if (item.key === field) {
        return { ...item, value: value };
      }
      return item;
    });
    setFlattenedSpecs(newFlattenedSpecs);

    // Update the original specs object
    const keys = field.split('.');
    const lastKey = keys.pop();
    const lastObj = keys.reduce((obj, key) => obj[key] = obj[key] || {}, specs);
    lastObj[lastKey] = value;
    setSpecs({ ...specs });
  };

  function specsValuesUpdate(blockFolderName, specs, pipelineData) {
    // Clone the relevant block specs from pipeline data
    const pipelineBlockSpecs = JSON.parse(JSON.stringify(pipelineData[blockFolderName]));
  
    // Define a set of keys to skip
    const keysToSkip = new Set(['connections', 'relays', 'command_line', 'pos_x', 'pos_y', 'pos_z', 'parameters']);
  
    // Function to recursively update the values based on specific rules
    function updateValues(target, source, path = []) {
      Object.keys(source).forEach(key => {
        // Skip updates for specific keys
        if (keysToSkip.has(key)) {
          return;
        }
  
        const newPath = path.concat(key);
        if (typeof source[key] === 'object' && !Array.isArray(source[key]) && source[key] !== null) {
          // Ensure the target path exists or create it
          if (!target[key]) target[key] = {};
  
          // Continue recursion
          updateValues(target[key], source[key], newPath);
        } else {
          // Update the leaf nodes
          target[key] = source[key];
        }
      });
    }
  
    // Start the update process
    updateValues(pipelineBlockSpecs, specs);
  
    return pipelineBlockSpecs;
  } 
  
  const saveSpecs = () => {
    setIsLoading(true);
    fetch(`${serverAddress}/update-specs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ blockPath, specs })
    })
    .then(response => response.json())
    .then(() => {
      console.log('Specs updated successfully');
      setIsLoading(false);
    })
    .catch(error => {
      console.error('Error updating specs:', error);
      setIsLoading(false);
    });

    // Update the pipeline block specs
    try {
        const relPath = blockPath.replaceAll('\\', '/')
        const blockFolderName = relPath.split("/").pop();

        console.log(blockFolderName, specs, pipeline.data)
        const newSpecs = specsValuesUpdate(blockFolderName, specs, pipeline.data);
        console.log("newSpecs", newSpecs)
        setPipeline((draft) => {
          draft.data[blockFolderName] = newSpecs;
        })
      } catch (error) {
        console.error(error)
      }
  };

  return (
    <div className="flex flex-col items-center justify-center w-full p-4">
      {isLoading ? (
        <Loading description="Loading" withOverlay={true} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-8 w-full max-w-4xl"> {/* Responsive grid setup */}
          {flattenedSpecs.map(({ key, label, value }) => (
            <div key={key} className="mb-4 w-full">
              {label.toLowerCase().includes('description') ? (
                <TextArea
                  labelText={label.replace(/_/g, ' ').toUpperCase()}
                  id={key}
                  className="w-full"
                  value={value || ''}
                  onChange={(e) => handleInputChange(key, e.target.value)}
                  rows={4}
                  style={{ resize: 'vertical' }} // Allows the user to resize the textarea vertically
                />
              ) : (
                <TextInput
                  labelText={label.replace(/_/g, ' ').toUpperCase()}
                  id={key}
                  className="w-full"
                  value={value || ''}
                  onChange={(e) => handleInputChange(key, e.target.value)}
                />
              )}
            </div>
          ))}
        </div>
      )}
      <Button
        className="mt-4"
        renderIcon={Save}
        kind="primary"
        onClick={saveSpecs}
        disabled={isLoading}
      >
        Save Changes
      </Button>
    </div>
  );
  
  
}

export default SpecsInterface;
