# Backstage Software Template & Module Overlay Contract

This document specifies the integration contract for consuming modular backends from `quickstart-openshift-modules` as drop-in overlays onto the canonical [`bcgov/quickstart-openshift`](https://github.com/bcgov/quickstart-openshift) repository scaffold.

---

## 1. Architecture & Overlay Mapping

In the `quickstart-openshift` ecosystem, repositories are structured with decoupled frontend and backend services:

```text
quickstart-openshift/
├── frontend/               # React / Vite frontend
├── backend/                # Application backend service
├── common/                 # Common OpenShift deployment manifests
├── migrations/             # Database migrations
└── docker-compose.yml      # Local development multi-container orchestration
```

Modules in this repository provide alternative, drop-in backend implementations:
* **`backend-java/`**: Quarkus Native (GraalVM) with Java 21 LTS bytecode, embedded Flyway migrations, and sub-second startup.
* **`backend-py/`**: FastAPI with Python 3.14, SQLAlchemy, and automated model generation.

When a module is selected, its directory maps directly to the root `backend/` directory of the target project:
$$\text{quickstart-openshift-modules/backend-java/} \longrightarrow \text{<target-repo>/backend/}$$

---

## 2. Backstage Software Template Workflow

Backstage software templates use built-in actions (`fetch:plain`, `fs:delete`) to scaffold the base repository and stamp the chosen backend module over it.

### Canonical Backstage Template Definition (`template.yaml`)

```yaml
apiVersion: scaffolder.backstage.io/v1beta3
kind: Template
metadata:
  name: quickstart-openshift-quarkus
  title: QuickStart OpenShift (Quarkus Java Backend)
  description: Scaffold a QuickStart OpenShift application with a Quarkus Native Java backend.
spec:
  owner: group:forestry-suite
  type: service
  parameters:
    - title: Project Metadata
      required:
        - component_id
        - owner
      properties:
        component_id:
          title: Service Name
          type: string
          description: Unique name for your service and OpenShift resources.
        owner:
          title: GitHub Repository Owner
          type: string
          description: GitHub organization or user account where the repository will be created.

  steps:
    # 1. Fetch base quickstart repository scaffold
    - id: fetch-base
      name: Fetch QuickStart Base Scaffold
      action: fetch:plain
      input:
        url: https://github.com/bcgov/quickstart-openshift/tree/main
        targetPath: ./

    # 2. Purge default Node/NestJS backend implementation
    - id: purge-default-backend
      name: Remove Default Backend
      action: fs:delete
      input:
        files:
          - ./backend

    # 3. Overlay Quarkus Java module into ./backend
    - id: overlay-backend-java
      name: Overlay Quarkus Java Backend
      action: fetch:plain
      input:
        url: https://github.com/bcgov/quickstart-openshift-modules/tree/main/backend-java
        targetPath: ./backend

    # 4. Publish to GitHub
    - id: publish
      name: Publish Repository
      action: publish:github
      input:
        repoUrl: github.com?owner=${{ parameters.owner }}&repo=${{ parameters.component_id }}
        defaultBranch: main
```

---

## 3. Drop-in File & Interface Contract

To guarantee zero dangling files and seamless CI/CD pipeline execution in `quickstart-openshift`, each module adheres strictly to the following contract:

### A. File Taxonomy

When overlaid into `backend/`, the module provides:
* `Dockerfile`: Container image build instructions.
* `openshift.deploy.yml`: OpenShift deployment template.
* `src/`: Application source code.
* Runtime & build toolchain configuration (`pom.xml`, `.mvn/`, `mvnw` for Java; `pyproject.toml`, `uv.lock` for Python).
* `.dockerignore`: Build artifact exclusion rules.

### B. Container Image & Build Contract
* **Execution User:** Non-root (`USER 1001`).
* **Port Binding:** Must listen on port `3000` (`EXPOSE 3000`, `PORT=3000`).
* **Container Context:** Builds cleanly from the root of `backend/` (`docker build -f backend/Dockerfile backend/`).

### C. OpenShift Deployment Template Contract (`openshift.deploy.yml`)
The template must match the parameter conventions consumed by `bcgov/quickstart-openshift/.github/workflows/reusable-deploy.yml`:
* **Parameters:** `NAME`, `COMPONENT` (defaults to `backend`), `ZONE`, `IMAGE_TAG`, `REGISTRY`, `ORG_NAME`, `DOMAIN`, `CPU_REQUEST`, `MEMORY_REQUEST`, `MEMORY_LIMIT`, `LOG_LEVEL`.
* **Database Secret Binding:** Binds credentials from `${NAME}-${ZONE}-database`:
  * `database-name`
  * `database-user`
  * `database-password`
* **Probes:** Configures `startupProbe`, `readinessProbe`, and `livenessProbe` hitting port `3000` (`http`).

### D. Database Migrations
* **Quarkus Java (`backend-java`)**: Embeds Flyway database migrations inside the application binary. Migrations execute automatically upon application startup under the `java_api` schema. The standalone `migrations` container in `quickstart-openshift` is bypassed or retained for supplementary schemas.
* **FastAPI Python (`backend-py`)**: Includes `backend-py/db/migrations` run via Flyway under `py_api` schema.

---

## 4. Local Development (`docker-compose.yml`) Contract

To run the overlaid Java backend locally alongside PostgreSQL in a stamped `quickstart-openshift` project, update the `backend:` service in `docker-compose.yml`:

```yaml
  backend:
    container_name: backend
    working_dir: /project
    image: docker.io/library/eclipse-temurin:21-jdk
    entrypoint: ./mvnw quarkus:dev -Dquarkus.http.host=0.0.0.0
    volumes:
      - "./backend:/project"
    healthcheck:
      test: timeout 10s bash -c 'true > /dev/tcp/127.0.0.1/3000'
    environment:
      <<: *postgres-vars
      QUARKUS_DATASOURCE_DEVSERVICES_ENABLED: "false"
      QUARKUS_DATASOURCE_JDBC_URL: jdbc:postgresql://database:5432/postgres
      QUARKUS_DATASOURCE_USERNAME: *POSTGRES_USER
      QUARKUS_DATASOURCE_PASSWORD: *POSTGRES_PASSWORD
    ports: ["3001:3000"]
    depends_on:
      database:
        condition: service_healthy
```

* **Live Reloading:** Code modifications in `./backend/src` reload in real-time via Quarkus dev mode.
* **GraalVM Avoidance:** Local execution uses the Java 21 LTS JVM, eliminating the 5-minute AOT native compilation step during development.

---

## 5. Overlay Verification Procedure

To verify drop-in compatibility against a target repository:

```bash
# 1. Clone fresh quickstart-openshift and quickstart-openshift-modules
git clone https://github.com/bcgov/quickstart-openshift.git test-quickstart
git clone https://github.com/bcgov/quickstart-openshift-modules.git test-modules

# 2. Swap backend directory
rm -rf test-quickstart/backend
cp -r test-modules/backend-java test-quickstart/backend

# 3. Verify clean directory state (no dangling files)
ls -la test-quickstart/backend

# 4. Verify native container build
podman build -t test-backend-native test-quickstart/backend

# 5. Apply the Java backend Compose definition from Section 4 to test-quickstart/docker-compose.yml
# (Replace the default node backend service block with the Java service snippet)

# 6. Verify local compose configuration and start services
podman compose -f test-quickstart/docker-compose.yml config
podman compose -f test-quickstart/docker-compose.yml up -d backend database
curl -f http://localhost:3001/
```
