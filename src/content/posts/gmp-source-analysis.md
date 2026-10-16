---
title: "GMP 原理代码分析"
description: "围绕 schedule、findRunnable 与 execute 阅读 Go 调度流程。"
date: "2026-10-16"
dateLabel: "收录"
kind: "article"
tags: ["Go", "并发", "源码分析"]
featured: false
legacy: true
---

### 4. schedule

调度流程的主干方法是位于 runtime/proc.go 中的 schedule 函数，此时的执行权位于 g0 手中：

```go
func schedule() {
    // ...
    gp, inheritTime, tryWakeP := findRunnable() // blocks until work is available


    // ...
    execute(gp, inheritTime)
}
```

（1）寻找到下一个执行的 goroutine；

（2）执行该 goroutine.



### 5. findRunnable

![image-20240406005435745](/images/blog/static/image-20240406005435745.png)

调度流程中，一个非常核心的步骤，就是为 m 寻找到下一个执行的 g，这部分内容位于 runtime/proc.go 的 findRunnable 方法中：

```go
func findRunnable() (gp *g, inheritTime, tryWakeP bool) {
    _g_ := getg()

top:
    _p_ := _g_.m.p.ptr()
    // ...
    if _p_.schedtick%61 == 0 && sched.runqsize > 0 {
        lock(&sched.lock)
        gp = globrunqget(_p_, 1)
        unlock(&sched.lock)
        if gp != nil {
            return gp, false, false
        }
    }
    
    // ...
    if gp, inheritTime := runqget(_p_); gp != nil {
        return gp, inheritTime, false
    }
    
    // ...
    if sched.runqsize != 0 {
        lock(&sched.lock)
        gp := globrunqget(_p_, 0)
        unlock(&sched.lock)
        if gp != nil {
            return gp, false, false
        }
    }

    if netpollinited() && atomic.Load(&netpollWaiters) > 0 && atomic.Load64(&sched.lastpoll) != 0 {
        if list := netpoll(0); !list.empty() { // non-blocking
            gp := list.pop()
            injectglist(&list)
            casgstatus(gp, _Gwaiting, _Grunnable)
            return gp, false, false
        }
    }

    // ...
    procs := uint32(gomaxprocs)
    if _g_.m.spinning || 2*atomic.Load(&sched.nmspinning) < procs-atomic.Load(&sched.npidle) {
        if !_g_.m.spinning {
            _g_.m.spinning = true
            atomic.Xadd(&sched.nmspinning, 1)
        }

        gp, inheritTime, tnow, w, newWork := stealWork(now)
        now = tnow
        if gp != nil {
            // Successfully stole.
            return gp, inheritTime, false
        }
        if newWork {
            // There may be new timer or GC work; restart to
            // discover.
            goto top
        }
        if w != 0 && (pollUntil == 0 || w < pollUntil) {
            // Earlier timer to wait for.
            pollUntil = w
        }
    }
    // 
```

#### （1）p 每执行 61 次调度，会从全局队列中获取一个 goroutine 进行执行，并将一个全局队列中的 goroutine 填充到当前 p 的本地队列中.

![image-20240406004947374](/images/blog/static/image-20240406004947374.png)

```go
    if _p_.schedtick%61 == 0 && sched.runqsize > 0 {
        lock(&sched.lock)
        // 从全局 g 队列获取 goroutine
        gp = globrunqget(_p_, 1)
        unlock(&sched.lock)
        if gp != nil {
            return gp, false, false
        }
    }
```

除了获取一个 g 用于执行外，还会额外将一个 g 从全局队列转移到 p 的本地队列，让全局队列中的 g 也得到更充分的执行机会.

