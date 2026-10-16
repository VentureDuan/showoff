---
title: "Linux 路由详细介绍"
description: "整理路由表、路由选择与 Linux 网络路由实践。"
date: "2026-10-16"
dateLabel: "收录"
kind: "article"
tags: ["Linux", "网络"]
featured: false
legacy: true
---

## 前言

工作中经常遇到网络传输相关的问题，比如某某设备ping不通、某某服务连接建立失败等问题，排除硬件的问题后，有比较大的可能就是路由表的问题。平时都是遇到问题后去百度一下命令解决问题就完事了，知识不成系统，所以今天我就系统性的学习一下Linux路由，顺便将学习过程记录下来。





## 路由表

在Linux操作系统上通过`route`命令查看Linux内核的路由表：

```bash
[root@VM_139_74_centos ~]# route -n
Kernel IP routing table
Destination     Gateway         Genmask         Flags Metric Ref    Use Iface
0.0.0.0         10.139.128.1    0.0.0.0         UG    0      0        0 eth0
10.0.0.10       10.139.128.1    255.255.255.255 UGH   0      0        0 eth0
10.139.128.0    0.0.0.0         255.255.224.0   U     0      0        0 eth0
169.254.0.0     0.0.0.0         255.255.0.0     U     1002   0        0 eth0
172.17.0.0      0.0.0.0         255.255.0.0     U     0      0        0 docker0
172.18.0.0      0.0.0.0         255.255.0.0     U     0      0        0 br-0ab63c131848
172.19.0.0      0.0.0.0         255.255.0.0     U     0      0        0 br-bccbfb788da0
172.20.0.0      0.0.0.0         255.255.0.0     U     0      0        0 br-7485db25f958
```

通过`ip route show`也能查看Linux内核路由表

```bash
[djt@dev ~]$ ip route show
default via 192.168.19.1 dev eno2 
169.254.0.0/16 dev eno2 scope link metric 1003 
172.17.0.0/16 dev docker0 proto kernel scope link src 172.17.0.1 
192.168.19.0/24 dev eno2 proto kernel scope link src 192.168.19.200 
192.168.122.0/24 dev virbr0 proto kernel scope link src 192.168.122.1
```





可以看到一张路由表会有多条路由规则。每条规则至少包含这三项信息：

1. 目的网络：这个包想去哪里？
2. 出口设备：将包从那个口扔出去？
3. 下一跳网关：下一个路由器的地址

<img src="/images/blog/static/1710405328507.png" alt="1710405328507" style="zoom:67%;" />

在上面这张图中你可以看到两台PC是没法直接ping通的，因为在不同的网段，LAN1在192.168.1.x，另一台LAN2在192.168.2.x，它们通过中间转发路由器实现数据转发通信。





## 添加路由

在Linux上添加路由最简单的方式是使用`ip route add`命令，后跟要到达的网络地址和要用于此路由的网关

```bash
ip route add <network_ip>/<cidr> via <gateway_ip>

# eg.
ip route add 10.0.3.0/24 via 10.0.3.1

# 显示系统路由
ip route show

# 设置系统默认路由
ip route add default via 192.168.1.254

# 查看路由表信息
ip route list

# 设置192.168.4.0网段的网关为192.168.0.254，数据走eth0
ip route add 192.168.4.0/24 via 192.168.0.254 dev eth0

# 设置默认网关为192.168.0.254
ip route add default via 192.168.0.254 dev eth0

# 删除192.168.4.0网段的网关
ip route del 192.168.4.0/24

# 删除默认路由
ip route del default

# 删除路由
ip route del 192.168.1.0/24 dev eht0
```



## 案例

假设你希望两个 LAN 网络能够相互通信，网络拓扑有三台不同的 Linux 机器：

- 一台拥有 `10.0.2.2/24` IP地址的Linux机器A
- 另一台拥有 `10.0.3.2/24` IP地址的Linux机器B
- 一台Linux机器C充当两个网络之间的简单路由器

<img src="/images/blog/static/1710407363992.png" alt="1710407363992" style="zoom:67%;" />

现在，如果想在机器A上ping机器B应该如何操作？



**第一步：**

在C机器上检查当前路由

```
ip route show

# 这条路由表示，所以经过C机器上，目标地址是10.0.2.0/24网段请求，我都丢给10.0.2.1处理
10.0.2.0/24 dev enp0s3 proto kernel scope link src 10.0.2.1 metric 100
```



**第二步：**

添加路由，在C机器上添加到B机器的路由

```
ip route add 10.0.3.0/24 via 10.0.3.1
```

这种配置核心思想是：根据目的IP来配置路由





## 进阶：策略路由
