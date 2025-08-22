# DevOps Setup for Our Little Corner

This directory contains the infrastructure as code and deployment automation for the Our Little Corner application.

## Architecture Overview

- **Terraform**: Infrastructure as Code for AWS resources
- **GitHub Actions**: CI/CD pipeline for automated deployments
- **Docker**: Containerized application
- **AWS ECR**: Container registry
- **AWS EC2**: Application hosting
- **Multi-environment**: Support for dev, stage, and prod environments

## Prerequisites

1. AWS CLI configured with appropriate permissions
2. Terraform >= 1.0 installed
3. GitHub repository with required secrets configured

## GitHub Environments Setup

This deployment uses GitHub Environments for environment-specific secrets and variables. You need to create three environments in your GitHub repository:

1. Go to your repository on GitHub
2. Navigate to `Settings > Environments`
3. Create three environments: `DEV`, `STAGE`, and `PROD`

### Required Secrets per Environment

For each environment (`DEV`, `STAGE`, `PROD`), add these secrets:

#### AWS Credentials
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`

#### Firebase Configuration (for Docker builds)
- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`

> **Note**: Each environment should have its own Firebase project configuration if you're using separate Firebase projects for dev/stage/prod.

## Initial Setup

### 1. Bootstrap Terraform State Management

First, create the S3 bucket and DynamoDB table for Terraform state:

```bash
cd devops/terraform/bootstrap
terraform init
terraform apply
```

After bootstrap completes, copy the outputs and update the backend configuration in `infrastructure/provider.tf`.

### 2. Deploy Infrastructure

```bash
cd devops/terraform/infrastructure

# Initialize with remote state
terraform init

# Create and deploy to development environment
terraform workspace new dev
terraform plan -var-file="dev.tfvars"
terraform apply -var-file="dev.tfvars"

# For other environments
terraform workspace new stage
terraform apply -var-file="stage.tfvars"

terraform workspace new prod
terraform apply -var-file="prod.tfvars"
```

## Deployment Workflow

The GitHub Actions workflow (`.github/workflows/deploy.yml`) is **manual-only** and handles:

1. **Manual Environment Selection**: Choose `DEV`, `STAGE`, or `PROD` when triggering the workflow

2. **Environment-Specific Configuration**: Uses GitHub Environments to pull secrets and variables specific to the selected environment

3. **Docker Build**: Builds and pushes container images to ECR with proper tagging (`{environment}-{sha}`)

4. **Infrastructure Deployment**: Uses Terraform workspaces (`dev`, `stage`, `prod`) to deploy/update infrastructure

5. **Health Checks**: Validates deployment success with application health checks

## Environment Configuration

Each environment has its own `.tfvars` file with specific settings:

- **dev.tfvars**: Development environment (t3.micro, 10.0.0.0/16 VPC)
- **stage.tfvars**: Staging environment (t3.small, 10.1.0.0/16 VPC)  
- **prod.tfvars**: Production environment (t3.medium, 10.2.0.0/16 VPC)

## Manual Deployment

**All deployments are manual-only**. To trigger a deployment:

1. Go to GitHub Actions tab in your repository
2. Click on "Deploy to AWS" workflow
3. Click "Run workflow"
4. Choose your target environment (`DEV`, `STAGE`, or `PROD`)
5. Click "Run workflow"

The workflow will:
- Use the selected GitHub Environment for secrets/variables
- Create/select the appropriate Terraform workspace (`dev`, `stage`, `prod`)
- Build and tag the Docker image with `{environment}-{git-sha}`
- Deploy the infrastructure and application
- Run health checks to verify deployment success

## Infrastructure Resources

Each environment creates:

- **VPC** with public subnet and internet gateway
- **EC2 instance** running the containerized application
- **ECR repository** for Docker images
- **Security groups** allowing HTTP/HTTPS traffic
- **IAM roles** for EC2 to access ECR

## Accessing Deployed Application

After successful deployment, the application will be available at:
- `http://<instance-public-ip>`

The instance IP is output in the GitHub Actions summary and can also be found in the AWS console or via Terraform:

```bash
terraform workspace select <environment>
terraform output instance_public_ip
```

## Security Considerations

- EC2 instances use IAM roles instead of access keys
- EBS volumes are encrypted
- Security groups restrict access to necessary ports only
- S3 state bucket has versioning and encryption enabled
- No SSH access configured (use AWS Session Manager if needed)

## Monitoring and Troubleshooting

### Application Logs
```bash
# SSH into instance (if SSH access configured)
docker logs app-container

# Or use SSM Session Manager
aws ssm start-session --target <instance-id>
```

### Terraform State
```bash
# View current state
terraform show

# List resources
terraform state list

# Import existing resources if needed
terraform import aws_instance.app i-1234567890abcdef0
```

### GitHub Actions Logs
Check the Actions tab in your GitHub repository for detailed deployment logs.

## Scaling and Production Considerations

For production environments, consider:

1. **Load Balancer**: Add ALB for high availability
2. **Auto Scaling**: Use Auto Scaling Groups instead of single instances
3. **RDS**: Replace containerized PostgreSQL with managed RDS
4. **SSL/TLS**: Add HTTPS with ACM certificates
5. **Monitoring**: Add CloudWatch monitoring and alerting
6. **Backups**: Implement automated backup strategies
7. **CDN**: Add CloudFront for static assets

## Cost Optimization

- **Development**: Uses t3.micro instances (free tier eligible)
- **Staging**: Uses t3.small for realistic testing
- **Production**: Uses t3.medium for better performance
- All environments use pay-per-request DynamoDB billing
- ECR repositories are environment-specific to avoid conflicts

## Cleanup

To destroy an environment:

```bash
cd devops/terraform/infrastructure
terraform workspace select <environment>
terraform destroy -var-file="<environment>.tfvars"
```

To clean up bootstrap resources (do this last):
```bash
cd devops/terraform/bootstrap  
terraform destroy
```