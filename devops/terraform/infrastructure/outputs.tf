output "vpc_id" {
  description = "The ID of the VPC"
  value       = aws_vpc.main.id
}

output "public_subnet_id" {
  description = "The ID of the public subnet"
  value       = aws_subnet.public.id
}

output "security_group_id" {
  description = "The ID of the security group"
  value       = aws_security_group.web.id
}

output "ec2_public_ip" {
  description = "The public IP of the EC2 instance"
  value       = aws_instance.main.public_ip
}

output "ec2_public_dns" {
  description = "The public DNS of the EC2 instance"
  value       = aws_instance.main.public_dns
}

output "key_pair_name" {
  description = "The name of the AWS key pair"
  value       = aws_key_pair.deployment_key.key_name
}

output "ecr_repository_url" {
  description = "The URL of the ECR repository"
  value       = aws_ecr_repository.app.repository_url
}

# RDS Outputs
output "rds_endpoint" {
  description = "The RDS instance endpoint"
  value       = aws_db_instance.postgres.endpoint
  sensitive   = false
}

output "rds_port" {
  description = "The RDS instance port"
  value       = aws_db_instance.postgres.port
}

output "rds_database_name" {
  description = "The name of the database"
  value       = aws_db_instance.postgres.db_name
}

output "rds_username" {
  description = "The master username for the database"
  value       = aws_db_instance.postgres.username
  sensitive   = false
}

output "database_url" {
  description = "The full PostgreSQL connection string"
  value       = "postgresql://${aws_db_instance.postgres.username}:[PASSWORD]@${aws_db_instance.postgres.endpoint}:${aws_db_instance.postgres.port}/${aws_db_instance.postgres.db_name}"
  sensitive   = false
}

output "secrets_manager_secret_name" {
  description = "Name of the Secrets Manager secret"
  value       = aws_secretsmanager_secret.db_credentials.name
}

# ECS Outputs
output "ecs_cluster_name" {
  description = "Name of the ECS cluster"
  value       = aws_ecs_cluster.main.name
}

output "ecs_service_name" {
  description = "Name of the ECS service"
  value       = aws_ecs_service.app.name
}

output "alb_dns_name" {
  description = "DNS name of the Application Load Balancer"
  value       = aws_lb.main.dns_name
}

output "app_secrets_name" {
  description = "Name of the application secrets in Secrets Manager"
  value       = aws_secretsmanager_secret.app_secrets.name
}