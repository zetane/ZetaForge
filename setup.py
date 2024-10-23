from setuptools import setup, find_packages

setup(
    name='zetaforge',
    version='0.4.0',
    description='A Python API for interacting with Zetaforge',
    long_description=open('README.md').read(),
    long_description_content_type='text/markdown',
    author='Zetane',
    author_email='info@zetane.com', 			#CUSTOMIZEEEEE
    url='https://github.com/',
    license= '',
    packages=find_packages(where='src'),
    package_dir={'': 'src'},
    install_requires=[
        'requests',
        'yaspin',
        'colorama'
    ],
    python_requires='>=3.6',
    classifiers=[
        'Development Status :: 3 - Alpha',
        'Programming Language :: Python :: 3',
        'License :: OSI Approved :: MIT License',
    ],
)
