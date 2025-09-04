# variables.tf

variable "pve" {
  description = "Proxmox Virtual Environment connection details."
  type = object({
    node     = string
    user     = string
    password = string
  })
  sensitive = true # Mark the whole object as sensitive because it contains a password
}

variable "os" {
  description = "Container operating system and credentials."
  type = object({
    template = string
    password = string
  })
  sensitive = true
}