```go
func globrunqget(_p_ *p, max int32) *g {
    if sched.runqsize == 0 {
        return nil
    }

    n := sched.runqsize/gomaxprocs + 1
    if n > sched.runqsize {
        n = sched.runqsize
    }
    if max > 0 && n > max {
        n = max
    }
    if n > int32(len(_p_.runq))/2 {
        n = int32(len(_p_.runq)) / 2
    }

    sched.runqsize -= n

    gp := sched.runq.pop()
    n--
    for ; n > 0; n-- {
        gp1 := sched.runq.pop()
        // 将一个 g 从全局 g 队列移到 p 的本地队列
        runqput(_p_, gp1, false)
    }
    return gp
}
```



![image-20240406010013373](/images/blog/static/image-20240406010013373.png)

将一个 g 由全局队列转移到 p 本地队列的执行逻辑位于 runqput 方法中：

```go
func runqput(_p_ *p, gp *g, next bool) {
    // ...

retry:
    h := atomic.LoadAcq(&_p_.runqhead) // load-acquire, synchronize with consumers
    t := _p_.runqtail
    if t-h < uint32(len(_p_.runq)) {
        _p_.runq[t%uint32(len(_p_.runq))].set(gp)
        atomic.StoreRel(&_p_.runqtail, t+1) // store-release, makes the item available for consumption
        return
    }
    if runqputslow(_p_, gp, h, t) {
        return
    }
    // the queue is not full, now the put above must succeed
    goto retry
```

I 取得 p 本地队列队首的索引，同时对本地队列加锁：

```go
h := atomic.LoadAcq(&_p_.runqhead)
```

 

II 倘若 p 的局部队列未满，则成功转移 g，将 p 的对尾索引 runqtail 值加 1 并解锁队列.

```go
	if t-h < uint32(len(_p_.runq)) {
		_p_.runq[t%uint32(len(_p_.runq))].set(gp)
		atomic.StoreRel(&_p_.runqtail, t+1) // store-release, makes the item available for consumption
		return
	}
```



![image-20240406010433200](/images/blog/static/image-20240406010433200.png)

III 倘若发现本地队列 runq 已经满了，则会返回来将本地队列中一半的 g 放回全局队列中，帮助当前 p 缓解执行压力，这部分内容位于 runqputslow 方法中.

```go
func runqputslow(_p_ *p, gp *g, h, t uint32) bool {
    var batch [len(_p_.runq)/2 + 1]*g
    // First, grab a batch from local queue.
    n := t - h
    n = n / 2
    
    // ...
    for i := uint32(0); i < n; i++ {
        batch[i] = _p_.runq[(h+i)%uint32(len(_p_.runq))].ptr()
    }
    if !atomic.CasRel(&_p_.runqhead, h, h+n) { // cas-release, commits consume
        return false
    }
    
    batch[n] = gp


    // Link the goroutines.
    for i := uint32(0); i < n; i++ {
        batch[i].schedlink.set(batch[i+1])
    }
    var q gQueue
    q.head.set(batch[0])
    q.tail.set(batch[n])


    // Now put the batch on global queue.
    lock(&sched.lock)
    globrunqputbatch(&q, int32(n+1))
    unlock(&sched.lock)
    return true
}
```





#### （2）尝试从 p 本地队列中获取一个可执行的 goroutine，核心逻辑位于 runqget 方法中：

```go
	if gp, inheritTime := runqget(_p_); gp != nil {
        return gp, inheritTime, false
    }
```



```go
func runqget(_p_ *p) (gp *g, inheritTime bool) {
    if next != 0 && _p_.runnext.cas(next, 0) {
        return next.ptr(), true
    }

    for {
        h := atomic.LoadAcq(&_p_.runqhead) // load-acquire, synchronize with other consumers
        t := _p_.runqtail
        if t == h {
            return nil, false
        }
        gp := _p_.runq[h%uint32(len(_p_.runq))].ptr()
        if atomic.CasRel(&_p_.runqhead, h, h+1) { // cas-release, commits consume
            return gp, false
        }
    }
```



I 倘若当前 p 的 runnext 非空，直接获取即可：

