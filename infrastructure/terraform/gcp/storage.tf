module "gcs_buckets" {
  source  = "terraform-google-modules/cloud-storage/google"
  version = "~> 12.3"
  project_id  = module.project-factory.project_id
  names = ["twofold-media-storage"]
}