from .forge_runner import run_forge, teardown, purge, setup, get_launch_paths
from .install_forge_dependencies import check_version
import argparse, os, json
from pathlib import Path
from .__init__ import __version__
from colorama import init, Fore, Style

EXECUTABLES_PATH = os.path.join(Path(__file__).parent, 'executables')
FRONT_END = os.path.join(EXECUTABLES_PATH, "frontend")

def main():
    help_ = """launch:\t sets up containers for zetaforge, and launches the application
    teardown:\tTears down your docker containers for zetaforge. Use this once you're done using zetaforge, in case your containers are not deleted.
    purge:\tDeletes all zetaforge executables, specifically server and frontend.
    setup: Creates necessary containers for zetaforge. Note that launch handles this automatically. This is an advanced command for zetaforge developers.
    version:\tPrints server, frontend and pip versions"""
    parser = argparse.ArgumentParser(description='zetaforge launcher')
    parser.add_argument("command", choices=["launch", "teardown", "purge", "setup", "version"], help=help_)
    parser.add_argument("--s2_path", "-s2",  help="Full path to local execution server. Note that this is an option for zetaforge developers, or advanced zetaforge users. If not passed, zetaforge will use the deployed application", default=None)
    parser.add_argument("--app_path", "-path",  help="Full path to local electron executable. Note that this is an option for zetaforge developers, or advanced zetaforge users. If not passed, zetaforge will use the deployed application", default=None)
    args = parser.parse_args()

    init()  # Initialize colorama
    
    server_versions = [__version__]
    client_versions =[__version__]
    client_path, server_path = get_launch_paths(server_versions[-1], client_versions[-1])
    print(server_path)
    server_dir = os.path.dirname(server_path)
    print(server_dir)
    config_file = os.path.join(server_dir, "config.json")
    
    if args.command == "launch":
        check_version(server_versions[-1], client_versions[-1])
        print(f"Checking for config in {config_file}")
        config = load_config(config_file)
        if config is None:
            print("Config not found! Running setup..")
            config_file = setup(server_versions[-1], client_versions[-1])
            config = load_config(config_file)

        if config is not None:
            run_forge(server_version=server_versions[-1], client_version=client_versions[-1], server_path=args.s2_path, client_path=args.app_path)
        else:
            raise Exception("Config failed to load, please re-run `zetaforge setup`.")
    elif args.command == "teardown":
        teardown()
    elif args.command == 'purge':
        purge()
    elif args.command == 'setup':
        setup(server_versions[-1], client_versions[-1])
    else:
        print('zetaforge:\t' + __version__)
        print("client:\t" + client_versions[-1])    
        print('server:\t' + server_versions[-1])    

def load_config(config_file):
    if os.path.exists(config_file):
        try:
            with open(config_file, "r") as file:
                config = json.load(file)
                return config
        except (IOError, json.JSONDecodeError) as e:
            print("Error loading configuration file:", str(e))
    return None

if __name__ == "__main__":
    main()

