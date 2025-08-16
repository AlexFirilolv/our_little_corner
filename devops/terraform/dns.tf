    # dns.tf - Manages Route 53 DNS records

    variable "domain_name" {
      description = "The root domain name you are delegating (e.g., aws.yourdomain.com)"
      type        = string
    }

    # Create the Hosted Zone in Route 53 for your subdomain
    resource "aws_route53_zone" "subdomain" {
      name = var.domain_name
    }

    # Create an 'A' record that points your environment's URL to the ALB
    # e.g., dev.aws.yourdomain.com -> ALB
    resource "aws_route53_record" "app" {
      zone_id = aws_route53_zone.subdomain.zone_id
      name    = "${terraform.workspace}.${var.domain_name}"
      type    = "A"

      # Alias records are a special AWS type that are free and update automatically
      alias {
        name                   = aws_lb.app.dns_name
        zone_id                = aws_lb.app.zone_id
        evaluate_target_health = true
      }
    }

    # This output will show you the AWS nameservers you need to add in Cloudflare
    output "route53_name_servers" {
      description = "Name servers to delegate from your domain registrar (e.g., Cloudflare)"
      value       = aws_route53_zone.subdomain.name_servers
    }
    
