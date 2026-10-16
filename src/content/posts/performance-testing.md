---
title: "性能优化：性能测试"
description: "记录 CPU、内存分析与 Go 性能测试工具的使用。"
date: "2026-10-16"
dateLabel: "收录"
kind: "article"
tags: ["Go", "性能优化", "性能测试"]
featured: false
legacy: true
---

这篇文章主要是对针对性能优化专题的实操。

在前面`思考框架`中我们知道，解决性能问题可以分三步走，1. 性能测试；2. 性能分析；3. 性能优化。性能测试是左性能优化的前提。接下来我会从三个实际场景与你一起探讨 golang 如何进行性能测试。



## 场景1：如何分析程序的运行时间与CPU利用率

### 1. time 指令

这个方法不算新颖，但是确很实用。 time是Unix/Linux内置多命令，使用时一般不用传过多参数，直接跟上需要调试多程序即可。

```bash
$ time go run main.go 
time 测试...

real	0m0.794s
user	0m0.144s
sys	0m0.794s
```

上面是使用time对 go run test2.go对执行程序坐了性能分析，得到3个指标。

- real：从程序开始到结束，实际度过的时间；
- user：程序在用户态度过的时间；
- sys：程序在内核态度过的时间。

一般情况下 real >= user + sys，因为系统还有其它进程(切换其他进程中间对于本进程会有空白期)。



### 2. /usr/bin/time指令

这个指令比内置的time更加详细一些，使用的时候需要用绝对路径，而且要加上参数-v

**TIPS:**

> 如果你系统是最小化安装的话，可能没法直接使用/usr/bin/time指令：
>
> ```bash
> $ /usr/bin/time go run main.go 
> -bash: /usr/bin/time: No such file or directory
> ```
>
> 安装`time`即可，我使用的是CentOS，所以输入`yum install time -y`



```bash
$ /usr/bin/time -v go run main.go 

	Command being timed: "go run main.go"
	User time (seconds): 0.02
	System time (seconds): 0.09
	Percent of CPU this job got: 125%
	Elapsed (wall clock) time (h:mm:ss or m:ss): 0:00.09
	Average shared text size (kbytes): 0
	Average unshared data size (kbytes): 0
	Average stack size (kbytes): 0
	Average total size (kbytes): 0
	Maximum resident set size (kbytes): 38752
	Average resident set size (kbytes): 0
	Major (requiring I/O) page faults: 1
	Minor (reclaiming a frame) page faults: 10282
	Voluntary context switches: 559
	Involuntary context switches: 18
	Swaps: 0
	File system inputs: 0
	File system outputs: 2328
	Socket messages sent: 0
	Socket messages received: 0
	Signals delivered: 0
	Page size (bytes): 4096
	Exit status: 0

```

可以看到这里的功能要强大多了，除了之前的信息外，还包括了：

- CPU占用率；
- 内存使用情况；
- Page Fault 情况；
- 进程切换情况；
- 文件系统IO；
- Socket 使用情况；
- ……



### 3. pidstat 指令

参考链接：https://www.jianshu.com/p/3991c0dba094

**Tips:**

> pidstat 是 systat软件的一部分，所以使用前需要先安装sysstat：`yum install -y sysstat`

**基本使用：pidstat [ 选项 ] [ <时间间隔> ] [ <次数> ]**

常用参数：

- -u：默认的参数，显示各个进程的cpu使用统计
- -r：显示各个进程的内存使用统计
- -d：显示各个进程的IO使用情况
- -p：指定进程号
- -w：显示每个进程的上下文切换情况
- -t：显示选择任务的线程的统计信息外的额外信息
- -I：在SMP环境，表示任务的CPU使用率/内核数量
- -l：显示命令名和所有参数

```bash
$ pidstat -u -p 2178 5 2
Linux 3.10.0-1160.95.1.el7.x86_64 (today) 	04/04/2023 	_x86_64_	(2 CPU)

06:16:25 PM   UID       PID    %usr %system  %guest    %CPU   CPU  Command
06:16:30 PM     0      2178    6.60  102.20    0.00  108.80     0  main
06:16:35 PM     0      2178    6.40  102.80    0.00  109.20     0  main
Average:        0      2178    6.50  102.50    0.00  109.00     -  main
```

**参数说明：**

