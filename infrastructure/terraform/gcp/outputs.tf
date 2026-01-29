output "project_id" {
  value       = module.project-factory.project_id
  description = "The ID of the created project."
}

output "bucket" {
  value = module.gcs_buckets.bucket
  description = "The name of the created bucket."
}