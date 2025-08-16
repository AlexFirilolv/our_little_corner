# ec2.tf - Modern Architecture with ALB and Auto Scaling Group

# --- Data Sources ---

# Find the latest Ubuntu 24.04 LTS AMI for our region
data "aws_ami" "ubuntu" {
  most_recent = true
  owners      = ["099720109477"] # Canonical's official account ID

  filter {
    name   = "name"
    values = ["ubuntu/images/hvm-ssd/ubuntu-noble-24.04-amd64-server-*"]
  }

  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }
}

# Get the current AWS Account ID for use in ARNs and repository URLs
data "aws_caller_identity" "current" {}


# --- IAM for EC2 Instances ---

# Define the IAM role that our EC2 instances will assume
resource "aws_iam_role" "instance_role" {
  name = "${terraform.workspace}-ec2-instance-role"

  # Trust policy allowing EC2 instances to assume this role
  assume_role_policy = jsonencode({
    Version = "2012-10-17",
    Statement = [
      {
        Action = "sts:AssumeRole",
        Effect = "Allow",
        Principal = {
          Service = "ec2.amazonaws.com"
        }
      }
    ]
  })

  tags = {
    Name = "${terraform.workspace}-ec2-instance-role"
  }
}

# Attach the AWS-managed policy that allows instances to pull images from ECR
resource "aws_iam_role_policy_attachment" "ecr_readonly" {
  role       = aws_iam_role.instance_role.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryReadOnly"
}

# Attach the AWS-managed policy required for SSM to function correctly
resource "aws_iam_role_policy_attachment" "ssm_managed_instance" {
  role       = aws_iam_role.instance_role.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"
}

# Create an instance profile to pass the role to the EC2 instances
resource "aws_iam_instance_profile" "instance_profile" {
  name = "${terraform.workspace}-ec2-instance-profile"
  role = aws_iam_role.instance_role.name
}


# --- Launch Template ---
# This defines the configuration for instances launched by the Auto Scaling Group.
# The key is that we can create a new version of this template for each deployment.

resource "aws_launch_template" "app" {
  name_prefix   = "${terraform.workspace}-app-"
  image_id      = data.aws_ami.ubuntu.id
  instance_type = var.instance_type

  # Pass the IAM role to the instances
  iam_instance_profile {
    name = aws_iam_instance_profile.instance_profile.name
  }

  # Define the network configuration
  network_interfaces {
    associate_public_ip_address = true
    security_groups             = [aws_security_group.instance_sg.id]
  }

  # Define the root EBS volume configuration
  block_device_mappings {
    device_name = "/dev/sda1"
    ebs {
      volume_size = 20
      volume_type = "gp3"
      encrypted   = true # Always encrypt production data
    }
  }

  # User data script to bootstrap the instance
  # It pulls a specific image tag, which will be updated on each deployment
  user_data = base64encode(templatefile("${path.module}/user_data.sh.tpl", {
    aws_region       = var.aws_region
    ecr_repo_url     = aws_ecr_repository.app.repository_url
    # We will use the git commit SHA as the image tag for precise deployments
    image_tag        = "latest" # This will be updated by the CI/CD pipeline
    aws_account_id   = data.aws_caller_identity.current.account_id
  }))

  # Tagging for the launch template itself
  tag_specifications {
    resource_type = "instance"
    tags = {
      Name        = "${terraform.workspace}-app-server"
      Environment = terraform.workspace
    }
  }

  lifecycle {
    create_before_destroy = true
  }
}


# --- Auto Scaling Group (ASG) ---
# This manages the lifecycle of our EC2 instances, ensuring the desired number are running.

resource "aws_autoscaling_group" "app" {
  name_prefix = "${terraform.workspace}-asg-"
  desired_capacity = 1 # Start with one instance
  max_size         = 2 # Allow scaling up to two
  min_size         = 1 # Always have at least one

  # Use all public subnets for high availability
  vpc_zone_identifier = [aws_subnet.public.id] # For multi-AZ, you'd list multiple subnet IDs

  # Link to the Launch Template
  launch_template {
    id      = aws_launch_template.app.id
    version = "$Latest" # Always use the latest version of the template
  }

  # Attach to the Load Balancer's Target Group
  target_group_arns = [aws_lb_target_group.app.arn]

  # Health check configuration
  health_check_type         = "ELB"
  health_check_grace_period = 300 # Give instances 5 minutes to start up before health checks begin

  # Configuration for rolling updates
  instance_refresh {
    strategy = "Rolling"
    preferences {
      min_healthy_percentage = 50 # During an update, ensure at least 50% of the fleet is healthy
    }
  }

  tags = [
    {
      key                 = "Name"
      value               = "${terraform.workspace}-app-server"
      propagate_at_launch = true
    },
    {
      key                 = "Environment"
      value               = terraform.workspace
      propagate_at_launch = true
    }
  ]
}


