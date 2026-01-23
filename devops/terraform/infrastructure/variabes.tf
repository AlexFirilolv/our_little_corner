variable "aws" {
  description = "AWS environemnt variables"
  type = object({
    region = string
    db = object({
      username = string
      password = string
      })
    })
  }