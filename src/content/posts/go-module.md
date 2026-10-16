---
title: "Go Module"
description: "从模块下载、缓存与代理理解 Go Module 的依赖管理。"
date: "2026-10-16"
dateLabel: "收录"
kind: "article"
tags: ["Go", "依赖管理"]
featured: false
legacy: true
---

## 一、go get如何根据模块名找到源代码

### go module名称

   模块由模块路径标识，模块路径就是模块的规范名称，如：github.com/fsnotify/fsnotify，很多时候，模块名称加上https://前缀就是源码仓库的地址。模块名称在go.mod文件里，最初就是由go mod init ${module_name}命令指定，也可以手动修改。

   模块名称中可以包含子目录，如go get gorm.io/gorm/logger中logger就是子目录，即packet的路径

![image-20240716015529055](/images/blog/static/image-20240716015529055.png)



### 模块名不是源码仓库地址

![image-20240716015915487](/images/blog/static/image-20240716015915487.png)

   当执行go get gorm.io/gorm时会先向https://gorm.io/gorm?go-get=1发送一个GET请求，response里有个name=“go-import”的meta标签，对应的content由三部分构成：模块名称，版本控制工具(git/svn等)，源码仓库地址。然后通过git clone去下载源码。





### go get子模块

   go get gorm.io/gorm/logger会做些什么：

	1. 先发送GET请求到https://gorm.io/gorm/logger?go-get=1，查不到源码地址
	1. 再回溯一级目录，请求https://gorm.io/gorm?go-get=1



   当执行go get gitlab.vrviu.com/repo.git时会直接克隆https://gitlab.vrviu.com/repo.git，而无需先发go-get=1请求。一般情况，在公司内go get拉取公司内部的公共服务库时，可能代码仓库做了权限限制，无法通过https获取，所以需要改变VCS(版本控制系统)的拉取行为，比如使用git时，就在$HOME/.gitconfig文件中追加：

```
[url "ssh://git@gitlab.vrviu.com/"]
	insteadOf=https://gitlab.vrviu.com
```

将拉取方式改为ssh，再通过上传公钥解决权限问题。





## 二、代理与本地缓存

### goproxy

   在公网上的源码仓库除了github还有很多，比如go.googlesource.com，在各种不同的网络环境下，如何保证下载速度？如何保证源码的安全性和完整性？

   其实，在默认情况下，go get并不是直接去源码仓库上下载代码，而是通过代理https://proxy.golang.org (由谷歌维护)去下载。代理对源码镜像进行了缓存，并提供CDN加速。

   https://proxy.golang.org 是默认的go get代理，国内也有很多代理，最常用的就是https://goproxy.cn和https://goproxy.io

   自定义代理 go env -w GOPROXY=https://proxy.io,或设置环境变量，go env -w不会写入环境变量，如果出现冲突，环境变量的优先级高于go env。





### 本地缓存

   下载的模块会保存到环境变量GOMODCACHE指定的目录下，为所有go项目公用，GOMODCACHE的默认值为$GOPATH/pkg/mod，也可以手动修改它。

   模块路径和版本号的大写字母用感叹号转义，避免在不区分大小写的文件系统中发生冲突



### GOSUMDB

   sum.golang.org 提供了一个checksum database，用来存储源代码的哈希值，以防止go get从任何源头(包括代理)拉取被篡改的源码。

   第一次用go get下载某个模块时会计算其哈希值，与checksum database里的值进行对比，如果一致，则把模块存入本地缓存目录，并将哈希值写入go.sum文件。后续使用该模型时通过go.sum文件来校验该模块自下载以来未曾被修改过。

   对于公司内部代码，可以设置GOSUMDB=off或者go get时使用-insecure标志，表示不需要验证合法性。



## 三、私有module的开发、部署和调用

   在实际工作中，go module通常用来封装接口API，接口仅供公司内部调用，所以go module不能发布到公网。



### 用gitlab搭建私有代码仓库

以ubuntu为例：

