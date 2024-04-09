# ZetaForge Contributing Guide

Thank you for your interest in contributing to ZetaForge! There are many ways you can contribute to ZetaForge, such as:

- contributing to ZetaForge documentations, 
- reporting bugs by creating Issues,
- submitting a Pull Request (PR),
- helping us improve the code and fix bugs,
- answering usage questions and discussing issues with other users,
- and, sharing your ZetaForge Pipelines and Blocks with the community through ZetaForge Discord channel.

Every small improvement you contribute will help push the boundaries of AI a bit further, and will help us all grow
faster! 

## Documentation

Feel free to suggest changes or updates to the documentations. 

The documentation is based on [Material for MKDocs](https://squidfunk.github.io/mkdocs-material/getting-started/). 
To install the `pip` package, run the following command:
```
pip install mkdocs-material
```
The Material for MKDocs package comes with a live preview sever that allows you to preview your changes as you make 
modifications. To start the live preview server, run the following commands in your terminal:

```
cd to docs
mkdocs serve
```

The preview will be available at [localhost:8000](http://localhost:8000).


## Create New Issues

ZetaForge [Issues](https://github.com/zetane/ZetaForge/issues) page is kept up-to-date
with bugs, improvements, and feature requests. If you face a bug or want to add a feature request,
please read our Issues list before creating a new one.

When creating a new issue, make sure that your issue is addressing a single, modular bug or feature request.
Please link related issues together rather than combining multiple issues.

If you want to work on an existing issue, please assign it to yourself.

We use labels to organize issues; filter issues by labels to quickly find what you are looking for. Please
add labels to your issues when you create one to help us organize issues more effectively.

## Submitting a Pull Request (PR)

Before submitting a PR, please make sure to check if there are any open or closed pull requests related
to your intended submission. If there were no pull requests related to what you have in mind, please 
submit your PR by following these steps:

1- [Fork ZetaForge](https://github.com/zetane/ZetaForge/fork) and download your forked repository to your local machine:

```
git clone [your-forked-repo-url]
```
2- Add the original ZetaForge repository as the remote.

```
git remote add upstream https://github.com/zetane/zetaforge
```

3- Sync the code from the main repository to your local machine and push it back
to your forked remote repository.

```
# Pull the latest code from the upstream branch
git fetch upstream

# Switch to the main branch
git checkout main

# Merge the updates from the upstream branch into main, synchronizing the local main branch with the upstream
git merge upstream/main

# Additionally, sync the local main branch to the remote branch of your forked repository
git push origin main
```

4- Create a new branch in your forked repository. Please use meaningful names.
```
git checkout -b my-new-branch main
```

5- Make your modifications and commit your changes with meaningful commit messages.

```
git commit -m "your commit message"
```

6- Push your changes to your GitHub repository.
```
git push origin my-new-branch
```
7- Submit a pull request to the main branch on the GitHub repository page.

## Share Your Work
If you like to show your genius to the community, feel free to post your ZetaForge Block or Pipeline 
on [ZetaForge Discord channel](https://discord.gg/zetaforge) with a short description of what your Pipeline does. 
Demo videos are always appreciated!
You can meet other community members who are interested in the same repositories as yourself, too!

## Getting Help
If you need help, we are there for you! Post your questions or take part in discussions
by joining our Discord channel: https://discord.gg/zetaforge.