- PID：进程ID
- %usr：进程在用户空间占用cpu的百分比
- %system：进程在内核空间占用cpu的百分比
- %guest：进程在虚拟机占用cpu的百分比
- %CPU：进程占用cpu的百分比
- CPU：处理进程的cpu编号
- Command：当前进程对应的命令





## 场景2： 如何分析golang程序的内存使用情况？

### 1. 内存占用情况查看

我们先写一段demo例子代码

```go
package main

import (
    "log"
    "runtime"
    "time"
)

func test() {
    //slice 会动态扩容，用slice来做堆内存申请
    container := make([]int, 8)

    log.Println(" ===> loop begin.")
    for i := 0; i < 32*1000*1000; i++ {
        container = append(container, i)
    }
    log.Println(" ===> loop end.")
}

func main() {
    log.Println("Start.")

    test()

    log.Println("force gc.")
    runtime.GC() //强制调用gc回收

    log.Println("Done.")

    time.Sleep(3600 * time.Second) //睡眠，保持程序不退出
}
```

运行：

```bash
$go build -o snippet_mem && ./snippet_mem
```

然后在./snippet_mem进程没有执行完，我们再开一个窗口，通过 pidstat 命令查看进程的内存占用情况

```bash
$pidstat -r -p $(pidof snippet_mem) 5 1
Linux 3.10.0-1160.95.1.el7.x86_64 (today) 	04/04/2023 	_x86_64_	(2 CPU)

07:10:41 PM   UID       PID  minflt/s  majflt/s     VSZ    RSS   %MEM  Command
07:10:46 PM     0      2514      0.00      0.00 1785884 1028568  50.73  snippet_mem
Average:        0      2514      0.00      0.00 1785884 1028568  50.73  snippet_mem
```

我们看出来，没有退出的snippet_mem进程有约1028m的内存被占用。

直观上来说，这个程序在test()函数执行完后，切片contaner的内存应该被释放，不应该占用830M那么大。

下面让我们使用GODEBUG来分析程序的内存使用情况。



### 2. GODEBUG与gctrace

用法：

执行 snippet_mem 程序之前添加环境变量 `GODEBUG='gctrace=1'` 来跟踪打印垃圾回收器信息

```bash
$ GODEBUG='gctrace=1' ./snippet_mem
```

设置`gctrace=1`会使得垃圾回收器在每次回收时汇总所回收内存的大小以及耗时， 并将这些内容汇总成单行内容打印到标准错误输出中。

![image-20230404191136765](/images/blog/static/image-20240406015254940.png)

格式：

```
gc # @#s #%: #+#+# ms clock, #+#/#/#+# ms cpu, #->#-># MB, # MB goal, # P
```

含义：

- gc #        GC次数的编号，每次GC时递增 
- @#s         距离程序开始执行时的时间 
- #%          GC占用的执行时间百分比 
- #+...+#     GC使用的时间 
- #->#-># MB  GC开始，结束，以及当前活跃堆内存的大小，单位M 
- \# MB goal   全局堆内存大小 
- \# P         使用processor的数量

> 注意：如果每条信息最后，以(forced)结尾，那么该信息是由runtime.GC()调用触发

例如：

```bash
gc 17 @0.412s 27%: 0.009+0.069+0.001 ms clock, 0.018+0/0.040/0.043+0.002 ms cpu, 516->516->0 MB, 1033 MB goal, 0 MB stacks, 0 MB globals, 2 P (forced)
```

该条信息含义如下：

- gc 17: Gc 调试编号为17
- @0.412s:此时程序已经执行了0.412s
- 27%: 0.412s中其中gc模块占用了27%的时间
- 0.009+0.069+0.001 ms clock: 垃圾回收的时间，分别为STW（stop-the-world）清扫的时间+并发标记和扫描的时间+STW标记的时间
- 0.018+0/0.040/0.043+0.002 ms cpu: 垃圾回收占用cpu时间
- 516->516->0 MB： GC开始前堆内存516M， GC结束后堆内存516M，当前活跃的堆内存0M
- 1033 MB goal: 全局堆内存大小
- 2 P: 本次GC使用了2个P(调度器中的Processer)



了解了GC的调试信息读法后，接下来我们来分析一下本次GC的结果：

