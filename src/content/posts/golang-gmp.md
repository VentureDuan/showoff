---
title: "Golang GMP 原理"
description: "记录线程调度、GMP 模型与 Go 调度器的工作过程。"
date: "2026-10-16"
dateLabel: "收录"
kind: "article"
tags: ["Go", "并发"]
featured: false
legacy: true
---

Golang的一大特色就是Goroutine。Goroutine是Golang支持高并发的重要保障。Golang可以创建成千上万个Goroutine来处理任务，如何将这些Goroutine分配、负载、调度到处理器上，并且让它们高效的工作？Go给出的解决方案就是GMP模型。



在介绍GMP模型之前，我们先来了解一下调度器的由来。

## 一、为什么需要“调度器”?

### 1. 单进程时代不需要调度器

我们知道，一切的软件都是跑在操作系统上，真正用来干活(计算)的是CPU。早期的操作系统每个程序就是一个进程，直到一个程序运行完，才能进行下一个进程，就是“单进程时代”

一切的程序只能串行发生。

<img src="/images/blog/static/image-20240405165307182.png" alt="image-20240405165307182" style="zoom:67%;" />

它有两个缺点：

- 单一的执行流程，只能拿按顺序一个一个处理任务
- 进程阻塞所带来的CPU时间浪费

后来操作系统就具有了最早的并发能力：多进程并发，**当一个进程阻塞的时候，切换到另外等待执行的进程**，这样就能尽量把CPU利用起来，CPU就不浪费了。

### 2. 多进程/线程有了调度器需求

<img src="/images/blog/static/image-20240405170452468.png" alt="image-20240405170452468" style="zoom:67%;" />

在多进程/多线程的操作系统中，就解决了阻塞的问题，因为一个进程阻塞cpu可以立刻切换到其他进程中去执行，而且调度cpu的算法可以保证在运行的进程都可以被分配到cpu的运行时间片。这样从宏观来看，似乎多个进程是在同时被运行。

> tips：对Linux而言，CPU不区分进程和线程

但新的问题就又出现了，**线程切换并不是没有代价的**，它需要保存前一个线程的运行现场，如果并发线程过多，CPU很大一分部就被用来进行线程调度了。

<img src="/images/blog/static/image-20240405172952645.png" alt="image-20240405172952645" style="zoom:67%;" />

同时还需要考虑同步竞争等问题，如锁、竞争冲突等。



### 3. 协程提高CPU利用率

多进程已经提高了系统的并发能力，在JAVA有一个servlet设计模式，就是每来一个请求就创建一个线程处理请求，但是在当今互联网高并发场景下，为每个任务都创建一个线程是不现实的，因为会消耗大量的内存。

大量的线程出现了新的问题：

- 高内存占用
- 调度会消耗较多的CPU

于是后面系统进行升级，线程分为“内核态”和“用户态”线程。

一个“用户态线程”必须要绑定一个“内核态线程”，但是CPU并不知道有“用户态线程”的存在，它只知道它运行的是一个“内核态线程”(Linux的PCB进程控制块)。

<img src="/images/blog/static/image-20240405174712139.png" alt="image-20240405174712139" style="zoom:67%;" />

这样，我们再去细化去分类一下，内核线程依然叫“线程(thread)”，用户线程叫“协程(co-routine)".

一个协程可以绑定一个线程，也可以多个协程绑定在一个或多个线程上，所以就有了3种协程和线程映射关系：



**N:1关系**

N个协程绑定1个线程，优点就是**协程在用户态线程即完成切换，不会陷入到内核态，这种切换非常的轻量快速**。但也有很大的缺点，1个进程的所有协程都绑定在1个线程上

缺点：

- 某个程序用不了硬件的多核加速能力
- 一旦某协程阻塞，造成线程阻塞，本进程的其他协程都无法执行了，根本就没有并发的能力了。



**1:1关系**

不存在N:1缺点，但是协程的创建、删除和切换的代价都由CPU完成，有点略显昂贵了。



**M:N关系**

M个协程绑定N个线程，是N:1和1:1类型的结合，克服了以上2种模型的缺点，但实现起来最为复杂。

协程跟线程是有区别的，线程由CPU调度是抢占式的，**协程由用户态调度是协作式的**，一个协程让出CPU后，才执行下一个协程。



### 4. Go语言的协程goroutine

go的协程采用M:N关系，也即多个用户级线程对应多个内核级线程





### 小结：

1. 经过上述分析，我们知道了为了满足人们对更高性能的追求、更高效率的压榨CPU，操作系统由最初的单进程，发展到现在的多进程/多线程；

