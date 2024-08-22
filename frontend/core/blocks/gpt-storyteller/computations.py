from openai import OpenAI
import json


def tell_story(sentence, api_key):
    client = OpenAI(api_key=api_key)
    completion = client.chat.completions.create(
        model="gpt-4-turbo",
        messages=[
            {
                "role": "user",

                "content": """
                You are an educator and writer who teaches children good morals by incorporating those morals and good 
                habits into stories in illustrated books. You are given an input that is a moral or good habit that a parent
                wants to teach their children. Create a short and simple story with at least two characters that will teach that moral to the children.
                The story should come into six panels that are easy to illustrate. When referring to a character for the 
                first time in the story, describe how they look. No two panels should be exactly the same. Keep the story simple 
                to follow and illustrate. Format your story according to the following example:
                input prompt: I want to teach my son to eat more carrots because they are healthy.
                your output:
                '''
                1) Panel one
                Once upon a time, there was a beautiful princess with long golden hair and brown eyes, named Diana. Diana
                had a dear friend who was not like other people at the castle; he was a dragon! His name was Mushu. He had
                bright green flakes and large purple wings that spread wide. Diana and Mushu played in the castle's garden 
                and always had fun when they were together.
                
                2) Panel two
                Mushu loved carrots. So, Diana took Mushu to pick up carrots from the garden every day. They would run
                in the carrot garden until they were thirsty. Then, they drank some water from the fontain and ate some
                carrots together to power up and go back to their game.
                
                3) Panel three
                But things changed one day when they went to play in the garden. Although Diana was so energetic and ready 
                to run and play more and more, Mushu was very tired from the beginning and couldn't play with Diana. Mushu
                and Diana were both sad that Mushu couldn't run in the garden like every day.
                
                4) Panel four
                Diana was looking for a way to make Mushu strong again so they can play together. She went into the
                garden and picked some fresh orange carrots for Mushu by herself. Diana brought a basket full of carrots 
                to Mushu.
                
                5) Panel five
                Mushu started munching on the carrots. As he ate more carrots, he felt stronger, happier, and healthier.
                When Mushu finished eating the carrots Diana brought, he started laughing again and wanted to run in the 
                garden and play with Diana like every day!
                
                6) Panel six
                Diana and Mushu learned together that carrots are healthy and full of nutrients that are good for both 
                humans and dragons. Eating carrots helped them play longer in the beautiful garden and stay full of joy! 
                '''
                After you wrote your story, reformat it in the json format according to this example:
                {
                    "prompt": "I want to teach my son to eat more carrots because they are healthy.",
                    "response":
                        {
                            "page1": {"text": Once upon a time, there was a beautiful...},
                            "page2": {"text": ...},
                            ...
                            "page6": {"text": ...}
                        }                
                } 
                
                Don't include panel titles, such as "1) Panel one", in the output dictionary. Output only the dictionary with no explanations so that it is convertable to a json object as is.
                here is the input prompt:
                 """
                + sentence,
            }
        ],
        temperature=0.0,
        response_format = {"type": "json_object"}
    )
    return json.loads(completion.choices[0].message.content)


def compute(story_description, api_key):
    """
    Generates a story based on a given prompt.

    Args:
        story_description (str): A description or prompt for the story to be generated.
        api_key (str): API key required for accessing the story generation service.

    Returns:
        dict: A dictionary containing the generated story under the key "story".
    """
    story = tell_story(story_description, api_key)
    return {"story": story}



def test():
    """Test the compute function."""

    print("Running test")
