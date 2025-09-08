resource "proxmox_lxc" "lxc-app" {
    features {
        nesting = true
    }
    hostname     = var.os.hostname
    memory       = 2048
    cores        = 4
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
    onboot       = true
    rootfs {
        size    = "8G"
        storage = "local-lvm"
    }
    
    lifecycle {
        create_before_destroy = true
    }
}