```go
    if next != 0 && _p_.runnext.cas(next, 0) {
        return next.ptr(), true
    }
```

II 加锁从 p 的本地队列中获取 g.

需要注意，虽然本地队列是属于 p 独有的，但是由于 work-stealing 机制的存在，其他 p 可能会前来执行窃取动作，因此操作仍需加锁.

但是，由于窃取动作发生的频率不会太高，因此当前 p 取得锁的成功率是很高的，因此可以说p 的本地队列是**接近于无锁化**，但没有达到真正意义的无锁.

```go
	for {
        h := atomic.LoadAcq(&_p_.runqhead) // load-acquire, synchronize with other consumers
       // ...
	}
```

III 倘若本地队列为空，直接终止并返回；

```go
        h := atomic.LoadAcq(&_p_.runqhead) // load-acquire, synchronize with other consumers
        t := _p_.runqtail
        if t == h {
            return nil, false
		}
```

IV 倘若本地队列存在 g，则取得队首的 g，解锁并返回.

```go
        gp := _p_.runq[h%uint32(len(_p_.runq))].ptr()
        if atomic.CasRel(&_p_.runqhead, h, h+1) { // cas-release, commits consume
            return gp, false
        }
```







#### （3）倘若本地队列没有可执行的 g，会从全局队列中获取：

```go
	if sched.runqsize != 0 {
        // 加锁，尝试并从全局队列中取队首的元素.
		lock(&sched.lock)
        gp := globrunqget(_p_, 0)
        unlock(&sched.lock)
        if gp != nil {
            return gp, false, false
        }
	}
```





#### （4）倘若本地队列和全局队列都没有 g，则会获取准备就绪的网络协程：

```go
    if netpollinited() && atomic.Load(&netpollWaiters) > 0 && atomic.Load64(&sched.lastpoll) != 0 {
        if list := netpoll(0); !list.empty() { // non-blocking
            gp := list.pop()
            injectglist(&list)
            casgstatus(gp, _Gwaiting, _Grunnable)
            return gp, false, false
        }
	}
```

需要注意的是，刚获取网络协程时，g 的状态是处于 waiting 的，因此需要先更新为 runnable 状态.



#### （5）work-stealing: 从其他 p 中偷取 g.

```go
func stealWork(now int64) (gp *g, inheritTime bool, rnow, pollUntil int64, newWork bool) {
    pp := getg().m.p.ptr()

    ranTimer := false

    const stealTries = 4
    for i := 0; i < stealTries; i++ {
        stealTimersOrRunNextG := i == stealTries-1

        for enum := stealOrder.start(fastrand()); !enum.done(); enum.next() {
            // ...
        }
    }
    return nil, false, now, pollUntil, ranTime
```

偷取操作至多会遍历全局的 p 队列 4 次，过程中只要找到可窃取的 p 则会立即返回.

为保证窃取行为的公平性，遍历的起点是随机的. 窃取动作的核心逻辑位于 runqgrab 方法当中





### 6.  execute

![image-20240406012551254](/images/blog/static/image-20240406012551254.png)

当 g0 为 m 寻找到可执行的 g 之后，接下来就开始执行 g. 这部分内容位于 runtime/proc.go 的 execute 方法中：

```go
func execute(gp *g, inheritTime bool) {
    _g_ := getg()


    _g_.m.curg = gp
    gp.m = _g_.m
    casgstatus(gp, _Grunnable, _Grunning)
    gp.waitsince = 0
    gp.preempt = false
    gp.stackguard0 = gp.stack.lo + _StackGuard
    if !inheritTime {
        _g_.m.p.ptr().schedtick++
    }


    gogo(&gp.sched)
```

（1）更新 g 的状态信息，建立 g 与 m 之间的绑定关系；

（2）更新 p 的总调度次数；

（3）调用 gogo 方法，执行 goroutine 中的任务.