2. 进程创建和切换需要耗费大量的CPU和内存资源，所以发展出了用户级线程(协程)；
3. 协程通过与线程绑定实现在CPU上运行(CPU的视角只有线程)；
4. 协程的创建、切换、销毁、调度需要一个专门的程序来进行，在Go语言中就由runtime统一进行管理，采用的是GMP模型

## 二、概念梳理

### 1. 线程

通常语义中的线程，指的是内核级线程，核心点如下：

（1）是操作系统最小调度单元；

（2）创建、销毁、调度交由内核完成，cpu 需完成用户态与内核态间的切换；

（3）可充分利用多核，实现并行.

 

### 2. 协程

协程，又称为用户级线程，核心点如下：

（1）与线程存在映射关系；

（2）创建、销毁、调度在用户态完成，对内核透明，所以更轻；

（3）从属同一个内核级线程，无法并行；一个协程阻塞会导致从属同一线程的所有协程无法执行.



### 3. Goroutine

<img src="/images/blog/static/image-20240405182339508.png" alt="image-20240405182339508" style="zoom:67%;" />

Goroutine，经 Golang 优化后的特殊“协程”，核心点如下：

（1）与线程存在映射关系，为 M：N；

（2）创建、销毁、调度在用户态完成，对内核透明，足够轻便；

（3）可利用多个线程，实现并行；

（4）通过调度器的斡旋，实现和线程间的动态绑定和灵活调度；

（5）栈空间大小可动态扩缩，因地制宜.

## 三、GMP模型

gmp = goroutine + machine + processor （+ 一套有机组合的机制），下面先单独拆出每个组件进行介绍，最后再总览全局，对 gmp 进行总述.

### 1. g

（1）g 即goroutine，是 golang 中**对协程的抽象**；

（2）g 有自己的运行栈、状态、以及执行的任务函数（用户通过 go func 指定）；

（3）g 需要绑定到 p 才能执行，在 g 的视角中，p 就是它的 cpu.

 

### 2. p

（1）p 即 processor，是 golang 中的调度器；

（2）p 是 gmp 的中枢，借由 p 承上启下，实现 g 和 m 之间的动态有机结合；

（3）对 g 而言，p 是其 cpu，g 只有被 p 调度，才得以执行；

（4）对 m 而言，p 是其执行代理，为其提供必要信息的同时（可执行的 g、内存分配情况等），并隐藏了繁杂的调度细节；

（5）**p 的数量决定了 g 最大并行数量，可由用户通过 GOMAXPROCS 进行设定**（超过 CPU 核数时无意义）.



### 3. m

（1）m 即 machine，是 golang 中对线程的抽象；

（2）m 不直接执行 g，而是先和 p 绑定，由其实现代理；

（3）借由 p 的存在，m 无需和 g 绑死，也无需记录 g 的状态信息，因此 g 在全生命周期中可以实现跨 m 执行.



### 4. gmp

<img src="/images/blog/static/image-20240405191446704.png" alt="image-20240405191446704" style="zoom:67%;" />

GMP 宏观模型如上图所示，下面对要点进行逐一介绍：

（1）M 是线程的抽象；G 是 goroutine; P 是调度器

（2）M 调度 G 前，需要和 P 绑定；

（3）全局有多个M和多个P，但是并行的G的最大数量等于P的数量，可以通过设置`GOMAXPROCS`控制P的个数

（4）G的存放队列有三类：P 本地队列、全局队列和wait队列(图中未展示，为io阻塞就绪态goroutine队列)

（5）M调度G时，优先取P本地队列，其次取全局队列，最后取wait队列；这样的好处是，取本地队列时，可以接近无锁化，减少全局锁竞争

（6）为防止不同P的闲忙差异过大，设立work-stealing机制，**本地队列为空的P可以尝试从其他P本地队列偷取一半的G补充到自身队列.**



### 4. 被废弃的goroutine调度器

其实goroutine调度器并不是一开始就是GMP，现在使用的GMP是在2012年重新设计的，之前的调度器只有GM，存在性能问题。

<img src="/images/blog/static/image-20240405192447771.png" alt="image-20240405192447771" style="zoom:67%;" />

M想要执行、放回G都必须访问全局G队列，并且M有多个，即多线程访问同一资源需要加锁进行保证互斥/同步，所以全局G队列是有互斥锁进行保护的。

它存在以下几个缺点：

