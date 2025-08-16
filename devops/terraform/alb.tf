# alb.tf - Defines the Application Load Balancer and its components

# --- ALB Target Group ---
# This group defines where the ALB will send traffic (i.e., our EC2 instances).
# It also includes the health check configuration.

resource "aws_lb_target_group" "app" {
  name_prefix = "${terraform.workspace}-app-tg-"
  port        = 80
  protocol    = "HTTP"
  vpc_id      = aws_vpc.main.id

  # Health check settings: The ALB will ping this path to see if an instance is healthy.
  # If it gets a 200 OK response, the instance is considered healthy.
  health_check {
    path                = "/" # Your Next.js app should return 200 OK on the root path
    protocol            = "HTTP"
    matcher             = "200"
    interval            = 30
    timeout             = 5
    healthy_threshold   = 2
    unhealthy_threshold = 2
  }

  lifecycle {
    create_before_destroy = true
  }

  tags = {
    Name = "${terraform.workspace}-app-target-group"
  }
}


# --- Application Load Balancer (ALB) ---
# The main load balancer resource.

resource "aws_lb" "app" {
  name               = "${terraform.workspace}-app-lb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb_sg.id] # We'll create this new SG next
  subnets            = [aws_subnet.public.id]       # For HA, you'd list subnets in multiple AZs

  enable_deletion_protection = false # Set to true for production environments

  tags = {
    Name = "${terraform.workspace}-app-load-balancer"
  }
}


# --- ALB Listener ---
# This tells the load balancer what to do with incoming traffic.
# We'll start with an HTTP listener on port 80.

resource "aws_lb_listener" "http" {
  load_balancer_arn = aws_lb.app.arn
  port              = 80
  protocol          = "HTTP"

  # The default action is to forward traffic to our target group.
  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.app.arn
  }
}

# --- Note on HTTPS ---
# To enable HTTPS on port 443, you would:
# 1. Create an ACM certificate for your domain.
# 2. Create a new "aws_lb_listener" resource for port 443.
# 3. Set its protocol to "HTTPS" and reference the ACM certificate's ARN.
# 4. Change the default_action to forward to the same target group.
# 5. Optionally, change this HTTP listener's action to redirect to HTTPS.


