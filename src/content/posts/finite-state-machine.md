---
title: "有限状态机"
description: "从概念、应用场景到代码理解有限状态机。"
date: "2026-10-16"
dateLabel: "收录"
kind: "article"
tags: ["Go", "设计模式"]
featured: false
legacy: true
---

有限状态机简称FSM(finite state machine)，它通过定义某个实例的一系列状态，当实例触发某些行为就可以在一系列状态中来回切换。



## 1. 什么是有限状态机

现实事物是有不同状态的，例如一个显示器，就有 `亮` 和 `灭` 两种状态。我们通常所说的状态机是有限状态机，也就是被描述的事物的状态的数量是有限个，例如显示器的状态就是两个： `亮` 和 `灭` 。

<img src="/images/blog/static/image-20240401130159169.png" alt="image-20240401130159169" style="zoom:67%;" />

在这里我们的"亮"和"熄"就是"状态(state)"，箭头表示的就是状态之间可以发生"转换(transition)"，而剪头上标注的文字代表触发状态转换的"输入(input)"，这几本就是一个状态机的基本概念了。

显示器只有两个状态,没什么意思，我们来看一个最常见的红绿灯：

<img src="/images/blog/static/image-20240401130256035.png" alt="image-20240401130256035" style="zoom:67%;" />

这里有:

- 有三种状态：绿，黄，红；
- 状态转换是受限的，绿只能转黄，黄只能转红，红只能转绿；诸如黄转绿这样的状态转换是不允许的；
- 状态转换的输入条件很简单，接收到 1 就转换到下一个状态。

所以我们可以归纳总结一下，出以下**四个概念：**

- 第一个是 State ，状态。一个状态机至少要包含两个状态。例如上面显示器的例子，有 `亮` 和 `灭` 两个状态。
- 第二个是 Event ，事件。事件就是执行某个操作的触发条件或者口令。对于显示器，“按下开关按钮”就是一个事件。
- 第三个是 Action ，动作。事件发生以后要执行动作。例如事件是“按下开关按钮”，动作是“开灯”。编程的时候，一个 Action一般就对应一个函数。
- 第四个是 Transition ，变换。也就是从一个状态变化为另一个状态。例如“开灯过程”就是一个变换。



简单说，==有限状态机就是一台预先定义好了各种状态的一组状态的机器，当机器接收到一个指令之后就根据指令内容查一张预先定义好的表==:

1. 检查当前状态是否符合预期，即处于当前状态的机器是否接收具体指令
2. 如果不接受，比如红灯状态接受到了2，那么什么都不会发生
3. 如果接受，再检查表中“当前状态x该指令”对应的目标状态是什么，然后把机器状态转换为目标状态

至于何时发送指令给状态机，那是由外部系统决定的，比如红绿灯的例子里，外部系统是几个定时器，时间到了就发信号给有限状态机切换状态。





## 2. 有限状态机的抽象定义

<img src="/images/blog/static/image-20240401131018671.png" alt="image-20240401131018671" style="zoom:67%;" />

上图所示, 每个FSM都包含五个要素:

- Q 包含了有限个状态(states)的集合
- ∑ 包含了有限个、非空的有效输入(input)的集合
- q0 起始状态
- F 包含了所有“结束状态（final states）”的集合，这个名字容易误解，它的作用和有限状态机的具体类型及面对的问题有关，我们可以简单理解为“标记出来有特别含义的状态的集合”就可以了，注意这个集合可以是空的。
- δ 一系列转换函数（transition functions），定义了什么样的当前状态结合什么输入可以变成什么目标状态，通常可以定义为一张二维表

在计算机编程领域FSM最广泛的应用之一就是==流程与行为控制(flow and behavior control)==，简单来说就是管理:

- 某个状态下什么能做什么不能做
- 做了什么会变成另一个状态

现实世界中有许多应用FSM的地方，我们日常生活中最常用的就有电商系统的订单系统:

我们用过淘宝天猫的都知道，一个订单从创建开始就要经历好几个状态，中间也有不同的操作可以进行，下面是一个比较典型的流程设计，经过简化，并以“状态”的视角来描述:

<img src="/images/blog/static/image-20240401131123582.png" alt="image-20240401131123582" style="zoom:50%;" />

在这个状态机中包含着一系列状态和对应的状态转换行为，还有一系列操作没有展开，比如订单取消到订单退款的细节..

流程说明:

- 当买家点击下单时订单生成，处于“已创建”状态；
- 这个状态下的正常操作是“支付”，如果输入“支付成功”会进入下一个状态“已支付”，“支付失败”或者没有任何操作则停在本状态；
- 这个状态下其他可选操作包括“修改”、“取消”等，分别会去到订单修改和订单取消子流程（这里略去细节）；
- 支付成功后进入处于“已支付”状态；
- 这个状态下需要等待商家发货，商家输入“已发货”会进入下一个状态“配送中”；
- 这个状态下不能修改订单了，但仍然可以取消订单；
- 商家发货后进入“配送中”状态；
- 当配送到货，买家签收成功输入则进入下一个状态“已签收”；如果配送失败（买家不在家之类的情况）则留在“配送中”状态（另外择时重新送货）；
- 这个状态下已不能修改和取消订单，但是可以发起退货申请，进入退货子流程（这里略去细节）；
- 买家签收后进入“已签收”状态；
- 买家满意，确认订单完成则进入最后状态“已完成”，订单生命周期结束；
- 否则买家可以发起退货进入退货子流程（略）。

从这里我们可以看到，实际业务系统中状态和转换的规则相当复杂（我们这还是大大简化的版本），每个状态下允许的操作和可能转换的下一个状态都是严格受控的，现在我们思考一下，我们可以如何用程序来实现这样的流程呢？



## 3. Coding

前面我们了解了==流程和行为控制（flow and behavior control）==的关键是管理：

1. 某个状态下什么能做什么不能做
2. 做了什么会变成另一个状态

最简单的方式是写很对`if...else`的判断规则

```go
package main

type OrderState int

const (
	CREATE OrderState = iota
	PAID
	DELIVERING
	RECEIVED
	DONE
	CANCELLING
	RETURNING
	CLOSED
)

type Order struct {
	state OrderState
}

func NewOrder() *Order {
	return &Order{
		state: CREATE,
	}
}

func (o *Order) can_pay() bool {
	return o.state == CREATE
}

func (o *Order) can_deliver() bool {
	return o.state == PAID
}

func (o *Order) can_cancel() bool {
	return o.state == CREATE || o.state == PAID
}

func (o *Order) can_receive() bool {
	return o.state == DELIVERING
}

func (o *Order) payment_service() bool {
	// 调用 RPC 接口完成支付
	return false
}

func (o *Order) pay() bool {
	if o.can_pay() {
		ok := o.payment_service()
		if ok {
			o.state = PAID
			return true
		} else {
			return false
		}
	} else {
		return false
	}
}
func (o *Order) cancel() bool {
	if o.can_cancel() {
		o.state = CANCELLING
		// 取消订单，申请审批和清理数据，如果顺利成功再——
		o.state = CLOSED
	} else {
		return false
	}
	return false
}
// 还有一大堆操作的函数，每一个里面都要判断状态是不是可以做想做操作
// 然后根据执行的情况修改 o.state 为对应的新状态
```

这样的代码没有抽象，非常冗长和重复，难以维护，增加一个状态需要修改很多地方。

Golang有不少FSM的第三方实现，比如 `github.com/looplab/fsm` 这个库，我们就可以用它来展示一下上面的流程如何用 FSM 来实现:

```go
package main

import (
	"context"
	"fmt"

	"github.com/looplab/fsm"
)

func main() {
	order := fsm.NewFSM(
		"created",
        // 定义事件
		fsm.Events{
			{Name: "pay", Src: []string{"created"}, Dst: "paid"},
			{Name: "deliver", Src: []string{"paid"}, Dst: "delivering"},
			{Name: "receive", Src: []string{"delivering"}, Dst: "received"},
			{Name: "confirm", Src: []string{"received"}, Dst: "done"},

			{Name: "cancel", Src: []string{"received", "paid"}, Dst: "cancelling"},
			{Name: "return", Src: []string{"delivering", "received"}, Dst: "returning"},
			{Name: "close", Src: []string{"cancelling", "returning"}, Dst: "closed"},
		},
        // 绑定事件对应的回调函数
		fsm.Callbacks{
			"before_pay": func(_ context.Context, e *fsm.Event) {
				fmt.Println("支付服务申请中……")
				// 发送 before_pay 服务
			},
			"paid": func(_ context.Context, e *fsm.Event) {
				fmt.Println("支付成功")
			},
			"after_deliver": func(_ context.Context, e *fsm.Event) {
				fmt.Println("已通知用户：商品配送中")
			},
			"cancel": func(ctx context.Context, e *fsm.Event) {
				fmt.Println("订单取消")
				e.Cancel()
			},
			"return": func(ctx context.Context, e *fsm.Event) {
				fmt.Println("订单返回")
				e.Cancel()
			},
			"close": func(ctx context.Context, e *fsm.Event) {
				fmt.Println("订单关闭")
				e.Cancel()
			},
		},
	)

	fmt.Println(order.Current())
	
    // 支付
	err := order.Event(context.Background(), "pay")
	if err != nil {
		fmt.Println(err)
	}

	fmt.Println(order.Current())
	
    // 派送
	err = order.Event(context.Background(), "deliver")
	if err != nil {
		fmt.Println(err)
	}
	fmt.Println(order.Current())

    // 接收
	err = order.Event(context.Background(), "receive")
	if err != nil {
		fmt.Println(err)
	}
	fmt.Println(order.Current())

    // 确认
	err = order.Event(context.Background(), "confirm")
	if err != nil {
		fmt.Println(err)
	}
	fmt.Println(order.Current())
}
```

运行程序输出：

```bash
// 输出
go run main.go
created
支付服务申请中……
支付成功
paid
已通知用户：商品配送中
delivering
received
done
```

除了具体业务执行的代码，上面基本上完整实现了流程控制的部分，值得注意的是，借助 FSM 的实现，不仅简洁易懂，而且易于维护，假定我们需要对流程规则进行修改，或者在某些状态转换的前后添加一些操作，我们通常都只需要修改一处代码，而不用到处找哪里还要改。



## 4. Go实现有限状态机

通过上文你可以了解到有限状态机的运行以及使用过程，下面是我在实际在项目中使用的FSM框架，没有做太多抽象，不过也够用了，如果你也想自己实现一个FSM，相信可以帮到你。

源码你可以在 https://github.com/todayVenturn/fsm 找到

### fsm.go

