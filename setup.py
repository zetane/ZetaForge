from setuptools import setup, find_packages
import os
import json

version = {}
with open("zetaforge/__init__.py") as fp:
    exec(fp.read(), version)

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
            # Set the __version__ variable in your package's __init__.py
            with open("zetaforge/__init__.py", "w") as fp:
                fp.write(f"__version__ = '{version}'\n")
            return version
        else:
            raise ValueError("Version not found in package.json")
    
    except FileNotFoundError:
        raise FileNotFoundError("package.json not found")
    except json.JSONDecodeError:
        raise ValueError("Invalid JSON format in package.json")


setup(
    name = "zetaforge",
    author="Zetane",
    author_email="info@zetane.com",
    description = "zetaforge installer",
    long_description_content_type="text/markdown",
    version = get_package_version(),
    entry_points={
        'console_scripts': [
            'zetaforge = zetaforge.forge_cli:main'
        ]
    },
    packages=find_packages(include=('zetaforge',)),
    python_requires='>=3.7',
    install_requires = ['requests', 
                        'boto3', 
                        'colorama', 
                        'mixpanel==4.10.1', 
                        "langchain", 
                        "openai", 
                        "pyyaml"],
    include_package_data=True,
    package_data={'zetaforge': ['utils/*.yaml', 'executables/*'],},)