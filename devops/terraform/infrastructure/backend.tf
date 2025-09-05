terraform {
  backend "s3" {
    bucket = "our-corner-tf-state"
    key    = "default/terraform.tfstate"
    region = "us-east-1"
  }
}

