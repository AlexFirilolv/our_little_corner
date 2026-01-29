module "project-factory" {
  source  = "terraform-google-modules/project-factory/google"
  version = "~> 18.2"

  name                 = "twofold"
  random_project_id    = true
  org_id               = var.org_id
  billing_account      = var.billing_account
  create_project_sa    = false
  default_service_account = "delete"
}