# ZetaForge

## Description
ZetaForge is an AI platform for rapid development and deployment of advanced safe AI solutions. Easilly assemble reusable, customizable and containerized blocks into highly visual AI pipelines.

## Visuals
TBD

## Installation
1- Install Docker
    [Get Docker here](https://docs.docker.com/get-docker/)
2- Verify Docker is correctly installed
    ```docker --version```
3- Install the Python packages
    ```pip install -r requirements.txt```
4- `cd` to `\backend\nodejs` and install the packages
    ```npm install```
5- `cd` to `\frontend` and install the packages
    ```npm install```

## Getting Started
Use the following command to launch Forge in your localhost. 
`cd` to `\backend\nodejs`
`node server.js`

Examples of Pipeline of Block are provided in the `pipelines` folder. They can be loaded and run using the `Load` and `Run` top menu buttons.

## Videos

Zetaforge demo and code overview
https://drive.google.com/drive/folders/1oeX6Sd8sic1cw4WSUk_JJ7jDuMhKvNqY?usp=sharing

## Documentation
Each block (Python) is compose of a `computations.py`, `requirements.txt`, `Dockerfile` and `specs.json` file which follows the templates below. In a block folder wrapping up a full ML repo, there can be any nescessary files as long the compute function from computations.py follows the interface below.

Specs.json files will have the same template for all programming languages and blocks will follow a similar layout.

`specs.json`
```
{
    "block": {
        "information": {
            "id": "minimal",
            "name": "Minimal Block",
            "description": "description",
            "system_versions": [],
            "block_version": "block version number"
        },

        "inputs": {
            "in1": {
                "type": "int",
                "connections": [],
                "relay_connections": []
            },
            "in2": {
                "type": "str",
                "connections": [],
                "relay_connections": []
            }
        },
        "outputs": {
            "out1": {
                "type": "int",
                "connections": [],
                "relay_connections": []
            },
            "out2": {
                "type": "str",
                "connections": [],
                "relay_connections": []
            }
        },
        "parameters": {},
        "action": {
            "container_uuid": "minimal",
            "container_image_uuid": "minimal",
            "block_source": "blocks/minimal",
            "version": "latest"
        },
        "views":{
            "mode": "modal",
            "node": {
                "active": "True or False",
                "title_bar": {
                    "background_color": "#D55908"
                },
                "preview": {
                    "active": "false"
                },
                "html": "",
                "pos_x": "300",
                "pos_y": "200",
                "pos_z": "999"
            }
        },
        "events": []
    }
}
```
Note that for preview to display when set to true, it need to be a view block that has an html output variable.

`computations.py`
```
# Python block template
compute(in1, in2, in3,...):
    '''A textual description of the compute function.

    Inputs:
    in1 (all): Textual description of in1
    in2 (all): Textual description of in2
    in3 (all): Textual description of in2
     
    Outputs:
    out1 (all): Textual description of out1
    out2 (all): Textual description of out2
    '''

    #Your code

    return {'out1': out1, 'out2': out2, ...}
```

## New Blocks
To create a new block, drag and drop the `New_Python` sidebar library block. Insert your code or ask GPT to generate code based on your prompt. Please, ensure you follow the provided template. After you save the block a new block will be created in the folder `my_blocks`. Using the `Load` button, you can load previously created blocks by selecting the block's `specs.json` file. 

You can also copy the folder `blocks/minimal` into the `my_blocks` folder and manually edit files.

## Optional: PostgreSQL
In `manager.py` there is a flag `save_graph_to_database = False`. To record each run in the database and access the result events from each block set it to `True`. In `index.html`, you can comment and uncomment the history sections.

You can call your PostgreSQL database `graph_db1` and use credentials like in `manager.py` after the `save_graph_to_database` flag.
In your database, make a table called my_table with columns id (serial, primary key) and data (json)

## Support
See Zetane Docs (TBD)

From the folder `backend/python`, the following command with launch only the pipeline computing for testing and debugging.
`python ../python/manager.py`

## Roadmap
TBD

## To-Do
### Tasks
- [ ] Need to add a stop button to cancel computations and reset the server
- [ ] blocks to blocks
- [ ] Reset colors when rerunning graph
- [ ] Versioning
- [ ] Fix index.html console errors
- [ ] Add font awesome icons in specs.json
- [ ] Test Kubernetes


## Contributing
TBD

## License
TBD

## Project status
Version 0.1 (internal alpha)
