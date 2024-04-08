# Installation

ZetaForge is available to install using pip or by downloading the application (coming soon). You need to have Docker up and running
and enable Kubernetes to be able to use ZetaForge. 

Follow the instructions below to start assembling your machine learning pipelines with ZetaForge!   


## Install Docker Desktop and Enable Kubernetes
You need to install Docker Desktop or any other container runtime that includes Kubernetes integration.
Follow the instructions to [install Docker Desktop](https://docs.docker.com/desktop/) from their official website.
You will need to [enable Kubernetes](https://docs.docker.com/desktop/kubernetes/) to use ZetaForge.

> Note: We recommend [OrbStack](https://orbstack.dev/download) to macOS users for efficiency and performance reasons.

## Install ZetaForge
You can get ZetaForge by downloading the application or installing ZetaForge Python package through pip.

### ZetaForge Python Package
You can install ZetaForge Python Package through pip by running the following command in your terminal:

```
pip install zetaforge
```

Or, you can clone the ZetaForge GitHub repository and install from source by running:

```
git clone https://github.com/zetane/zetaforge
cd zetaforge
pip install .
```

### Download ZetaForge Application (coming soon)
If you prefer a more interactive installation, you can download ZetaForge installers available for Windows, macOS, and 
Linux. Refer to the table below for download links:

| Windows         | macOS           | Linux           |
|-----------------|-----------------|-----------------|
| [coming soon]() | [coming soon]() | [coming soon]() |


## Launch ZetaForge
If you have installed ZetaForge through an installer, simply open the app to start using ZetaForge.

If you are using ZetaForge pip package, you can start ZetaForge by either:

- typing `zetaforge launch` in your terminal, or
- running the following Python script:
```
import zetaforge
zetaforge.launch()
```

Voilà! Now you are ready to build and run your first ZetaForge Pipeline!

## Teardown and Setup
You can enter `zetaforge teardown` in your terminal whenever you want to delete your containers.

ZetaForge relies on some containers to run that are automatically set up during the installation process.
ZetaForge developers can use the `zetaforge setup` command to set up the containers manually.


If you are using the pip package, you can stop ZetaForge by pressing `Ctrl+c` in your terminal. 
It is important to click "only once". You will be prompted if you wish to teardown your containers, as well.


## Next steps
- [Run your first core Pipeline](run-your-first-pipeline.md)
- [Create your first few Blocks](create-blocks.md)
- [Create your first custom Pipeline](run-a-pipeline.md)
- [Read our user interface guide](user-interface.md)
- [Enable AI-assisted coding on ZetaForge](user-interface.md/#set-your-api-keys)
- [Contribute to ZetaForge](contribute.md)
