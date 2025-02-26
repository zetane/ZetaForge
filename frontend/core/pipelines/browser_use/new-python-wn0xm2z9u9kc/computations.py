from langchain_openai import ChatOpenAI
from browser_use import Agent, Browser, BrowserConfig  # Import BrowserConfig correctly
import asyncio
import os
from dotenv import load_dotenv

load_dotenv()


async def run_agent(prompt):
    """Runs the agent in a headless browser with OpenAI LLM asynchronously."""
    
    browser = Browser(config=BrowserConfig(headless=True))
    
    agent = Agent(
        task=prompt,
        llm=ChatOpenAI(model="gpt-4o", openai_api_key=""),
        browser=browser
    )
    
    result = await agent.run()
    return result

def extract_extracted_content(result):
    """Extracts the extracted_content values into a list."""
    return [action.extracted_content for action in result.all_results]


def compute(prompt):
    """Runs the agent in a headless browser with OpenAI LLM"""
    
    try:
        loop = asyncio.get_event_loop()
    except RuntimeError:  # No running event loop
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        
    result = loop.run_until_complete(run_agent(prompt))
    # extracted_contents = extract_extracted_content(result)
    
    # print("Extracted Content List:", extracted_contents)
    img_path = ['agent_history.gif']
    result_url = result.urls()
    result_extracted_content = result.extracted_content()
    final_result = [result.final_result()]
    print("Result:", result.urls())
    return {"result_url": result_url,"result_extracted_content":result_extracted_content,"final_result":final_result ,"img_path":img_path}

def test():
    """Test the compute function."""
    print("Running test")