```
sudo apt-get update
sudo apt-get install -y curl openssh-server ca-certificates tzdata perl
sudo apt-get install -y postfix

curl https://packages.gitlab.com/install/repositories/gitlab/gitlab-ce/script.deb.sh | sudo bash
sudo apt-get install gitlab-ee

在/etc/gitlab/gitlab.rb文件中添加一行: external_url 'http://gitlab.venturn.top'
sudo gitlab-ctl reconfigure
sudo gitlab-ctl restart 

浏览器访问http://gitlab.venturn.top。第一次用root账号登录，密码在文件/etc/gitlab/initial_root_password里，该文件24小时后会被删除
```



### 开发私有模块

   go get gitlab.venturn.top/pub-sdk，仅供模块内部使用的变量、结构体和函数放到internal包下。

   main.go可有可无，主要用于生成可执行文件，go install gitlab.venturn.top/pub-sdk其实就是先go get下载源码，然后go build出可执行文件，将可执行文件放到$GOPATH/bin目录下



### GOPROXY=direct

   GOPROXY可以配置多个，用逗号分隔表示当第一个proxy返回401或404时会访问第二个proxy。GOPROXY的默认值为: https://proxy.golang.org,direct。direct表示不走代理，直接从源代码库下载(先发go-get=1请求)

   所有代理都不会访问私有仓库，所以go get私有模块时会命中direct。为了避免下载私有模块时去访问代理，可以把私有模块的前缀赋给GONOPROXY，如GONOPROXY=gitlab.vrviu.com

   git clone私有仓库时通常需要走ssh以解决权限问题，私有模块不需要使用公共的checksum数据库。GONOSUMDB=gitlab.vrviu.com表示以gitlab.vrviu.com开头的模块不需要执行checksum

   GOPRIVATE是GONOPROXY和GONOSUMDB的默认值，所以设置GOPRIVATE后就不需要再设置GONOPROXY和GONOSUMDB了。







## 四、部署私有GOPROXY

goproxy.io除了提供国内可用的go module代理之外，还提供了部署私有go proxy的解决方案

编译安装：

- git clone http://github.com/goproxyio/goproxy.git
- cd goproxy
- make



启动：

- ./bin/goproxy -listen=0.0.0.0:80 -cacheDir=$home/go_module_cache -proxy https://goproxy.io -exclude “gitlab.vrviu.com”
- -cacheDir是代理使用的缓存目录，更GOMODCACHE区分开。如果私有代理上找不到模块，则去访问公共代理，-proxy指定公开代理。-exclude指定那些模块直接去代码仓库下载
- GOPROXY=goproxy.vrviu.com,direct



## 五、语义化版本规范

版本格式：主版本号.次版本号.补丁号，版本号递增规则如下：

- 主要版本号在发布不兼容的公共接口更改后，例如模块里的某个包被删除，必须递增，必须将次版本和补丁版本号设置为零
- 次要版本在发布向后兼容的更改后，例如添加新函数后，必须递增且补丁版本设置为零
- 补丁版本在不修改到公共接口的情况下，比如BUG修复或做了一些优化，必须递增



一个版本标示软件不可变快照，补丁号后可以跟-pre、+build、-pre+build等表示预发版本或构建元数据。

主版本为0或预发布后缀，则它是不稳定版本，不稳定版本不受兼容性限制，可能未来随时接口不兼容。如0.2.0可能与0.1.0不兼容；1.5.0-beta可能与1.5.0不兼容。







## 六、go module版本兼容

### go module版本规范

   go module每个版本以v开头，后面跟语义版本。当VCS为git时，通常情况下模块的版本就是git tag的版本。没有语义版本时会生成一个伪版本，如：v0.0.0-202407161231-badasldajsda，第二部分表示代码生成时间，第三部分是commit的前12位字符

   //indirect 表示间接依赖





### 模块版本兼容

- 主版本为2或更高版本时，go模块路劲必须带有像/v2或/v3这样的主版本后缀，如:github.com/gocolly/colly/v2
- go get和go install可以指定版本号
- 主版本号不同表示不兼容，一个项目里可能同时依赖不同的主版本
- go get -u不会更新主版本号，即-u表示更新到当前主版本下的最新版本
- 主版本后缀不允许有/v0或/v1出现，作为特殊情况，即使在v0和v1，以gopkg.in/开头的模块路径必须始终具有主版本后缀。后缀必须以点开头，而不是斜杆。如: gopkg.in/check/v1、gopkg.in/yaml.v3
