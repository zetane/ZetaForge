from .forge_runner import launch_forge


__all__ = ['launch']
__version__ = '0.3.3'
#dev version is only passed, when a developer wants to pass a local version(for e.g. dev_path=./s2-v2.3.5-amd64)
def launch(dev_path=None):

    compatible_versions = ['v1.0.0']
    app_versions=['0.0.1']
    dev_flag = False
    if dev_path:
        dev_flag = True
    
    


    return launch_forge(s2_version=compatible_versions[-1], dev_path=dev_path, dev_flag=dev_flag, app_version=app_versions[-1])
