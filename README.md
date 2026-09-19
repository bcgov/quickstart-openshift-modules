[![MIT License](https://img.shields.io/github/license/bcgov/quickstart-openshift-modules.svg)](/LICENSE)
[![Lifecycle](https://img.shields.io/badge/Lifecycle-Experimental-339999)](https://github.com/bcgov/repomountie/blob/master/doc/lifecycle-badges.md)
[![Merge](https://github.com/bcgov/quickstart-openshift-modules/actions/workflows/merge.yml/badge.svg)](https://github.com/bcgov/quickstart-openshift-modules/actions/workflows/merge.yml)
[![Analysis](https://github.com/bcgov/quickstart-openshift-modules/actions/workflows/analysis.yml/badge.svg)](https://github.com/bcgov/quickstart-openshift-modules/actions/workflows/analysis.yml)

# QuickStart: OpenShift Modules

Modular plug-ins for the [QuickStart for OpenShift](https://github.com/bcgov/quickstart-openshift) ecosystem. These modules provide alternative backend implementations designed to be stamped by Backstage software templates or overlaid directly into a target `quickstart-openshift` repository.

## Available Modules

* **Java Backend (`backend-java`)**: Cloud Native Java with [Quarkus](https://quarkus.io/) compiled to native binary with GraalVM. Features embedded [Flyway](https://flywaydb.org/) migrations run at startup and modern OpenShift deployment templates.
* **Python Backend (`backend-py`)**: High-performance backend built with [FastAPI](https://fastapi.tiangolo.com/).

## Integration

When scaffolding with Backstage or manually swapping backends in `quickstart-openshift`, the chosen module (e.g., `backend-java/`) maps to the `backend/` directory of the target project, providing its source code, Dockerfile, and OpenShift deployment template (`openshift.deploy.yml`).

## Features

* Cloud Native Java with Quarkus and GraalVM native images for minimal resource footprints
* Modern OpenShift deployment manifests (`Deployment`, `Service`, `Route`, `NetworkPolicy`, `HorizontalPodAutoscaler`, `PodDisruptionBudget`)
* Automated database migration and connectivity with PostgreSQL (`${NAME}-${ZONE}-database`)

## Acknowledgements

This repository is maintained by the Forestry Suite of Applications, part of the Government of British Columbia.
