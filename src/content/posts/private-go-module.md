---
title: "内网私有 Go Module 拉取方案"
description: "梳理内网私有模块的下载问题与代理方案。"
date: "2026-10-16"
dateLabel: "收录"
kind: "article"
tags: ["Go", "依赖管理", "工程实践"]
featured: false
legacy: true
---

## 一、场景

 Go 1.11版本引入Go module后，Go命令拉取依赖的公共go module不再是“痛点”。如下图所示： 

<img src="/images/blog/static/1710150872487.png" alt="1710150872487" style="zoom:67%;" />

我们只要为环境变量GOPROXY配置一个公共GOPROXY服务即可拉取所有公共的go module(开源module).

但是假如研发机器没法直接访问公网，**不能直接通过go get拉取公共module**，而且随着公司内部Go使用者增多以及Go项目的增加，“代码重复”问题就出现了，于是就有人将代码抽离出公共模块，早期公共模块比较简陋，可能会直接源代码拷贝的方式分发到各个项目诸如pkg目录下面进行引用，随着公共模块迭代，就不得不建立一个独立的、可被复用的内部私有仓库。这样我们便有了**拉取私有go module的需求**。



**拉取私有go module很好解决：**一些公司或组织的所有代码都放在公共vcs托管服务商那里(比如github.com)，私有go module则直接放在对应的公共vcs服务的private repository(私有仓库)中。如果你的公司也是如此，那么拉取托管在公共vcs私有仓库中的私有go module也很容易，见下图： 

<img src="/images/blog/static/1710151580304.png" alt="1710151580304" style="zoom:50%;" />

当然这个方案的一个前提是：每个开发人员都需要具有访问公共vcs服务上的私有go module仓库的权限，凭证的形式不限，可以是basic auth的user和password，也可以是personal access token(类似github那种)，只要按照公共vcs的身份认证要求提供即可。 

不过大部分情况都是公司不是私有的VCS服务(gitlab)，**将私有的go module放在私有的VCS服务器上**。就像下图

<img src="/images/blog/static/1710151848948.png" alt="1710151848948" style="zoom:50%;" />



也好解决，设置 GOPROXY 代理时增加 direct 参数，同时设置 GOPRIVATE 来跳过私有库，比如常见的gitlab或gitee

```bash
export GOPROXY=http://goproxy.cn,direct

export GOPRIVATE=git.private.com  // 此处设置为私库域名
```

> 需要注意：
>
> - go get 默认会使用https去请求私库
> - 私有库端口号必须是80端口



但是内网拉取公共go module怎么实现呢？

## 二、可供参考的解决方案

### 0.方案示例环境拓扑

<img src="/images/blog/static/1710153546975.png" alt="1710153546975" style="zoom:67%;" />

我们在内部搭建一个goproxy服务(即上图中的in-house goproxy)，在in-house goproxy上配置两张网卡，一张连接内网交换机，另一张连接公网。这样的目的一来是为那些无法直接访问外网的开发机器以及ci机器提供拉取外部go module的途径，二来由于in-house goproxy的cache的存在，还可以加速公共go module的拉取效率。对于私有go module，开发机将其配置到GOPRIVATE环境变量中，这样Go命令在拉取私有go module时不会再走GOPROXY，而会采用直接访问vcs(如上图中的git.bat.com)的方式拉取私有go module。 



### 1. 选择一个goproxy实现

[Go module proxy协议规范](https://pkg.go.dev/cmd/go@master#hdr-Module_proxy_protocol)发布后，Go社区出现了很多成熟的Goproxy开源实现。从最初的[athens](https://tonybai.com/2018/11/26/hello-go-module-proxy/)，再到国内的两个优秀的开源实现：[goproxy.cn](https://github.com/goproxy/goproxy)和[goproxy.io](https://github.com/goproxyio/goproxy)。其中，goproxy.io在官方站点给出了[企业内部部署的方法](https://goproxy.io/zh/docs/enterprise.html)，基于这一点，我们就基于goproxy.io来实现我们的方案（其余的goproxy实现应该也都可以实现)。

我们在上图中的in-house goproxy节点上执行下面步骤安装goproxy：

```bash
mkdir ~/.bin/goproxy
cd ~/.bin/goproxy
git clone https://github.com/goproxyio/goproxy.git
cd goproxy
make
```

编译后，会在当前的bin目录(~/.bin/goproxy/goproxy/bin)下看到名为goproxy的可执行文件。

建立goproxy cache目录：

```bash
mkdir /root/.bin/goproxy/goproxy/bin/cache
```

启动goproxy： 

```bash
./goproxy -listen=0.0.0.0:8081 -cacheDir=/root/.bin/goproxy/goproxy/bin/cache -proxy https://goproxy.io
goproxy.io: ProxyHost https://goproxy.io
```

启动后goproxy在8081端口监听(即便不指定，goproxy的默认端口也是8081)，指定的上游goproxy服务为goproxy.io。 

接下来，我们来验证一下goproxy的工作是否如我们预期。

我们在开发机上配置GOPROXY环境变量指向house.goproxy.com，通常需要配置direct用于跳过私有仓库

```bash
export GOPROXY=http://house.goproxy.com,direct
```

生效环境变量后，执行下面命令： 

```bash
go get github.com/pkg/errors
```

结果如预期，开发机顺利下载了github.com/pkg/errors包。 

在goproxy侧，我们看到了下面日志： 

```
goproxy.io: ------ --- /github.com/pkg/@v/list [proxy]
goproxy.io: ------ --- /github.com/pkg/errors/@v/list [proxy]
goproxy.io: ------ --- /github.com/@v/list [proxy]
goproxy.io: 0.146s 404 /github.com/@v/list
goproxy.io: 0.156s 404 /github.com/pkg/@v/list
goproxy.io: 0.157s 200 /github.com/pkg/errors/@v/list
```

并且在goproxy的cache目录下，我们也看到了下载并缓存的github.com/pkg/errors包： 

```bash
$cd /root/.bin/goproxy/goproxy/bin/cache
$tree
.
└── pkg
    └── mod
        └── cache
            └── download
                └── github.com
                    └── pkg
                        └── errors
                            └── @v
                                └── list

8 directories, 1 file
```





### 2.开发机器的设置

前面示例中，我们已经将开发机的GOPROXY环境变量设置为goproxy的域名地址。我们拉取所有的公共module都会经过in-house goproxy。但是私有的module还在VCS服务器上没办法拉取下来，我们只要在开发机上配置GOPRIVATE环境变量即可，假定DNS服务器给VCS分配git.code.com，执行一下命令：

```
export GOPRIVATE=git.code.com
```



### 3.方案的不足

上面的方案也不是完美的，它有自己不足的地方：

- 每个开发人员都需要具有访问私有VCS服务上私有go module仓库的权限
- VCS服务和in-house goproxy服务需要配置DNS解析