```bash
[root@today go-example]# GODEBUG='gctrace=1' ./snippet_mem
2023/04/04 19:14:55 Start.
2023/04/04 19:14:55  ===> loop begin.
gc 1 @0.001s 7%: 0.030+0.30+0.022 ms clock, 0.060+0.10/0.033/0+0.045 ms cpu, 4->4->0 MB, 4 MB goal, 0 MB stacks, 0 MB globals, 2 P
gc 2 @0.001s 9%: 0.10+0.49+0.001 ms clock, 0.21+0.060/0/0+0.002 ms cpu, 4->4->1 MB, 5 MB goal, 0 MB stacks, 0 MB globals, 2 P
gc 3 @0.003s 17%: 0.37+1.8+0.028 ms clock, 0.75+0.005/0.76/0+0.057 ms cpu, 6->6->4 MB, 6 MB goal, 0 MB stacks, 0 MB globals, 2 P
gc 4 @0.006s 13%: 0.008+1.5+0.036 ms clock, 0.016+0/0.072/1.4+0.073 ms cpu, 12->12->7 MB, 12 MB goal, 0 MB stacks, 0 MB globals, 2 P
gc 5 @0.009s 9%: 0.007+3.1+0.001 ms clock, 0.015+0/0.077/2.8+0.003 ms cpu, 19->19->11 MB, 19 MB goal, 0 MB stacks, 0 MB globals, 2 P
gc 6 @0.013s 7%: 0.010+4.4+0.082 ms clock, 0.020+0/0.076/4.1+0.16 ms cpu, 29->29->18 MB, 29 MB goal, 0 MB stacks, 0 MB globals, 2 P
gc 7 @0.020s 5%: 0.011+6.9+0.038 ms clock, 0.022+0/0.084/6.7+0.076 ms cpu, 46->46->28 MB, 46 MB goal, 0 MB stacks, 0 MB globals, 2 P
gc 8 @0.032s 3%: 0.013+10+0.002 ms clock, 0.026+0/0.081/10+0.004 ms cpu, 72->72->24 MB, 72 MB goal, 0 MB stacks, 0 MB globals, 2 P
gc 9 @0.043s 10%: 0.008+8.7+0.038 ms clock, 0.017+0/7.5/0+0.077 ms cpu, 55->55->55 MB, 55 MB goal, 0 MB stacks, 0 MB globals, 2 P
gc 10 @0.061s 7%: 0.014+11+0.002 ms clock, 0.029+0/0.078/11+0.004 ms cpu, 142->142->48 MB, 142 MB goal, 0 MB stacks, 0 MB globals, 2 P
gc 11 @0.073s 14%: 0.010+17+0.037 ms clock, 0.020+0/16/0+0.075 ms cpu, 108->108->108 MB, 108 MB goal, 0 MB stacks, 0 MB globals, 2 P
gc 12 @0.109s 9%: 0.013+36+0.041 ms clock, 0.027+0/0.087/36+0.083 ms cpu, 277->277->169 MB, 277 MB goal, 0 MB stacks, 0 MB globals, 2 P
gc 13 @0.162s 6%: 0.014+38+0.049 ms clock, 0.028+0/0.080/37+0.098 ms cpu, 433->433->264 MB, 433 MB goal, 0 MB stacks, 0 MB globals, 2 P
gc 14 @0.224s 4%: 0.015+67+0.043 ms clock, 0.030+0/0.088/67+0.087 ms cpu, 677->677->413 MB, 677 MB goal, 0 MB stacks, 0 MB globals, 2 P
2023/04/04 19:14:55  ===> loop end.
2023/04/04 19:14:55 force gc.
gc 15 @2023/04/04 19:14:55 Done.
0.477s 2%: 0.023+0.14+0.001 ms clock, 0.047+0/0.016/0.12+0.003 ms cpu, 700->700->0 MB, 826 MB goal, 0 MB stacks, 0 MB globals, 2 P (forced)
GC forced
gc 16 @125.181s 0%: 0.013+0.090+0.001 ms clock, 0.026+0/0.016/0.081+0.002 ms cpu, 0->0->0 MB, 4 MB goal, 0 MB stacks, 0 MB globals, 2 P
```



#### 分析：

先看在test()函数执行完后立即打印的gc 15那行的信息。700->700->0 MB, 826 MB goal表示垃圾回收器已经把444M的内存标记为非活跃的内存。