```go
package fsm

import (
	"fmt"
)

type EventType string
type StateType string
type ReturnVal int
type ArgsType map[string]interface{}

// Callback newEvtCtxt将在下一个状态被处理
type Callback func(StateType, EventType, ArgsType) (newEvtCtxt *FsmEventContext, rv ReturnVal)
type LogFunc func(format string, a ...any)

type FsmEvent struct {
	HandleFunc Callback
	TransTable map[ReturnVal]StateType
}

type FsmState struct {
	DefaultHandle *FsmEvent
	EventTable    map[EventType]*FsmEvent
}

type Fsm struct {
	fsmId      string
	initState  StateType
	stateTable map[StateType]*FsmState
	logFunc    LogFunc
}

type FsmInst struct {
	fsmInstId string
	currState StateType
	sm        *Fsm
}

type FsmEventContext struct {
	Event EventType
	Args  ArgsType
}

func NewFsmEventContext(event EventType, args ArgsType) *FsmEventContext {
	evtCtxt := &FsmEventContext{
		Event: event,
		Args:  args,
	}
	return evtCtxt
}

func NewFsm(fsmId string, initState StateType, stateTable map[StateType]*FsmState) *Fsm {
	fsm := &Fsm{
		fsmId:      fsmId,
		initState:  initState,
		stateTable: stateTable,
		logFunc:    nil,
	}
	return fsm
}

func NewFsmInst(sm *Fsm, fsmInstId string) *FsmInst {
	fsmInst := &FsmInst{
		fsmInstId: fsmInstId,
		currState: sm.initState,
		sm:        sm,
	}
	return fsmInst
}

func (sm *Fsm) SetLogFunc(logFunc LogFunc) {
	sm.logFunc = logFunc
}

func (fsmInst *FsmInst) HandleEventContext(eventContext *FsmEventContext) error {
	return fsmInst.HandleEvent(eventContext.Event, eventContext.Args)
}

func (fsmInst *FsmInst) HandleEvent(event EventType, args ArgsType) error {
	eventTemp := event
	argsTemp := args
	for {
		newEvtCtxt, err := fsmInst.HandleEventImpl(eventTemp, argsTemp)
		if err != nil {
			return err
		}
		if newEvtCtxt == nil {
			break
		}
		eventTemp = newEvtCtxt.Event
		argsTemp = newEvtCtxt.Args
	}
	return nil
}

func (fsmInst *FsmInst) HandleEventImpl(event EventType, args ArgsType) (*FsmEventContext, error) {
	sm := fsmInst.sm
	currState := fsmInst.currState
	
	if sm.stateTable == nil {
		return nil, fmt.Errorf("FSM[%s] INST[%s]: state table is nil", sm.fsmId, fsmInst.fsmInstId)
	}
	
	smState, ok := sm.stateTable[currState]
	if !ok {
		return nil, fmt.Errorf("FSM[%s] INST[%s]: Can not find state[%s]", sm.fsmId, fsmInst.fsmInstId, currState)
	}
	if smState == nil {
		return nil, fmt.Errorf("FSM[%s] INST[%s]: state is nil", sm.fsmId, fsmInst.fsmInstId)
	}
	
	smEvent, ok := smState.EventTable[event]
	if !ok {
		smEvent = smState.DefaultHandle
	}
	if smEvent == nil {
		return nil, fmt.Errorf("FSM[%s] INST[%s] STATE[%s]: event[%s] handle and default handle is nil", sm.fsmId, fsmInst.fsmInstId, currState, event)
	}
	if smEvent.HandleFunc == nil {
		return nil, fmt.Errorf("FSM[%s] INST[%s] STATE[%s]: handle func is nil", sm.fsmId, fsmInst.fsmInstId, currState)
	}
	newEvtCtxt, rv := smEvent.HandleFunc(currState, event, args)
	
	newState, ok := smEvent.TransTable[rv]
	if !ok {
		return nil, fmt.Errorf("FSM[%s] INST[%s] STATE[%s]: Can not find new state by callback return value %d",
			sm.fsmId, fsmInst.fsmInstId, currState, rv)
	}
	fsmInst.currState = newState
	
	if sm.logFunc != nil {
		sm.logFunc("FSM[%s] INST[%s]: %s[%s] --> %s\n", sm.fsmId, fsmInst.fsmInstId, currState, event, newState)
	}
	
	return newEvtCtxt, nil
}

func (fsmInst *FsmInst) CurrState() StateType {
	return fsmInst.currState
}

func (fsmInst *FsmInst) ResetState() {
	fsmInst.currState = fsmInst.sm.initState
}
```

### fsm_test.go

