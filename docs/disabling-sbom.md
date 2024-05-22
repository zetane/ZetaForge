# Disabling SBOM indexing

Docker Desktop provides a service to analyse security vulnerabilities in images called [Docker Scout](https://docs.docker.com/scout).

Zetaforge pipelines can make multiple image builds at once which can cause Docker Scout to trigger multiple times an create unwanted lag.
As such, we recommend disabling SBOM indexing, which is used by Docker Scout, to reduce this lag.

# Steps

- On Docker Desktop, go into Settings.
- In the General tab, scroll down if necessary.
- Uncheck `SBOM indexing`.
- Press `Apply & restart`.

![disable-SBOM.png](assets%2Fdisable-SBOM.png)

