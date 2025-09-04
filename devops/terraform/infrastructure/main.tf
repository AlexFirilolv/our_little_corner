terraform {
  required_providers {
    proxmox = {
      source  = "Telmate/proxmox"
    }
  }
}

provider "proxmox" {
    pm_tls_insecure = true
    pm_api_url      = "https://10.100.102.220:8006/api2/json"
    pm_password     = var.pve.password
    pm_user         = var.pve.user
    pm_otp          = ""
}

resource "proxmox_lxc" "lxc-app" {
    features {
        nesting = true
    }
    hostname     = "terraform-container"
    memory       = 1024
    cores        = 2
    network {
        name   = "eth0"
        bridge = "vmbr0"
        ip     = "dhcp"
        ip6    = "dhcp"
    }
    ostemplate   = var.os.template
    password     = var.os.password
    target_node  = var.pve.node
    unprivileged = true
    start        = true   # Start container by default for easier management
    onboot       = false
    force        = true   # Allow force operations
    rootfs {
        size    = "8G"
        storage = "local-lvm"
    }
    
    # Lifecycle management to handle provider limitations
    lifecycle {
        create_before_destroy = true
    }
}
