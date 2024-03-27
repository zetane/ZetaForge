from .forge_runner import launch_forge, teardown, purge, setup
from .install_forge_dependencies import install_frontend_dependencies
import argparse
from .__init__ import __version__
def main():
    help_ = """launch:\t sets up containers for zetaforge, and launches the application
    teardown:\tTears down your docker containers for zetaforge. Use this once you're done using zetaforge, in case your containers are not deleted.
    purge:\tDeletes all your executables, specifically server2 and fronted.
    setup: Creates necessary containers for zetaforge. Note that launch handles this automatically. This is an advanced command for zetaforge developers.
    version:\tPrints server2, frontend and pip versions"""
    parser = argparse.ArgumentParser(description='zetaforge launcher')
    parser.add_argument("command", choices=["launch", "teardown", "purge", "setup", "version"], help=help_)
    parser.add_argument("--s2_path", "-s2",  help="Full path to local s2 executable. Note that this is an option for zetaforge developers, or advanced zetaforge users. If not passed, zetaforge will use the deployed application", default=None)
    parser.add_argument("--app_path", "-path",  help="Full path to local electron executable fro frontend. Note that this is an option for zetaforge developers, or advanced zetaforge users. If not passed, zetaforge will use the deployed application", default=None)
    args = parser.parse_args()

    
    compatible_versions = ['v1.0.0']
    app_versions=['0.0.1']
    
    if args.command == "launch":
        context = get_context()
        if context == 'exit':
            print("HAVE A NICE DAY")
            return
        launch_forge(context, s2_version=compatible_versions[-1], app_version=app_versions[-1], s2_path=args.s2_path, app_path=args.app_path)
    elif args.command == "teardown":
        teardown()
    elif args.command == 'purge':
        purge()
    elif args.command == 'setup':
        context = get_context()
        if context == 'exit':
            print("HAVE A NICE DAY")
        setup(context)
    else:
        print('zetaforge\t' + __version__)
        print('Frontend\t' + compatible_versions[-1])    
        print("Backend\t" + app_versions[-1])    

def get_context():
    print("PLEASE SELECT THE KUBECTL CONTEXT YOU WISH TO USE FOR ZETAFORGE OR PRESS 4 TO EXIT")

    
    while True:
        answer = input("1)\tdocker-desktop\n2)\torbstack\n3)\tcustom context\n4)\tExit\n")
        if answer == '1':
            return 'docker-desktop'
        elif answer == '2':
            return 'orbstack'
        elif answer == '3':
            context = input("PLEASE ENTER THE NAME OF CONTEXT YOU WISH TO USE:\t")
            return context
        elif answer == '4':
            return 'exit'
        else:
            print("INVALID ANSWER. PLEASE TRY AGAIN.")


