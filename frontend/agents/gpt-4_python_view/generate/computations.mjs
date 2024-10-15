import { Configuration, OpenAIApi } from "openai";
const openaiSystemContent = `You are an assistant that generates python code and returns it in a way that must follow the template below. Your goal is to generate a view.html file that satisfy the user requirement.
Most importantly, you must rely on the prompt to generate the html_template file that satisfy the user request. The html should contain everything to display in a browser and must rely on CDN or skypack when needed.
You absolutely need to give a python code section without abbreviation that follows the template. Do not put code lines at the root, but give only the functions and imports.

By default, when requested to do change or add to the code, modify the latest code section. But when the user asks to do it on another section, do so.

In the template, the function compute contains the code and the function test contains a series of call to compute that runs and prints multiple tests. 

Don't insert a __main__ section.

Template:
from string import Template

def compute(in1):
    '''Generates an HTML file with a unique name and returns the file name.'''

    html_template = Template(\`
<!DOCTYPE html>
<html>
<head>
    <title>Hello Block View</title>
</head>
<body>
    \${in1}
</body>
</html>
    \`)

    # Build and save the html file
    html_path = f"view.html"
    html_code = html_template.substitute(in1=in1)
    with open(html_path, "w") as file:
        file.write(html_code)
  
    return {{'html': f"view.html"}}

def test():
    '''Test the compute function.'''

    print('Running test')
    result = compute('Hello view block')
    print(f"Generated HTML file: {{result['html']}}")
`;

function extractPythonCode(response) {
  const patternBackticks = /```python\n(.*?)```/gs;
  const matchesBackticks = [...response.matchAll(patternBackticks)];
  if (matchesBackticks.length === 0) {
    return response;
  }
  const processedCodeBlocks = matchesBackticks.map((match) => {
    let codeBlock = match[1];
    codeBlock = codeBlock.replace(/^\s*compute\(.*?\)\s*$/gm, "");
    codeBlock = codeBlock.replace(/^\s*test\(.*?\)\s*$/gm, "");
    return codeBlock.trim();
  });
  return processedCodeBlocks.join("\n\n");
}

export async function computeViewAgent(
  userPrompt,
  modelVersion,
  conversationHistory,
  apiKey,
) {
  if (conversationHistory.length > 0) {
    conversationHistory = [conversationHistory[conversationHistory.length - 1]];
  }

  const escapedHistory = [];
  for (const entry of conversationHistory) {
    const prompt = entry.prompt.replace(/{/g, "{{").replace(/}/g, "}}");
    const response = entry.response.replace(/{/g, "{{").replace(/}/g, "}}");
    escapedHistory.push({ role: "user", content: prompt });
    escapedHistory.push({ role: "assistant", content: response });
  }

  const messages = [
    { role: "system", content: openaiSystemContent },
    ...escapedHistory,
  ];
  messages.push({ role: "user", content: userPrompt });

  const configuration = new Configuration({ apiKey: apiKey });
  const openai = new OpenAIApi(configuration);

  const response = await openai.createChatCompletion({
    model: modelVersion,
    messages: messages,
  });

  const code = extractPythonCode(response.data.choices[0].message.content);

  return { response: code, model: modelVersion };
}
