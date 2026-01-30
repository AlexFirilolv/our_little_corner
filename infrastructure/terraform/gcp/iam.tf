# =============================================================================
# Service Account for GCS Media Storage Access
# =============================================================================

# Create the service account for the Twofold application to access GCS
resource "google_service_account" "gcs_media_sa" {
  project      = module.project-factory.project_id
  account_id   = "twofold-gcs-media"
  display_name = "Twofold GCS Media Service Account"
  description  = "Service account for Twofold app to upload/download media to GCS bucket"
}

# Grant the service account Storage Object Admin role on the media bucket
# This allows: create, delete, get, list objects and manage object ACLs
resource "google_storage_bucket_iam_member" "media_bucket_object_admin" {
  bucket = module.gcs_buckets.name
  role   = "roles/storage.objectAdmin"
  member = "serviceAccount:${google_service_account.gcs_media_sa.email}"
}

# Grant the service account permission to create signed URLs
# This requires the iam.serviceAccountTokenCreator role on itself
resource "google_service_account_iam_member" "token_creator" {
  service_account_id = google_service_account.gcs_media_sa.name
  role               = "roles/iam.serviceAccountTokenCreator"
  member             = "serviceAccount:${google_service_account.gcs_media_sa.email}"
}

# =============================================================================
# Service Account Key
# =============================================================================
# Create a key for the service account to use in K8s
# NOTE: This key will be stored in Terraform state - ensure state is encrypted!

resource "google_service_account_key" "gcs_media_sa_key" {
  service_account_id = google_service_account.gcs_media_sa.name
  key_algorithm      = "KEY_ALG_RSA_2048"
}

# =============================================================================
# NOTE: Public Access Blocked by Org Policy
# =============================================================================
# Public access prevention is enforced. Media will be served via signed URLs.
# The app uses generatePresignedDownloadUrl() for secure access.
# =============================================================================
