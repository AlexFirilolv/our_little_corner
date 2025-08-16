    # security.tf - Updated for ALB architecture

    # Security group for the Application Load Balancer
    resource "aws_security_group" "alb_sg" {
      name        = "${terraform.workspace}-alb-sg"
      description = "Allow HTTP/HTTPS traffic to the ALB"
      vpc_id      = aws_vpc.main.id

      ingress {
        description = "HTTP from anywhere"
        from_port   = 80
        to_port     = 80
        protocol    = "tcp"
        cidr_blocks = ["0.0.0.0/0"]
      }

      ingress {
        description = "HTTPS from anywhere"
        from_port   = 443
        to_port     = 443
        protocol    = "tcp"
        cidr_blocks = ["0.0.0.0/0"]
      }

      egress {
        from_port   = 0
        to_port     = 0
        protocol    = "-1"
        cidr_blocks = ["0.0.0.0/0"]
      }

      tags = {
        Name = "${terraform.workspace}-alb-sg"
      }
    }

    # Security group for the EC2 instances
    resource "aws_security_group" "instance_sg" {
      name        = "${terraform.workspace}-instance-sg"
      description = "Allow traffic from ALB and SSH for EC2 Instance Connect"
      vpc_id      = aws_vpc.main.id

      # This is the key: only allow traffic on port 80 from the ALB's security group
      ingress {
        description     = "HTTP from ALB"
        from_port       = 80
        to_port         = 80
        protocol        = "tcp"
        security_groups = [aws_security_group.alb_sg.id]
      }
      
      # Egress to allow pulling images, updates, etc.
      egress {
        from_port   = 0
        to_port     = 0
        protocol    = "-1"
        cidr_blocks = ["0.0.0.0/0"]
      }

      tags = {
        Name = "${terraform.workspace}-instance-sg"
      }
    }
    
