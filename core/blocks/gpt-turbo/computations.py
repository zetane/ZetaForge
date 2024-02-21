import openai
openai.api_key = "your_openai_key"
import json


def request_course_of_action(sentence):
    completion = openai.ChatCompletion.create(model="gpt-3.5-turbo", messages=[
        {"role": "user", "content": 
        """Here is a scenario. A security camera to protect against threats sees something that is described in a sentence. 
        Assume the person monitoring the camera feed is military personnel. 
        Based on the following descriptions, in a few lines, suggest a course of action and explain why. Always give a section for Course of Action and another for Explanation.
        
        description: """ + sentence}], 
    temperature=0.0)
    return completion.choices[0].message.content

def compute(descriptions):
    '''A textual description of the compute function.

        Inputs:
            in1 (all): Textual description of in1
            in2 (all): Textual description of in2
            ... 
        Outputs:
            out1 (all): Textual description of out1
            out2 (all): Textual description of out2
            ...
    '''
    description_action_pairs = []
    description_list = []
    action_list = []

    for d in descriptions:
        action = request_course_of_action(d)

        if 'Course of Action:' in action:
            action = action.replace('Course of Action:', '<strong>Course of Action:</strong>')
        if 'Explanation:' in action:
            action = action.replace('Explanation:', '<strong>Explanation:</strong>')

        print(action)

        description_action_pairs.append({'description':d, 'action':action})
        description_list.append(d)
        action_list.append(action)

    print(description_action_pairs)

    return {'descriptions':description_list, 'actions': action_list, 'pairs': description_action_pairs, }
