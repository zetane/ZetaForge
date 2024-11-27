import json
import os
from setuptools import find_packages, setup

def get_package_version():
    # Specify the path to the package.json file
    package_json_path = os.path.join(os.path.dirname(__file__), 'frontend', 'package.json')
    try:
        # Read the contents of package.json
        with open(package_json_path, 'r') as file:
            package_data = json.load(file)

        # Extract the version from the package data
        version = package_data.get('version')

        if version:

            init_file_path = "zetaforge/__init__.py"
            init_content = f"__version__ = '{version}'\nfrom .block_maker.zetahelper import block_maker\nfrom .Zetaforge import Zetaforge\n"

            if not os.path.exists(init_file_path) or not open(init_file_path).read().startswith("__version__"):
                with open(init_file_path, "w") as fp:
                    fp.write(init_content)

            return version
        else:
            raise ValueError("Version not found in package.json")

    except FileNotFoundError:
        raise FileNotFoundError("package.json not found")
    except json.JSONDecodeError:
        raise ValueError("Invalid JSON format in package.json")

package_version = get_package_version()

setup(
    version = package_version,
    entry_points={
        'console_scripts': [
            'zetaforge = zetaforge.forge_cli:main'
        ]
    },
    packages=find_packages(include=('zetaforge', 'Zetaforge')),
    include_package_data=True,
    package_data={'zetaforge': ['utils/*', 'executables/*', 'block_maker/*'],},)