再看下一个记录gc 16。0->0->0 MB, 4 MB goal表示垃圾回收器中的全局堆内存大小由888M下降为4M。



#### 结论：

1、在test()函数执行完后，demo程序中的切片容器所申请的堆空间都被垃圾回收器回收了。

2、如果此时在top指令查询内存的时候，如果依然是800+MB，说明垃圾回收器回收了应用层的内存后，（可能）并不会立即将内存归还给系统。



### 3. runtime.ReadMemStats

还可以利用 runtime 库里的 `ReadMemStats()` 方法

```go
package main

import (
    "log"
    "runtime"
    "time"
)

func readMemStats() {

    var ms runtime.MemStats

    runtime.ReadMemStats(&ms)

    log.Printf(" ===> Alloc:%d(bytes) HeapIdle:%d(bytes) HeapReleased:%d(bytes)", ms.Alloc, ms.HeapIdle, ms.HeapReleased)
}

func test() {
    //slice 会动态扩容，用slice来做堆内存申请
    container := make([]int, 8)

    log.Println(" ===> loop begin.")
    for i := 0; i < 32*1000*1000; i++ {
        container = append(container, i)
        if ( i == 16*1000*1000) {
            readMemStats()
        }
    }

    log.Println(" ===> loop end.")
}

func main() {
    log.Println(" ===> [Start].")

    readMemStats()
    test()
    readMemStats()

    log.Println(" ===> [force gc].")
    runtime.GC() //强制调用gc回收

    log.Println(" ===> [Done].")
    readMemStats()

    go func() {
        for {
            readMemStats()
            time.Sleep(10 * time.Second)
        }
    }()

    time.Sleep(3600 * time.Second) //睡眠，保持程序不退出
}
```

这里我们， 封装了一个函数readMemStats()，这里面主要是调用runtime中的ReadMemStats()方法获得内存信息，然后通过log打印出来。

```bash
$./snippet_mem
2023/04/05 10:13:36  ===> [Start].
2023/04/05 10:13:36  ===> Alloc:62496(bytes) HeapIdle:3702784(bytes) HeapReleased:3670016(bytes)
2023/04/05 10:13:36  ===> loop begin.
2023/04/05 10:13:37  ===> Alloc:277249752(bytes) HeapIdle:275922944(bytes) HeapReleased:21389312(bytes)
2023/04/05 10:13:38  ===> loop end.
2023/04/05 10:13:38  ===> Alloc:887980632(bytes) HeapIdle:210444288(bytes) HeapReleased:25174016(bytes)
2023/04/05 10:13:38  ===> [force gc].
2023/04/05 10:13:38  ===> [Done].
2023/04/05 10:13:38  ===> Alloc:49976(bytes) HeapIdle:1098375168(bytes) HeapReleased:25174016(bytes)
2023/04/05 10:13:38  ===> Alloc:50808(bytes) HeapIdle:1098326016(bytes) HeapReleased:25305088(bytes)
2023/04/05 10:13:48  ===> Alloc:51056(bytes) HeapIdle:1098317824(bytes) HeapReleased:1095180288(bytes)
2023/04/05 10:13:58  ===> Alloc:51184(bytes) HeapIdle:1098317824(bytes) HeapReleased:1095180288(bytes)
2023/04/05 10:14:08  ===> Alloc:51760(bytes) HeapIdle:1098317824(bytes) HeapReleased:1095180288(bytes)
2023/04/05 10:14:18  ===> Alloc:51888(bytes) HeapIdle:1098317824(bytes) HeapReleased:1095180288(bytes)
2023/04/05 10:14:28  ===> Alloc:52016(bytes) HeapIdle:1098317824(bytes) HeapReleased:1095180288(bytes)
```

可以看到，打印[Done].之后那条trace信息，Alloc已经下降，即内存已被垃圾回收器回收。在`2023/04/05 10:13:38`和`2023/04/05 10:13:48`的两条trace信息中，HeapReleased开始上升，即垃圾回收器把内存归还给系统。

MemStats还可以获取其它哪些信息以及字段的含义可以参见官方文档：

http://golang.org/pkg/runtime/#MemStats



### 4. pprof工具

这应该是 go debug、做性能分析使用最多的一个工具了。pprof工具支持网页上查看内存的使用情况，需要在代码中添加一个协程即可。

