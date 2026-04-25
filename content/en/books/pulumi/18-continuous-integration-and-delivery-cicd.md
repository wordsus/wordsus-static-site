Deploying infrastructure from a local machine is fine for prototyping, but introduces critical risks in production. Manual deployments lack auditability, encourage state drift, and require developers to hold highly privileged cloud access. 

To mature your operations, you must treat infrastructure code exactly like application code by adopting Continuous Integration and Continuous Delivery (CI/CD). This chapter explores how to automate your Pulumi workflows across popular platforms, enforce policy checks, surface infrastructure previews directly within Pull Requests, and establish version control as the absolute source of truth for your cloud environments.

## 18.1 Principles of Infrastructure CI/CD

While Continuous Integration and Continuous Deployment (CI/CD) have been staples of application development for years, applying these practices to infrastructure introduces unique challenges. Application deployments typically involve pushing a stateless artifact to a server. Infrastructure deployments, however, are inherently stateful. A misconfigured pipeline step can accidentally delete databases, sever network routes, or expose sensitive environments to the public internet. 

When building CI/CD pipelines for Pulumi, you must adopt principles that respect the "blast radius" of infrastructure changes while maintaining the agility of automated deployments.

### 1. Version Control as the Absolute Source of Truth

In an automated infrastructure paradigm, human operators should rarely, if ever, run `pulumi up` from their local machines against staging or production environments. Git (or your chosen VCS) must become the single source of truth and the sole trigger for infrastructure mutations. 

* **Immutability of State:** If an operation is not reflected in the `main` branch, it does not exist in production. 
* **Auditability:** By forcing all changes through Pull Requests (PRs), every infrastructure modification is tied to a specific commit, author, and peer review.
* **Drift Prevention:** Relying on automated pipelines ensures that the deployed infrastructure perfectly mirrors the code repository, reducing the likelihood of manual state drift (a topic we will explore further in Chapter 20).

### 2. Mandatory Previews Before Execution

The most critical principle in Pulumi CI/CD is the separation of the *planning* phase from the *execution* phase. Because Pulumi is an engine that calculates a desired state against a current state, you must expose this calculation to developers before changes are applied.

Whenever a developer opens a Pull Request, the CI pipeline should automatically run `pulumi preview`. The results of this preview—detailing exactly which resources will be created, updated, or deleted—must be surfaced directly in the PR interface. This grants reviewers the confidence to approve changes, knowing exactly what the impact will be.

```text
+---------------------------------------------------------+
| GitHub / GitLab / Bitbucket Pull Request                |
+---------------------------------------------------------+
| User: alice-dev                                         |
| Title: Add secondary read replica to user database      |
+---------------------------------------------------------+
| CI Bot Comment:                                         |
| ⚙️ Pulumi Preview Results (Stack: prod-db)               |
|                                                         |
|     Type                 Name            Plan           |
| +   aws:rds:Instance     db-replica-1    create         |
| ~   aws:route53:Record   db-endpoint     update         |
|                                                         |
| Resources: 1 to create, 1 to update, 6 unchanged.       |
+---------------------------------------------------------+
```

### 3. Ephemeral Environments for Integration Testing

As covered in Chapter 17, unit tests can only validate logic, not provider behavior. A robust infrastructure pipeline leverages Pulumi's ability to easily spin up and tear down stacks to create ephemeral, on-demand environments.

When a feature branch introduces complex architectural changes, the CI pipeline can:
1. Create a dynamic stack (e.g., `feature-branch-abc`).
2. Run `pulumi up` to provision the isolated infrastructure.
3. Execute integration tests against the live resources.
4. Run `pulumi destroy` and `pulumi stack rm` to clean up the environment, regardless of test success or failure.

This principle ensures that infrastructure code is genuinely tested against the cloud provider before it ever reaches a persistent environment like Staging or Production.

### 4. Least Privilege and Identity Federation (OIDC)

Pipelines require credentials to authenticate with your cloud provider (AWS, Azure, GCP) and the Pulumi backend. Historically, this meant injecting long-lived, highly privileged API keys into CI/CD secrets. 

A modern principle of infrastructure CI/CD is moving away from static credentials toward **OpenID Connect (OIDC)**. OIDC allows your CI/CD runner (e.g., GitHub Actions, GitLab CI) to request short-lived, temporary access tokens from the cloud provider based on the repository and branch name.