- 创建、销毁、调度G都需要每个M获取锁，这就形成了激烈的锁竞争。
- M转移G会造成延迟和额外的系统负载。比如当G中包含创建新协程的时候，M创建了G’，为了继续执行G，需要把G’交给M’执行，也造成了很差的局部性，因为G’和G是相关的，最好放在M上执行，而不是其他M'。
- 系统调用(CPU在M之间的切换)导致频繁的线程阻塞和取消阻塞操作增加了系统开销。



## 四、核心数据结构

gmp 数据结构定义为 runtime/runtime2.go 文件中，由于各个类的成员属性较多，那么只摘取核心字段进行介绍.

### 1. g

```go
// src/runtime/runtime2.go
type g struct {
    stack       stack      // 描述了当前 Goroutine 的栈内存范围[stack.lo, stack.hi)
	stackguard0 uintptr     // 用于调度器抢占式调度
	_panic      *_panic     // 最内侧的 panic 结构体
	_defer      *_defer     // 最内侧的 defer 延迟函数结构体
    
	m           *m          // 当前 G 占用的线程，可能为空
	sched       gobuf       //  存储 G 的调度相关的数据
    
	atomicstatus uint32     // G 的状态
	goid         int64      //  G 的 ID
	waitreason   waitReason //当状态status==Gwaiting时等待的原因
	preempt       bool      // 抢占信号
	preemptStop   bool      // 抢占时将状态修改成 `_Gpreempted`
	preemptShrink bool      // 在同步安全点收缩栈
	lockedm        muintptr   //G 被锁定只能在这个 m 上运行
	waiting        *sudog     // 这个 g 当前正在阻塞的 sudog 结构体
......
}


type gobuf struct {
     sp   uintptr      // 栈指针
     pc   uintptr      // 程序计数器，记录G要执行的下一条指令位置
     g    guintptr     // 持有 runtime.gobuf 的 G
     ret  uintptr      // 系统调用的返回值
 ......
}
```

关键数据：

（1）m：在 p 的代理，负责执行当前 g 的 m；

（2）sched.sp：保存 CPU 的 rsp 寄存器的值，指向函数调用栈栈顶；

（3）sched.pc：保存 CPU 的 rip 寄存器的值，指向程序下一条执行指令的地址；

（4）sched.ret：保存系统调用的返回值；

（5）sched.bp：保存 CPU 的 rbp 寄存器的值，存储函数栈帧的起始位置.



其中 g 的生命周期由以下几种状态组成：

<img src="/images/blog/static/image-20240405193605761.png" alt="image-20240405193605761" style="zoom:67%;" />

```go
const(
      _Gidle = itoa // 0
      _Grunnable // 1
      _Grunning // 2
      _Gsyscall // 3
      _Gwaiting // 4
      _Gdead // 6
      _Gcopystack // 8
      _Gpreempted // 9
)
```

（1）_Gidle 值为 0，为协程开始创建时的状态，此时尚未初始化完成；

（2）_Grunnable 值 为 1，协程在待执行队列中，等待被执行；

（3）_Grunning 值为 2，协程正在执行，同一时刻一个 p 中只有一个 g 处于此状态；

（4）_Gsyscall 值为 3，协程正在执行系统调用；

（5）_Gwaiting 值为 4，协程处于挂起态，需要等待被唤醒. gc、channel 通信或者锁操作时经常会进入这种状态；

（6）_Gdead 值为 6，协程刚初始化完成或者已经被销毁，会处于此状态；

（7）_Gcopystack 值为 8，协程正在栈扩容流程中；

（8）_Greempted 值为 9，协程被抢占后的状态.



### 2. m

```go
type m struct {
    g0      *g     // goroutine with scheduling stack
    // ...
    tls           [tlsSlots]uintptr // thread-local storage (for x86 extern register)
    // ...
}
```

（1）g0：一类特殊的调度协程，不用于执行用户函数，负责执行 g 之间的切换调度. 与 m 的关系为 1:1；

（2）tls：thread-local storage，线程本地存储，存储内容只对当前线程可见. 线程本地存储的是 m.tls 的地址，m.tls[0] 存储的是当前运行的 g，因此线程可以通过 g 找到当前的 m、p、g0 等信息.



### 3. p

```go
type p struct {
    // ...
    runqhead uint32
    runqtail uint32
    runq     [256]guintptr
    
    runnext guintptr
    // ...
}
```

（1）runq：本地 goroutine 队列，最大长度为 256.

（2）runqhead：队列头部；

（3）runqtail：队列尾部；

（4）runnext：下一个可执行的 goroutine.

 

### 4. schedt