```go
import(
	"net/http"
	_ "net/http/pprof"
)

go func() {
	log.Println(http.ListenAndServe("0.0.0.0:10000", nil))
}()
```

**示例：**

```go
package main

import (
    "log"
    "runtime"
    "time"
    "net/http"
    _ "net/http/pprof"
)

func readMemStats() {

    var ms runtime.MemStats

    runtime.ReadMemStats(&ms)

    log.Printf(" ===> Alloc:%d(bytes) HeapIdle:%d(bytes) HeapReleased:%d(bytes)", ms.Alloc, ms.HeapIdle, ms.HeapReleased)
}

func test() {
    //slice 会动态扩容，用slice来做堆内存申请
    container := make([]int, 8)

    log.Println(" ===> loop begin.")
    for i := 0; i < 32*1000*1000; i++ {
        container = append(container, i)
        if ( i == 16*1000*1000) {
            readMemStats()
        }
    }

    log.Println(" ===> loop end.")
}

func main() {


    //启动pprof
    go func() {
        log.Println(http.ListenAndServe("0.0.0.0:10000", nil))
    }()

    log.Println(" ===> [Start].")

    readMemStats()
    test()
    readMemStats()

    log.Println(" ===> [force gc].")
    runtime.GC() //强制调用gc回收

    log.Println(" ===> [Done].")
    readMemStats()

    go func() {
        for {
            readMemStats()
            time.Sleep(10 * time.Second)
        }
    }()

    time.Sleep(3600 * time.Second) //睡眠，保持程序不退出
}
```

我们正常运行程序，然后同时打开浏览器，

输入地址: http://127.0.0.1:10000/debug/pprof/heap?debug=1

浏览器的内容部分如下：

```
# runtime.MemStats
# Alloc = 191656
# TotalAlloc = 1503472400
# Sys = 904916200
# Lookups = 0
# Mallocs = 1613
# Frees = 723
# HeapAlloc = 191656
# HeapSys = 867827712
# HeapIdle = 867033088
# HeapInuse = 794624
# HeapReleased = 865460224
# HeapObjects = 890
# Stack = 393216 / 393216
# MSpan = 28016 / 32640
# MCache = 2400 / 15600
# BuckHashSys = 1450877
# GCSys = 34644296
# OtherSys = 551859
# NextGC = 4194304
# LastGC = 1712283646623216315

# .....
```



## 场景3：如何分析Golang程序的CPU性能情况？

### 1. 性能分析注意事项

- 性能分析必须在一个 可重复的、稳定的环境中来进行。 
- 机器必须闲置 
- 不要在共享硬件上进行性能分析;
- 不要在性能分析期间，在同一个机器上去浏览网页
- 注意省电模式和过热保护，如果突然进入这些模式，会导致分析数据严重不准确
- 不要使用虚拟机、共享的云主机，太多干扰因素，分析数据会很不一致；

> 一般来说公司都会有专用的性能测试服务器，注意：
>
> 1. 测试前关闭电源进行过热管理
> 2. 绝不要升级，以保证测试的一致性
>
> 如果没有这样的环境，那就一定要在多个环境中，执行多次，以取得可参考的、具有相对一致性的测试结果



### 2. CPU性能分析

还是写了个demo进行测试

```go
package main

import (
    "bytes"
    "math/rand"
    "time"
    "log"
    "net/http"
    _ "net/http/pprof"
)


func test() {

    log.Println(" ===> loop begin.")
    for i := 0; i < 1000; i++ {
        log.Println(genSomeBytes())
    }

    log.Println(" ===> loop end.")
}

//生成一个随机字符串
func genSomeBytes() *bytes.Buffer {

    var buff bytes.Buffer

    for i := 1; i < 20000; i++ {
        buff.Write([]byte{'0' + byte(rand.Intn(10))})
    }

    return &buff
}

func main() {

    go func() {
        for {
            test()
            time.Sleep(time.Second * 1)
        }
    }()

    //启动pprof
    http.ListenAndServe("0.0.0.0:10000", nil)

}
```

这里面还是启动了pprof的监听,有关pprof启动的代码如下:

```go
import (
    "net/http"
    _ "net/http/pprof"
)

func main() {
	//...
 	//...
  
  	//启动pprof
 	http.ListenAndServe("0.0.0.0:10000", nil)
}
```

