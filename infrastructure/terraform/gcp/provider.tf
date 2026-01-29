terraform {
  required_providers {
    google = {
      source = "hashicorp/google"
      version = "7.17.0"
    }
  }
}

locals {
 terraform_service_account = "org-terraform@firilov-seed-b185.iam.gserviceaccount.com"
}

provider "google" {
 alias = "impersonation"
 scopes = [
   "https://www.googleapis.com/auth/cloud-platform",
   "https://www.googleapis.com/auth/userinfo.email",
 ]
}

data "google_service_account_access_token" "default" {
 provider               	= google.impersonation
 target_service_account 	= local.terraform_service_account
 scopes                 	= ["userinfo-email", "cloud-platform"]
 lifetime               	= "3600s"
}

provider "google" {
 project 		= "firilov-seed-b185"
 access_token	= data.google_service_account_access_token.default.access_token
 request_timeout 	= "60s"
}