By combining OIDC with strict Role-Based Access Control (RBAC), you ensure that:
* A pipeline running on a feature branch might only have permissions to run `pulumi preview` (Read-Only access to the cloud provider).
* A pipeline running on the `main` branch can run `pulumi up` (Write access), but only scoped to specific resource groups or regions.

### 5. The Infrastructure CI/CD Workflow Model

Bringing these principles together results in a distinct, multi-stage workflow. Below is a conceptual diagram of a mature Pulumi CI/CD pipeline:

```text
                           [Developer Workstation]
                                      |
                                      v (git push)
                        [Feature Branch: add-redis-cache]
                                      |
  +-----------------------------------+-----------------------------------+
  | CI Pipeline (Pull Request)                                            |
  |                                                                       |
  |  1. Format & Lint: Verify code style (e.g., Prettier, ESLint).        |
  |  2. Unit Tests: Run fast, mocked tests (Chapter 17).                  |
  |  3. Policy Check: Run CrossGuard to verify compliance (Chapter 15).   |
  |  4. Preview: Run `pulumi preview` and post the diff to the PR.        |
  +-----------------------------------+-----------------------------------+
                                      |
                                      v (Peer Review & Merge)
                              [Main/Trunk Branch]
                                      |
  +-----------------------------------+-----------------------------------+
  | CD Pipeline (Deployment)                                              |
  |                                                                       |
  |  1. Staging Deploy: `pulumi up --stack staging --yes`                 |
  |  2. Smoke Tests: Verify staging endpoints and health checks.          |
  |  3. Production Approval: Manual gate (Optional but recommended).      |
  |  4. Production Deploy: `pulumi up --stack production --yes`           |
  +-----------------------------------+-----------------------------------+
```

By adhering to these principles, you transform infrastructure from a fragile, manually managed set of scripts into a resilient, automated software product. In the following sections, we will map these principles to specific implementations using popular CI/CD platforms.

## 18.2 Using the Pulumi GitHub App and Actions

For organizations utilizing GitHub as their version control system, integrating Pulumi directly into GitHub workflows provides a seamless, developer-native infrastructure experience. By combining the **Pulumi GitHub App** with **GitHub Actions**, you can fully automate the principles discussed in the previous section: enforcing previews on Pull Requests, maintaining immutable state through branch merges, and leveraging OIDC for secure deployments.

### The Pulumi GitHub App

While GitHub Actions executes the code, the Pulumi GitHub App handles the communication between the Pulumi Service and your GitHub repository. Its primary responsibility is to enrich the Pull Request experience. 

When a CI pipeline runs a `pulumi preview`, the Pulumi Service captures the output. The GitHub App then takes this output and posts it as a highly readable, inline comment directly within the PR. This surfaces the infrastructure diff to reviewers without requiring them to parse raw CI logs or navigate to the Pulumi Console. 

To enable this, the App must be installed on your GitHub organization or repository, and your GitHub Actions workflow must pass a `GITHUB_TOKEN` to the Pulumi CLI.

### Architectural Flow: GitHub, OIDC, and Pulumi

Before writing the workflow code, it is crucial to understand how authentication flows between GitHub, your cloud provider, and Pulumi. Hardcoding long-lived cloud credentials (like AWS Access Keys) into GitHub Secrets is an outdated practice. Instead, you should configure OpenID Connect (OIDC).

```text
  [GitHub Repo] ------------(PR Opened)------------> [GitHub Actions Runner]
                                                                |
                                                                | 1. Requests OIDC Token
                                                                v
                                                       [Cloud Identity Provider]
                                                       (e.g., AWS IAM OIDC Provider)
                                                                |
                                                                | 2. Returns Temp Credentials
                                                                v
  [Pulumi Service] <------- 3. Reads/Locks State ------- [GitHub Actions Runner]
                                                                |
                                                                | 4. Calculates Diff
                                                                v
  [GitHub PR UI] <--------- 5. Posts PR Comment -------- [Pulumi Service App]
```

### Building the GitHub Actions Workflow

Pulumi maintains an official GitHub Action (`pulumi/actions`) that simplifies the execution of Pulumi commands within a workflow. 