```go
package fsm_test

import (
	"fmt"
	"github.com/todayVenturn/fsm"
	"testing"
)

var testTime = 0

func fsm_test_default_handler1(state fsm.StateType, event fsm.EventType, args fsm.ArgsType) (newEvtCtxt *fsm.FsmEventContext, rv fsm.ReturnVal) {
	return nil, 0
}
func fsm_test_idle_state_handler1(state fsm.StateType, event fsm.EventType, args fsm.ArgsType) (newEvtCtxt *fsm.FsmEventContext, rv fsm.ReturnVal) {
	return nil, 0
}

func fsm_test_wait_ack_state_handler1(state fsm.StateType, event fsm.EventType, args fsm.ArgsType) (newEvtCtxt *fsm.FsmEventContext, rv fsm.ReturnVal) {
	if testTime%2 == 0 {
		rv = 0
	} else {
		rv = -1
	}
	testTime += 1
	return nil, rv
}

func fsm_test_wait_close_state_handler1(state fsm.StateType, event fsm.EventType, args fsm.ArgsType) (newEvtCtxt *fsm.FsmEventContext, rv fsm.ReturnVal) {
	return nil, 0
}

func fsmLogFunc(format string, a ...any) {
	fmt.Printf(format, a...)
}

func TestFSM(t *testing.T) {
	sm := fsm.NewFsm("TestFsm", "STATE_IDLE", map[fsm.StateType]*fsm.FsmState{
		"STATE_IDLE": {
			DefaultHandle: nil,
			EventTable: map[fsm.EventType]*fsm.FsmEvent{
				"EVENT_CONNECT": {
					fsm_test_idle_state_handler1, map[fsm.ReturnVal]fsm.StateType{
						0:  "STATE_WAIT_ACK",
						-1: "STATE_IDLE"}}}},
		"STATE_WAIT_ACK": {
			DefaultHandle: &fsm.FsmEvent{
				fsm_test_default_handler1, map[fsm.ReturnVal]fsm.StateType{
					0: "STATE_IDLE"}},
			EventTable: map[fsm.EventType]*fsm.FsmEvent{
				"EVENT_RCV_ACK": {
					fsm_test_wait_ack_state_handler1, map[fsm.ReturnVal]fsm.StateType{
						0:  "STATE_WAIT_CLOSE",
						-1: "STATE_IDLE"}}}},
		"STATE_WAIT_CLOSE": {
			DefaultHandle: nil,
			EventTable: map[fsm.EventType]*fsm.FsmEvent{
				"EVENT_CLOSE": {
					fsm_test_wait_close_state_handler1, map[fsm.ReturnVal]fsm.StateType{
						0: "STATE_IDLE"}}}},
	})
	fmt.Println("sm: ", sm)
	sm.SetLogFunc(fsmLogFunc)
	
	smInst := fsm.NewFsmInst(sm, "TestFsmInst")
	fmt.Println("sm: ", smInst)
	
	err := smInst.HandleEvent("EVENT_CONNECT", nil)
	if err != nil {
		t.Fatalf("%v", err)
	}
	if smInst.CurrState() != "STATE_WAIT_ACK" {
		t.Fatalf("state[%v] error", smInst.CurrState())
	}
	
	evtCtxt := &fsm.FsmEventContext{"EVENT_CONNECT", nil}
	err = smInst.HandleEventContext(evtCtxt)
	if err != nil {
		t.Fatalf("%v", err)
	}
	if smInst.CurrState() != "STATE_IDLE" {
		t.Fatalf("state[%v] error", smInst.CurrState())
	}
	
	err = smInst.HandleEvent("EVENT_CONNECT", nil)
	if err != nil {
		t.Fatalf("%v", err)
	}
	if smInst.CurrState() != "STATE_WAIT_ACK" {
		t.Fatalf("state[%v] error", smInst.CurrState())
	}
	
	err = smInst.HandleEvent("EVENT_RCV_ACK", nil)
	if err != nil {
		t.Fatalf("%v", err)
	}
	if smInst.CurrState() != "STATE_WAIT_CLOSE" {
		t.Fatalf("state[%v] error", smInst.CurrState())
	}
	
	err = smInst.HandleEvent("EVENT_CLOSE", nil)
	if err != nil {
		t.Fatalf("%v", err)
	}
	if smInst.CurrState() != "STATE_IDLE" {
		t.Fatalf("state[%v] error", smInst.CurrState())
	}
	
	err = smInst.HandleEvent("EVENT_CONNECT", nil)
	if err != nil {
		t.Fatalf("%v", err)
	}
	if smInst.CurrState() != "STATE_WAIT_ACK" {
		t.Fatalf("state[%v] error", smInst.CurrState())
	}
	
	err = smInst.HandleEvent("EVENT_RCV_ACK", nil)
	if err != nil {
		t.Fatalf("%v", err)
	}
	if smInst.CurrState() != "STATE_IDLE" {
		t.Fatalf("state[%v] error", smInst.CurrState())
	}
}
```
