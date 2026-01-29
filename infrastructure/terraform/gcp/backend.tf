terraform {
  backend "gcs" {
    bucket  = "firilov-tfstate-8774"
    prefix  = "terraform/state/twofold"
    impersonate_service_account = "org-terraform@firilov-seed-b185.iam.gserviceaccount.com"
  }
}