main()里的流程很简单,启动一个goroutine去无限循环调用test()方法,休眠1s.

test()的流程是生成1000个20000个字符的随机字符串.并且打印.

我们将上面的代码编译成可执行的二进制文件 cpu_test (记住这个名字,稍后我们能用到)

```bash
$ go build -o cpu_test
```

接下来我们通过几种方式来查看进程的cpu性能情况.

启动程序：

```bash
$ ./cpu_test
```



#### A.Web界面查看

浏览器访问http://127.0.0.1:10000/debug/pprof/

我们会看到如下画面

![image-20240405103415138](/images/blog/static/image-20240405103415138.png)

> tips：我的测试服务器在 10.0.0.12 没有在本地

这里面能够通过pprof查看包括(阻塞信息、cpu信息、内存堆信息、锁信息、goroutine信息等等), 我们这里关心的cpu的性能的profile信息.

有关profile下面的英文解释大致如下:

> “CPU配置文件。您可以在秒GET参数中指定持续时间。获取概要文件后，请使用go tool pprof命令调查概要文件。”

所以我们要是想得到cpu性能,就是要获取到当前进程的profile文件,这个文件默认是30s生成一个,所以你的程序要至少运行30s以上(这个参数也可以修改,稍后我们介绍)

我们可以直接点击网页的profile,浏览器会给我们下载一个profile文件. 记住这个文件的路径, 可以拷贝到与cpu_test 所在的同一文件夹下.



#### B.使用pprof工具查看

pprof的格式如下

```bash
go tool pprof [binary] [profile]
```

binary: 必须指向生成这个性能分析数据的那个二进制可执行文件；

profile: 必须是该二进制可执行文件所生成的性能分析数据文件。

> binary 和 profile 必须严格匹配。

```bash
$ ls
cpu_test  go.mod  main.go  profile
$ go tool pprof ./cpu_test profile 
File: cpu_test
Type: cpu
Time: Apr 5, 2024 at 10:35am (CST)
Duration: 30s, Total samples = 920ms ( 3.07%)
Entering interactive mode (type "help" for commands, "o" for options)
(pprof)
```

`help`可以查看一些指令,我么可以通过`top`来查看cpu的性能情况

```bash
(pprof) top
Showing nodes accounting for 800ms, 86.96% of 920ms total
Showing top 10 nodes out of 92
      flat  flat%   sum%        cum   cum%
     190ms 20.65% 20.65%      530ms 57.61%  math/rand.(*Rand).Int31n
     150ms 16.30% 36.96%      170ms 18.48%  sync.(*Mutex).Unlock (inline)
     130ms 14.13% 51.09%      130ms 14.13%  runtime.futex
     110ms 11.96% 63.04%      320ms 34.78%  math/rand.(*lockedSource).Int63
      50ms  5.43% 68.48%      140ms 15.22%  bytes.(*Buffer).Write
      40ms  4.35% 72.83%      570ms 61.96%  math/rand.(*Rand).Intn
      40ms  4.35% 77.17%       40ms  4.35%  math/rand.(*rngSource).Uint64 (inline)
      40ms  4.35% 81.52%       40ms  4.35%  syscall.Syscall
      30ms  3.26% 84.78%       30ms  3.26%  runtime.memmove
      20ms  2.17% 86.96%      730ms 79.35%  main.genSomeBytes
```

这里面有几列数据,需要说明一下.

- flat：当前函数占用CPU的耗时
- flat%：:当前函数占用CPU的耗时百分比
- sum%：函数占用CPU的耗时累计百分比
- cum：当前函数加上调用当前函数的函数占用CPU的总耗时
- cum%：当前函数加上调用当前函数的函数占用CPU的总耗时百分比
- 最后一列：函数名称

其中:

- flat 和 cum 的区别在于，flat 只统计函数自身的 CPU 使用时间，而不包括调用子函数的时间，而 cum 则包括了函数自身的时间和调用子函数的时间。
- flat% 和 cum% 则是相应的百分比表示。
- sum% 表示当前函数及其子函数的 CPU 使用时间占总时间的百分比，是在 cum% 的基础上，去掉了当前函数的父函数的 CPU 使用时间。

