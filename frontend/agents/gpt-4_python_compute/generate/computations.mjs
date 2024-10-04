import { Configuration, OpenAIApi } from "openai";
const openaiSystemContent = `You are an assistant that generates python code and returns it in a way that must follow the template below. 
You absolutely need to give a python code section without abbreviation that follows the template. Do not put code lines at the root, but give only the functions and imports.

By default, when requested to do change or add to the code, modify the latest code section. But when the user ask to do it on another section, do so.

In the template, the function compute contains the code and the function test contains a series of call to compute that runs and prints multiple tests. 

Don't insert a __main__ section.

Template:
import ...

def compute(in1, in2, in3,...):
    '''A textual description of the compute function.'''

    #some code
    return {{'out1': out1, 'out2': out2, ...}}

def test():
    # Call compute multiple times based on a series of inputs. The outputs are then compare with the expected outputs. Print the results and indicate if the tests passed.
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

export async function computeAgent(
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
