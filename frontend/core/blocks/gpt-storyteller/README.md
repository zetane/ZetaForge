# block-gpt-storyteller
A block that writes a moral story about the given prompt. The story will be divided into 6 panels and returned as a JSON object containing the initial prompt and the generated story. 

This block can be used in ZetaForge, an open-source platform enabling developers to design, build, and deploy AI pipelines quickly.
Check out ZetaForge on GitHub: https://github.com/zetane/zetaforge.

To use this block, provide your OpenAI API key and a short description of a moral you want to teach to a child. This block takes that information and writes a nice story that teaches that moral to children.
Input: 
- `api_key`: Your OpenAI API key.
- `story_description`: The description for the moral story you want to generate.

Output:
- `story`: A JSON object containing the initial prompt and the generated story, paginated into 6 pages.

You can attach this block to a Text Viewer block (available on ZetaForge Block Library) to view the generated story, as shown below:


![Screenshot 2024-05-28 at 10 18 42 AM](https://github.com/zetane/block-gpt-storyteller/assets/97202788/4d0f295f-6970-4dc8-bac9-11d5d1615952)