通过结果我们可以看出, 该程序的大部分cpu性能消耗在 main.getSoneBytes()方法中,其中math/rand取随机数消耗比较大.



#### C.通过go tool pprof得到profile文件

我们上面的profile文件是通过web浏览器下载的,这个profile的经过时间是30s的,默认值我们在浏览器上修改不了,如果你想得到时间更长的cpu利用率,可以通过go tool pprof指令与程序交互来获取到

首先，我们先启动程序：

```bash
$ ./cpu_test
```

再打开一个中断，运行命令

```bash
$ go tool pprof http://localhost:10000/debug/pprof/profile?seconds=60
```

这里指定了生成profile文件的时间间隔60s

等待60s之后, 终端就会有结果出来,我们继续使用top来查看.

```bash
$ go tool pprof http://localhost:10000/debug/pprof/profile?seconds=60
Fetching profile over HTTP from http://localhost:10000/debug/pprof/profile?seconds=60
Saved profile in /root/pprof/pprof.cpu_test.samples.cpu.001.pb.gz
File: cpu_test
Type: cpu
Time: Apr 5, 2024 at 10:46am (CST)
Duration: 60.01s, Total samples = 1.82s ( 3.03%)
Entering interactive mode (type "help" for commands, "o" for options)
(pprof) top 15
Showing nodes accounting for 1720ms, 94.51% of 1820ms total
Showing top 15 nodes out of 101
      flat  flat%   sum%        cum   cum%
     330ms 18.13% 18.13%      330ms 18.13%  sync.(*Mutex).Unlock (inline)
     310ms 17.03% 35.16%      720ms 39.56%  math/rand.(*lockedSource).Int63
     280ms 15.38% 50.55%      280ms 15.38%  runtime.futex
     240ms 13.19% 63.74%      990ms 54.40%  math/rand.(*Rand).Int31n
      90ms  4.95% 68.68%      320ms 17.58%  bytes.(*Buffer).Write
      90ms  4.95% 73.63%      100ms  5.49%  syscall.Syscall
      80ms  4.40% 78.02%     1070ms 58.79%  math/rand.(*Rand).Intn
      70ms  3.85% 81.87%       70ms  3.85%  math/rand.(*rngSource).Uint64 (inline)
      70ms  3.85% 85.71%       70ms  3.85%  runtime.memmove
      50ms  2.75% 88.46%       50ms  2.75%  runtime.memclrNoHeapPointers
      30ms  1.65% 90.11%     1450ms 79.67%  main.genSomeBytes
      20ms  1.10% 91.21%      740ms 40.66%  math/rand.(*Rand).Int63 (inline)
      20ms  1.10% 92.31%     1090ms 59.89%  math/rand.Intn (inline)
      20ms  1.10% 93.41%       20ms  1.10%  runtime.asyncPreempt
      20ms  1.10% 94.51%       20ms  1.10%  runtime.tgkill
```

依然会得到cpu性能的结果, 我们发现这次的结果与上次30s的结果百分比类似.

> 注意：top 默认只会显示 top 10，可以使用help查看top的帮助。在top后面加上数字，就能指定显示top n。

```bash
(pprof) help top
Outputs top entries in text form
  Usage:
    top [n] [focus_regex]* [-ignore_regex]* [-cum] >f
    Include up to n samples
    Include samples matching focus_regex, and exclude ignore_regex.
    -cum sorts the output by cumulative weight
    Optionally save the report on the file f
```



#### D.可视化查看(火焰图)

还是通过`go tool pprof`进入profile文件

```bash
$ go tool pprof ./cpu_test profile
```

然后输入`web`指令

**注意：**

> 如果报错，找不到`graphviz`工具,需要安装一下
>
> Centos：yum install graphviz -y
>
> 
>
> windows：https://graphviz.gitlab.io/_pages/Download/Download_windows.html
>
> 将graphviz安装目录下的bin文件夹添加到Path环境变量中。 在终端输入dot -version查看是否安装成功。

然后我们得到一个svg的可视化文件，一般在`/tmp`路径下，windows系统在`C:/Users/xxxxx/AppData/Local/Temp/`路径下

<img src="/images/blog/static/image-20240405110407457.png" alt="image-20240405110407457" style="zoom:67%;" />

这样我们就能比较清晰的看到函数之间的调用关系,方块越大的表示cpu的占用越大.