```go
type schedt struct {
    // ...
    lock mutex
    // ...
    runq     gQueue
    runqsize int32
    // ...
}
```

schedt 是全局 goroutine 队列的封装：

（1）lock：一把操作全局队列时使用的锁；

（2）runq：全局 goroutine 队列；

（3）runqsize：全局 goroutine 队列的容量.

 

## 五、调度流程

### 1. 两种 g 的切换

通过看代码可以知道存在两种类型的g，g0和普通g

<img src="/images/blog/static/image-20240405194256729.png" alt="image-20240405194256729" style="zoom:67%;" />

- g0：负责调度普通g，执行固定的调度流程，与m的关系是一对一；
- 普通g：负责执行用户函数

m 通过 p 调度执行的 goroutine 永远在普通 g 和 g0 之间进行切换，**当 g0 找到可执行的 g 时，会调用 gogo 方法，调度 g 执行用户定义的任务**；当 g 需要主动让渡或被动调度时，会触发 mcall 方法，将执行权重新交还给 g0.

gogo 和 mcall 可以理解为对偶关系，其定义位于 runtime/stubs.go 文件中.

```go
func gogo(buf *gobuf)
// ...
func mcall(fn func(*g))
```



### 2. 调度类型

<img src="/images/blog/static/image-20240406001208438.png" alt="image-20240406001208438" style="zoom:67%;" />

通常，调度指的是 g0 按照特定策略找到下一个可执行 g 的过程，而这里讨论的调度类型是广义上的“调度”，指的是调度器 p 实现从执行一个 g 切换到另一个 g 的过程。

这种广义“调度”可分为几种类型：

（1）主动调度

一种用户主动执行让出的方式，主要方式是，用户在执行代码中调用了 runtime.Goshed 方法，此时当前的 g 会让出执行权，主动进入队列等待下次被调度执行.

代码位于 runtime/proc.go

```go
func Gosched() {
    checkTimeouts()
    mcall(gosched_m)
}
```



（2）被动调度

因当前不满足某种执行条件，g 可能会陷入阻塞态无法被调度，指导关注的条件达成，g才从阻塞中被唤醒，重新进入可执行队列等待被调度.

常见的被动调度触发方式为因为 channel 操作或互斥锁操作后陷入阻塞等操作，底层会进入 gopark 方法.

代码位于 runtime/proc.go

```go
func gopark(unlockf func(*g, unsafe.Pointer) bool, lock unsafe.Pointer, reason waitReason, traceEv byte, traceskip int) {
    // ...
    mcall(park_m)
}
```

goready 方法通常与 gopark 方法成对出现，能够将 g 从阻塞态中恢复，重新进入等待执行的状态.

代码位于 runtime/proc.go

```go
func goready(gp *g, traceskip int) {
    systemstack(func() {
        ready(gp, traceskip, true)
    })
}
```



（3）正常调度：

g 中的执行任务已完成，g0 会将当前 g 置为死亡状态，发起新一轮调度.



（4）抢占调度：

倘若 g 执行系统调用**超过指定的时长**，且全局的 p 资源比较紧缺，此时将 p 和 g 解绑，抢占出来用于其他 g 的调度. 等 g 完成系统调用后，会重新进入可执行队列中等待被调度.

值得一提的是，前 3 种调度方式都由 m 下的 g0 完成，唯独抢占调度不同.

因为发起系统调用时需要打破用户态的边界进入内核态，此时 m 也会因系统调用而陷入僵直，无法主动完成抢占调度的行为.

因此，在 Golang 进程会有一个全局监控协程 monitor g 的存在，这个 g 会越过 p 直接与一个 m 进行绑定，不断轮询对所有 p 的执行状况进行监控. 倘若发现满足抢占调度的条件，则会从第三方的角度出手干预，主动发起该动作.



### 3. 宏观调度流程

<img src="/images/blog/static/image-20240406002134592.png" alt="image-20240406002134592" style="zoom:80%;" />

集齐各部分理论碎片之后，我们可以尝试对 gmp 的宏观调度流程进行整体串联：

（1）以 g0 -> g -> g0 的一轮循环为例进行串联；

（2）g0 执行 schedule() 函数，寻找到用于执行的 g;

（3）g0 执行 execute() 方法，更新当前g、p的状态信息，并调用gogo()方法，将执行权限交给g;

（4）g因主动让度(gosched_m())、被动调度(park_m())、正常结束(goexit())等原因，调用m_call()函数，执行权重新回到 g0 手中;

（5）g0 执行 schedule() 函数，开启新一轮循环。
