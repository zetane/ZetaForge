# View executed pipelines

This guide explains how to view pipelines that have already been executed in the Zetaforge application.

## Steps to View Executed Pipelines

1. **Navigate to the Execution History**:

   - Open the Zetaforge application.
   - Locate the **Pipelines** section in the user interface.

   ![executed-pipeline-button.png](assets%2Fexecuted-pipeline-button.png)

2. **Browse Past Executions**:

   - In the Execution History view, you will see a list of previously executed pipelines.
   - Each entry in the table represents a past pipeline execution and typically includes:

     - **Pipeline UUID**: The unique identifier for the pipeline.
     - **Execution Date and Time**: When the pipeline was executed.

       ![executed-pipelines.png](assets%2Fexecuted-pipelines.png)

3. **View Detailed Information**:

   - Click on a specific pipeline execution entry to view detailed information, including:

     - **Status**: The current state of the pipeline execution (e.g., succeded, failed).

       ![past-executions.png](assets%2Fpast-executions.png)

4. **Deploy a Pipeline from History**:
   - If you want to deploy a pipeline from the history:
     - Click on the **Deploy** button next to the corresponding pipeline entry.
     - Once deployed, a **Payload** button will appear. Click on it to view and copy API code examples for invoking the pipeline programmatically.
5. **Rerun a Pipeline from History**:
   - If you want to rerun a previously executed pipeline:
     - Click on the desired pipeline to view detailed information
     - Click on the **View** button
     - This would automatically reinstate the desired pipeline on the canvas, and you can rerun it by clicking on the **Run @localhost** button as seen below.
       ![rerun-pipeline.gif](assets%2Frerun-pipeline.gif)
