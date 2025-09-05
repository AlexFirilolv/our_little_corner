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

variable "pve" {
  description = "Proxmox Virtual Environment connection details."
  type = object({
    node     = string
    user     = string
    password = string
  })
  sensitive = true
}

variable "os" {
  description = "Container operating system and credentials."
  type = object({
    template = string
    password = string
  })
  sensitive = true
}