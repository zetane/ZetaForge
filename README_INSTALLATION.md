# ZetaForge
​
ZetaForge is an AI platform for rapid development and deployment of advanced safe AI solutions. Easilly assemble reusable, customizable and containerized blocks into highly visual AI pipelines.
​
## Pre-setup
​
Before installing and launching zetaforge, you have to make sure to follow a few pre-setup that sets some essentials pieces of zetaforge.
​
​
### Docker Installation
​
Zetaforge backend uses docker, and that is why, you have to have your docker engine(docker desktop, orbstack) running on your computer.
​
If you don't have the docker desktop, uploaded on your computer, you need to install it. For installation,
pleaser refer to: https://docs.docker.com/engine/install/

If you wish to use orbstack, refer to: https://orbstack.dev/download



​
### Enable kubernetes on Docker
​
The next step is to make sure kubernetes is enabled in your docker desktop. To do this, in your docker desktop, you should go to Settings > Kubernetes, check the box next to "Enable Kubernetes", then click Apply & Restart. It'll take a few minutes to apply the changes, and restart your docker desktop. 

You can also refer to docker documentation regarding to enabling kubernetes: https://docs.docker.com/desktop/kubernetes/
​
For orbstack, refer to: https://docs.orbstack.dev/kubernetes/

### PowerShell(For Windows)

If you're using a Windows machine, zetaforge requires powershell installation. If you don't have powershell, please refer here to download: https://learn.microsoft.com/en-us/powershell/scripting/install/installing-powershell-on-windows?view=powershell-7.4

## Installation
​
### Create a virtual environment(Optional)
​
It is recommended to create a new virtual environment, to keep zetaforge dependencies isolated. 
To create a new virtual env, run: 
​
​
`python -m venv <venv_name>`
​
​
then to activate your virtual environment
    
    | Platform | Command |
    | :------:  | :------: |
    | POSIX   | source <venv>/bin/activate |
    | Windows | <venv>\Scripts\activate.bat |
​
### Install the package
​
To install the package, run `pip install zetaforge`, and it'll install zetaforge with all necessary dependencies.

If you wish to install the package locally from the repository, then run `pip install .`
​
### Launch zetaforge
​
​
There are two ways to launch zetaforge. Either, type `zetaforge launch` on your terminal(or powershell), or in a python script, run:
​
`import zetaforge
zetaforge.launch()
`
Upon launch, the user will be prompted to select a kubernetes context to run(docker-desktop, orbstack or custom context). The initial launch might take couple minutes as zetaforge launch handles some of its dependencies.

The app will be running on localhost:3000 by default(or any other port if the given port is not available)
​
You're ready to use Zetaforge!

#### Using local executables(Solely for Zetaforge developers)

Note that you can pass full path to electon executable and/or server2, using --s2_path and/or --app_path options, by passing full path to the executables. These options are solely for our zetaforge developers to test their new features on their development environment.
​​
### Teardown
​
Once you're done with your zetaforge application, please on your terminal, press `Ctrl+C` to end the process. It is important to click **only once**. Then you'll be prompted if you wish to teardown your containers.

If you encounter errors on your teardown process, or you wish to teardown your containers later on, you can type `zetaforge teardown` whenever you want to delete your containers.


### Purge

Purge is a command that deletes your executables(electron application, server2 executable etc.) from your pip package. On the next launch after launch,  zetaforge launcher will re-install those dependencies. 

### Setup

This is a command that sets up necessary containers for the zetaforge application. Note that this step is handled in launch process already, and this command is designed solely for zetaforge developers. 


​