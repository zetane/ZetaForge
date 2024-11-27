# Deploy a Pipeline

After the creation or modification of a pipeline, our system stores the information of every previously executed pipelines. After some pipelines have been executed you will be able to navigate through all past pipelines executions, Deploy an existing pipeline, and Retrieve code examples to call the API for the deployed pipeline.

# Steps to Deploy a Pipeline

1. **Access Past Executions**
   To begin, you would need to navigate to the past executions section in the interface. This section will display a lis of all the previously executed pipeline, both succesful and unsuccesful executions. To navigate to past executions click on the button as shown below:

   ![executed-pipeline-button.png](assets%2Fexecuted-pipeline-button.png)

   After clicking the button you should be presented with the list of previously executed pipelines as shown below:
   ![executed-pipelines.png](assets%2Fexecuted-pipelines.png)

2. **Locate your desired pipeline**
   After the table has been displayed you can now browse through all the previously executied pipelines, and find the one you wish to deploy. Each row would contain information such as the `pipeline ID`, `Date Created`, `Last Execution`, `Host`, `Deployment status`, and `# of executions`. and upon selecting a desired pipeline, you can have access to more information such as the `execution status` refer to the image shown below :

   ![selected-executed-pipeline.png](assets%2Fselected-executed-pipeline.png)

3. **Deploy desired pipeline**
   Once you have selected your desired pipeline, you can deploy it by simply clicking on the deploy button corresponding to it. the system would process the request, and update the deploy button to **Payload**
   ![deploy-to-payload.gif](assets%2Fdeploy-to-payload.gif)
4. **Retrieve Code Examples**
   After succesfully deploying your pipeline, you can click the **payload** button, and This will display code examples demonstrating how to call the API for your pipeline. You can utilize these examples to have them integrated into your applications.
   ![deployed-payload.png](assets%2Fdeployed-payload.png)
