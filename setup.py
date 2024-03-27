from setuptools import setup, find_packages
from setuptools.command.install import install
from setuptools.command.develop import develop



setup(
    name = "zetaforge",
    author="Zetane",
    author_email="info@zetane.com",
    description = "zetaforge installer",
    long_description_content_type="text/markdown",
    version = "0.3.3",
    entry_points={
        'console_scripts': [
            'zetaforge = zetaforge.forge_cli:main'
        ]
    },
    packages=find_packages(include=('zetaforge',)),
    python_requires='>=3.7',
    install_requires = ['setuptools', 'requests', 'boto3','docker', 'colorama', 'mixpanel', 'cryptography', "langchain", "openai", "progressbar", "pyyaml"],
    include_package_data=True,
    package_data={'zetaforge': ['utils/*.yaml', 'executables/*'],},)