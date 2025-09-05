terraform {
  required_providers {
    aws = {
      source = "hashicorp/aws"
    }
    proxmox = {
      source  = "Telmate/proxmox"
    }
  }
}

provider "aws" {
    region = var.aws.region
}
provider "proxmox" {
    pm_tls_insecure = true
    pm_api_url      = "https://10.100.102.220:8006/api2/json"
    pm_password     = var.pve.password
    pm_user         = var.pve.user
    pm_otp          = ""
}