Below is a complete, production-ready example of a `.github/workflows/infrastructure.yml` file. This workflow assumes we are deploying to AWS using OIDC for cloud authentication and the Pulumi Service for state management.

```yaml
name: Pulumi Infrastructure CI/CD

on:
  pull_request:
    branches:
      - main
  push:
    branches:
      - main

permissions:
  id-token: write # Required for requesting the OIDC JWT
  contents: read  # Required to checkout the repository code
  pull-requests: write # Required for the Pulumi App to post PR comments

env:
  PULUMI_ACCESS_TOKEN: ${{ secrets.PULUMI_ACCESS_TOKEN }}
  AWS_REGION: "us-east-1"

jobs:
  infrastructure:
    name: Provision Infrastructure
    runs-on: ubuntu-latest
    steps:
      - name: Checkout Repository
        uses: actions/checkout@v4

      - name: Configure AWS Credentials via OIDC
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: arn:aws:iam::123456789012:role/GitHubActionsPulumiRole
          aws-region: ${{ env.AWS_REGION }}

      - name: Setup Node.js (If using TypeScript)
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          
      - name: Install Dependencies
        run: npm ci
        working-directory: ./infrastructure

      # Step executed ONLY on Pull Requests
      - name: Pulumi Preview
        uses: pulumi/actions@v5
        if: github.event_name == 'pull_request'
        with:
          command: preview
          stack-name: my-org/prod
          work-dir: ./infrastructure
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}

      # Step executed ONLY on Merges to Main
      - name: Pulumi Up
        uses: pulumi/actions@v5
        if: github.event_name == 'push' && github.ref == 'refs/heads/main'
        with:
          command: up
          stack-name: my-org/prod
          work-dir: ./infrastructure
```

### Breaking Down the Workflow

1. **Granular Permissions:** The `permissions` block is critical. `id-token: write` tells GitHub to allow the runner to request the OIDC token required by the AWS configure action. `pull-requests: write` is necessary for the Pulumi GitHub App to leave comments on the PR.
2. **OIDC Assumption:** The `configure-aws-credentials` step exchanges the GitHub token for short-lived AWS credentials. Pulumi will automatically detect these credentials in the runner's environment variables.
3. **Conditional Execution:** We use GitHub Actions' `if` conditionals to enforce our infrastructure principles. The `pulumi preview` step *only* runs when a Pull Request is opened or updated. The `pulumi up` step *only* runs when code is successfully merged to the `main` branch.
4. **The `GITHUB_TOKEN` Variable:** Passing `GITHUB_TOKEN` into the `pulumi preview` step is what triggers the Pulumi Service to push the formatted diff back to the GitHub PR interface.

By structuring your pipeline this way, you create an auditable, secure, and developer-friendly guardrail around your infrastructure changes. The PR becomes the central hub for reviewing not just application code, but the resulting infrastructure state.

## 18.3 GitLab CI and Bitbucket Pipelines Integration

While GitHub Actions provides a tight integration with the Pulumi App, many enterprise organizations rely on GitLab CI or Bitbucket Pipelines as their primary CI/CD platforms. The foundational principles of infrastructure CI/CD—mandatory previews, ephemeral testing, and OIDC authentication—apply universally, regardless of the platform.

The primary difference when moving to GitLab or Bitbucket is the execution environment. Both platforms lean heavily on containerized execution. Therefore, instead of relying on a marketplace plugin (like a GitHub Action), you will typically use the official Pulumi Docker image (`pulumi/pulumi`) to execute commands within your pipelines.

### GitLab CI/CD: Merging Infrastructure with `.gitlab-ci.yml`

GitLab CI excels at defining explicit, multi-stage pipelines. To integrate Pulumi, we define stages for planning (previewing) and applying (deploying) infrastructure.

To replicate the rich Merge Request (MR) experience found in GitHub, you must connect your GitLab organization to the Pulumi Service via the Pulumi Console (Settings > Integrations > GitLab). Once connected, the Pulumi Service will automatically detect when a preview is run within a GitLab CI job and post the diff as a comment on the associated Merge Request.

#### OIDC in GitLab CI

GitLab uses the `id_tokens` keyword to generate an OpenID Connect token that can be exchanged for cloud credentials. Here is a production-ready `.gitlab-ci.yml` demonstrating a deployment to AWS:

```yaml
stages:
  - preview
  - deploy

variables:
  AWS_REGION: "us-east-1"
  PULUMI_STACK: "my-org/prod"
  PULUMI_WORKDIR: "./infrastructure"

# Base configuration for Pulumi jobs
.pulumi_base:
  image: pulumi/pulumi:latest
  before_script:
    - cd $PULUMI_WORKDIR
    - npm ci

preview_infrastructure:
  extends: .pulumi_base
  stage: preview
  # Only run on Merge Requests
  rules:
    - if: $CI_PIPELINE_SOURCE == "merge_request_event"
  id_tokens:
    GITLAB_OIDC_TOKEN:
      aud: sts.amazonaws.com
  script:
    # Exchange GitLab OIDC token for AWS Credentials
    - >
      STS_RESPONSE=$(aws sts assume-role-with-web-identity
      --role-arn arn:aws:iam::123456789012:role/GitLabPulumiRole
      --role-session-name gitlab-pulumi-session
      --web-identity-token $GITLAB_OIDC_TOKEN
      --query 'Credentials.[AccessKeyId,SecretAccessKey,SessionToken]'
      --output text)
    - export AWS_ACCESS_KEY_ID=$(echo $STS_RESPONSE | awk '{print $1}')
    - export AWS_SECRET_ACCESS_KEY=$(echo $STS_RESPONSE | awk '{print $2}')
    - export AWS_SESSION_TOKEN=$(echo $STS_RESPONSE | awk '{print $3}')
    
    # Run the preview
    - pulumi preview --stack $PULUMI_STACK

deploy_infrastructure:
  extends: .pulumi_base
  stage: deploy
  # Only run on the default branch (e.g., main)
  rules:
    - if: $CI_COMMIT_BRANCH == $CI_DEFAULT_BRANCH
  id_tokens:
    GITLAB_OIDC_TOKEN:
      aud: sts.amazonaws.com
  script:
    - >
      STS_RESPONSE=$(aws sts assume-role-with-web-identity
      --role-arn arn:aws:iam::123456789012:role/GitLabPulumiRole
      --role-session-name gitlab-pulumi-session
      --web-identity-token $GITLAB_OIDC_TOKEN
      --query 'Credentials.[AccessKeyId,SecretAccessKey,SessionToken]'
      --output text)
    - export AWS_ACCESS_KEY_ID=$(echo $STS_RESPONSE | awk '{print $1}')
    - export AWS_SECRET_ACCESS_KEY=$(echo $STS_RESPONSE | awk '{print $2}')
    - export AWS_SESSION_TOKEN=$(echo $STS_RESPONSE | awk '{print $3}')
    
    # Run the deployment non-interactively
    - pulumi up --stack $PULUMI_STACK --yes
```

### Bitbucket Pipelines: `bitbucket-pipelines.yml`

Bitbucket Pipelines uses a slightly different execution model, relying on explicit pipeline definitions for branches and pull requests. Bitbucket also provides native "Pipes" (similar to GitHub Actions), but many teams prefer executing the Pulumi CLI directly via the official Docker image for maximum control.

To enable Pull Request comments in Bitbucket, you configure the Bitbucket integration within the Pulumi Console. 

#### OIDC in Bitbucket Pipelines

Bitbucket simplifies OIDC token generation by allowing you to add `oidc: true` to a step. Bitbucket automatically injects a `$BITBUCKET_STEP_OIDC_TOKEN` environment variable that you can exchange with your cloud provider.

Below is an example `bitbucket-pipelines.yml` demonstrating how to handle previews on PRs and deployments on the `main` branch:

```yaml
image: pulumi/pulumi:latest

clone:
  depth: full

definitions:
  steps:
    - step: &preview-step
        name: Pulumi Preview
        oidc: true
        script:
          - cd infrastructure
          - npm ci
          # Assume AWS Role via Bitbucket OIDC token
          - export AWS_WEB_IDENTITY_TOKEN_FILE=$(mktemp)
          - echo "$BITBUCKET_STEP_OIDC_TOKEN" > "$AWS_WEB_IDENTITY_TOKEN_FILE"
          - export AWS_ROLE_ARN="arn:aws:iam::123456789012:role/BitbucketPulumiRole"
          - export AWS_DEFAULT_REGION="us-east-1"
          # Run Preview
          - pulumi preview --stack my-org/prod

    - step: &deploy-step
        name: Pulumi Up
        oidc: true
        script:
          - cd infrastructure
          - npm ci
          - export AWS_WEB_IDENTITY_TOKEN_FILE=$(mktemp)
          - echo "$BITBUCKET_STEP_OIDC_TOKEN" > "$AWS_WEB_IDENTITY_TOKEN_FILE"
          - export AWS_ROLE_ARN="arn:aws:iam::123456789012:role/BitbucketPulumiRole"
          - export AWS_DEFAULT_REGION="us-east-1"
          # Run Deployment
          - pulumi up --stack my-org/prod --yes

pipelines:
  pull-requests:
    '**':
      - step: *preview-step

  branches:
    main:
      - step: *deploy-step
```

### Managing State Lock Interruptions in CI

A common issue in containerized CI/CD environments like GitLab and Bitbucket is sudden runner termination. If a CI job is canceled manually by a user or preempted by the runner infrastructure while `pulumi up` is executing, the Pulumi state file may remain locked.

```text
+----------------------+       +----------------------+       +----------------------+
| GitLab CI Runner     |       | Pulumi Service       |       | Cloud Provider (AWS) |
+----------------------+       +----------------------+       +----------------------+
| 1. Starts deployment | ----> | 2. Acquires Lock     | ----> | 3. Provisions EC2    |
| 4. JOB CANCELED!     | -X    |                      |       |                      |
+----------------------+       | 5. Lock remains open |       |                      |
                               +----------------------+       +----------------------+
```

When this happens, subsequent pipeline runs will fail with a `conflict: Another update is currently in progress` error.

**Best Practices for Mitigation:**
1. **Pipeline Timeouts:** Set reasonable timeouts on your CI jobs to prevent hanging deployments, but ensure they are long enough to complete heavy resource creation (like databases or Kubernetes clusters).
2. **Handling Cancellations:** Educate your team *not* to cancel infrastructure pipelines mid-flight unless absolutely necessary.
3. **Manual Resolution:** If a lock is orphaned, a human operator with sufficient permissions must run `pulumi cancel` to interrupt the update, followed by inspecting the state for drift, before the pipeline can be unblocked. (State recovery is covered extensively in Chapter 5).

## 18.4 Handling Previews in Pull Requests

The Pull Request (PR) or Merge Request (MR) has evolved beyond a simple code review mechanism; it is now the primary control plane for modern infrastructure operations. By embedding infrastructure previews directly into the PR workflow, you shift the "dry run" phase of deployment left, allowing peers to review the *impact* of the code alongside the code itself.

Handling these previews effectively, however, requires more than simply running a command and dumping the standard output into a console log. It requires surfacing actionable information, managing CI noise, and strictly controlling permissions.

### The Anatomy of an Actionable Preview

When a developer opens a PR that modifies infrastructure, the resulting comment posted by the CI system must be immediately comprehensible. A raw, unformatted Pulumi log containing hundreds of lines of diagnostic information is often ignored.

An effective PR preview comment should contain:
1. **The Summary:** A high-level count of resources to be created, updated, deleted, or left unchanged.
2. **The Diff:** A clear, color-coded (or symbol-coded) list of the specific resources undergoing mutation.
3. **Policy Results:** If using CrossGuard (Policy as Code), a clear pass/fail status of the policy checks.
4. **Deep Links:** A link back to the Pulumi Console (if using the Pulumi Service) for detailed, property-level diffs.

### Method 1: Utilizing the Pulumi Service Integrations

As touched upon in previous sections, the most frictionless way to handle previews is leveraging the Pulumi Service's native VCS integrations (GitHub App, GitLab integration, Bitbucket App). 

When these integrations are active, the Pulumi CLI detects the CI environment variables (e.g., `GITHUB_PR_NUMBER`). The Pulumi Service intercepts the preview data and automatically constructs and posts a highly formatted comment to the PR. 

**Managing Comment Spam:**
A major advantage of native integrations is stateful comment management. If a developer pushes five sequential commits to a PR to fix a failing test, the Pulumi integration will not post five separate preview comments. Instead, it intelligently *updates* the existing comment or hides previous ones, keeping the PR timeline clean and focused on the latest state.

### Method 2: Custom JSON Parsing (Air-Gapped or Self-Managed Backends)

