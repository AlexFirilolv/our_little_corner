output "project_id" {
  value       = module.project-factory.project_id
  description = "The ID of the created project."
}

output "bucket" {
  value       = module.gcs_buckets.bucket
  description = "The name of the created bucket."
}

output "bucket_name" {
  value       = module.gcs_buckets.name
  description = "The name of the GCS bucket for media storage."
}

# =============================================================================
# GCS Service Account Outputs (for K8s secrets)
# =============================================================================

output "gcs_service_account_email" {
  value       = google_service_account.gcs_media_sa.email
  description = "The email of the GCS service account (GCP_CLIENT_EMAIL)."
}

# Individual fields for direct use in K8s secrets
output "gcp_project_id" {
  value       = module.project-factory.project_id
  description = "GCP Project ID for K8s secret (GCP_PROJECT_ID)."
}

output "gcp_client_email" {
  value       = google_service_account.gcs_media_sa.email
  description = "Service account email for K8s secret (GCP_CLIENT_EMAIL)."
}

output "gcs_bucket_name" {
  value       = module.gcs_buckets.name
  description = "GCS bucket name for K8s secret (GCS_BUCKET_NAME)."
}

# =============================================================================
# Service Account Key Outputs (for K8s secrets)
# =============================================================================

output "gcs_service_account_key" {
  value       = google_service_account_key.gcs_media_sa_key.private_key
  description = "The private key of the GCS service account (base64 encoded JSON)."
  sensitive   = true
}

# Decoded key for easier extraction of individual fields
output "gcs_credentials_json" {
  value       = base64decode(google_service_account_key.gcs_media_sa_key.private_key)
  description = "The full JSON key file content (decoded)."
  sensitive   = true
}

# Just the private key field for GCP_PRIVATE_KEY env var
output "gcp_private_key" {
  value       = jsondecode(base64decode(google_service_account_key.gcs_media_sa_key.private_key)).private_key
  description = "The private key string for K8s secret (GCP_PRIVATE_KEY)."
  sensitive   = true
}