---
title: "Go Option 模式"
description: "通过函数与接口组织可选参数，记录 Go Option 模式的使用方式。"
date: "2026-10-16"
dateLabel: "收录"
kind: "article"
tags: ["Go", "设计模式"]
featured: true
legacy: true
---

option 选项，它在工程代码中运用比较广泛，就是表示可选可不选，所以option常作为不定长参数出现。参数类型既可以是一个函数，也可以是一个接口。





## 案例一：类型为函数的option

用option模式给结构体的成员变量赋值

```go
package main


import "fmt"

// option模式没有固定的应用场景，通常作为不定长参数(所以叫option)。
// 通过type把Option定义为函数或接口

type User struct {
	Name string
	Age int
}

type UserOption func(*User)

func WithName(name string) UserOption {
    return func(u *User){
        u.Name = name
    }
}

func WithAge(age int) UserOption {
    return func(u *User){
        u.Age = age
    }
}

func NewUser(options ...UserOption) *User {
    user := new(User)
    
    for _, option := range options {
        option(user)
    }
    
    return user
}

func main() {
    user := NewUser(WithName("today"), WithAge(20))
    
    fmt.Println(user)
}
```





## 案例二：类型为接口的option

检索option

```go
type QuerOtion interface {
    // 从数据库中检索到若干个User, 需要通过各种option进行过滤，返回剩下的User
    Apply([]*User) []*User
}

// 实现姓名和年龄在某个局限内
type Where struct {
	Name string
    FromAge int
    ToAge int
}

func (w *Where) Apply(users []*User) []*User {
    rect := make([]*User, 0, len(users))
    for _, user := range users {
        if user.Name w.Name && user.Age >= w.FromAge && user.Age <= w.ToAge {
            rect = append(rect, user)
        }
    }
    return rect
}

// 指定偏量和数量, 从Offset开始截取Count个*User对象
type Limit struct {
	Offset int
    Count int
}

func (l *Limit) Apply(users []*User) []*User {
    if l.Offset >= len(users) {
        return nil
    }
    if l.Offset+l.Count >= len(users) {
        return users[l.Offset:]
    }
    return users[l.Offset : l.Offset+l.Count]
}

func QuserUser(users []*User, options ...QuerOtion) []*User {
    rect := users
    for _, opt := range options {
        rect = opt.Apply(rect)
    }
    return rect
}

func main(){
    user := NewUser(WithName("today"), WithAge(20))
    users := []*User{user}
    
    QuserUser(users, Where{Name: "today"}, Limit{Offset: 0, Count: 3})
}
```





## 小结：

如果接触过Python的函数就会对Python中的参数列表不模式，Python的函数参数非常灵活，支持：不定长参数，位置参数，名称参数，默认参数等。

Go作为解释型语言，没办法像Python那么灵活，Option模式在一定程度上对Go函数参数功能做补充。



案例一是option模式最常见的用法，也非常好理解，代码在New结构体时就已经给定默认初始值，但是我们在调用其构造函数时，有可能会对它其中的参数进行设置，所以就可以使用option模式，核心在可选择。

同时option模式对代码安全也有一定的帮助，在案例一中，User对象中的两个成员变量可以都是私有的，使用option模式提供修改私有成员变量的方式。