If you are using a self-managed backend (e.g., an S3 bucket) or operating in an air-gapped environment where the Pulumi VCS apps cannot reach your repository, you must handle the preview outputs manually.

Pulumi provides a powerful mechanism for this: the `--json` flag. By running `pulumi preview --json`, the engine outputs a structured, machine-readable representation of the plan instead of human-readable text.

You can use tools like `jq` to parse this output and construct custom PR comments using your VCS provider's CLI (e.g., the GitHub CLI `gh`).

**Example: Extracting the Summary using `jq`**

```bash
# 1. Run the preview and capture the JSON output
pulumi preview --stack prod-network --json > preview.json

# 2. Extract the summary counts using jq
CREATE_COUNT=$(jq '.steps[] | select(.op == "create")' preview.json | jq -s 'length')
UPDATE_COUNT=$(jq '.steps[] | select(.op == "update")' preview.json | jq -s 'length')
DELETE_COUNT=$(jq '.steps[] | select(.op == "delete")' preview.json | jq -s 'length')

# 3. Format a markdown comment
COMMENT_BODY="### ⚙️ Infrastructure Preview
**Stack:** \`prod-network\`
* 🟢 **Create:** $CREATE_COUNT
* 🟡 **Update:** $UPDATE_COUNT
* 🔴 **Delete:** $DELETE_COUNT"

# 4. Post the comment to the PR (using GitHub CLI as an example)
gh pr comment $PR_NUMBER --body "$COMMENT_BODY"
```

This approach allows platform engineering teams to build highly customized internal developer platforms (IDPs) and tightly control the formatting of infrastructure data.

### Security Posture: Scoping Permissions for Previews

A critical security principle in CI/CD is the Principle of Least Privilege. A pipeline running on a feature branch (which triggered the PR) should *never* have the permissions required to modify production infrastructure. 

Because `pulumi preview` only reads state and calculates a diff against the cloud provider's API, it requires significantly fewer permissions than `pulumi up`.

```text
+-----------------------+      +-------------------------+      +-------------------------+
| Feature Branch (PR)   |      | Default Branch (Main)   |      | Developer Workstation   |
+-----------------------+      +-------------------------+      +-------------------------+
| Action: preview       |      | Action: up              |      | Action: code            |
| Credentials:          |      | Credentials:            |      | Credentials:            |
| - AWS ReadOnlyAccess  |      | - AWS Administrator     |      | - None (or Dev Sandbox) |
| - Pulumi State Read   |      | - Pulumi State Write    |      | - Pulumi State Read     |
+-----------------------+      +-------------------------+      +-------------------------+
```

**Implementing Read-Only Previews:**
1. **Cloud Provider:** Create a dedicated IAM Role (e.g., `PulumiPreviewRole`) that only possesses `ReadOnlyAccess` or specifically scoped `List` and `Get` permissions for the resources managed by the stack. Bind your CI system's OIDC token to this role during the PR phase.
2. **Pulumi Service:** If using Pulumi Teams or Enterprise, utilize Stack Permissions to grant the CI token `Read` access to the stack during the preview phase, ensuring it cannot accidentally execute an update or alter the state file.

### Integrating Policy as Code (CrossGuard)

Handling previews effectively also means catching compliance and security violations *before* the code is merged. Previews should be gated by Policy as Code.

If a developer attempts to provision an unencrypted S3 bucket or an overly permissive security group, the PR should not just show a preview—it should fail the CI check and explicitly block the merge.

**The PR Preview Lifecycle with Policy:**

```text
[Developer opens PR]
        |
        v
[CI Runner] ---> 1. Authenticate (Read-Only OIDC)
        |
        v
[Pulumi Engine] ---> 2. Download Policy Packs (CrossGuard)
        |
        v
[Pulumi Engine] ---> 3. Execute `pulumi preview`
        |
   +----+----+
   |         |
[Pass]     [Fail]
   |         |
   |         v
   |    [CI posts Policy Violation Comment]
   |    [CI marks PR Status as FAILED] ❌
   v
[CI posts Infrastructure Diff Comment]
[CI marks PR Status as SUCCESS] ✅
```

By failing the build during the preview phase, you prevent insecure infrastructure configurations from ever entering the `main` branch, turning the Pull Request into an automated security perimeter.