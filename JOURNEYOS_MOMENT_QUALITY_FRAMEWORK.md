# JourneyOS Moment Quality Framework V1.0

## 瞬间质量体系

---

# 0. Core Definition / 核心定义

JourneyOS 的最小价值单位不是：

- Trip
- Journey
- Day
- Event
- Photo
- Text

而是：

## Moment（瞬间）

Moment 是一个人在某一个时间、某一个地点、某一种状态下真实经历的一刻。

JourneyOS 不收集数据。

JourneyOS 保存 Moment。

---

# 1. Core Principle / 核心原则

## Data is not collected.

## Data is born from meaningful moments.

中文：

数据不是被收集出来的。

数据是在真实、有意义的瞬间中自然产生的。

---

# 2. Moment Definition / Moment 的定义

一个 Moment 是：

```text
Moment
=
Time
+
Place
+
Visual
+
Words
+
Emotion
+
Context
+
Memory
```

---

# 3. Moment Quality Framework Model / 总体模型

每一个 Moment 由 7 个质量维度组成：

```text
             Memory
               ↑

Context ← Emotion ← Moment → Visual

               ↓
         Time + Place + Words
```

---

# 4. Seven Quality Dimensions / 七大质量维度

---

## 4.1 Time Quality / 时间质量

### 定义

记录这个瞬间发生的准确时间，以及它在人生中的时间意义。

### 数据

必须包含：

- timestamp
- date
- time

可选：

- sunrise/sunset
- duration
- time period

### 高质量 Moment

不仅知道：

"什么时候"

还知道：

"人生哪个阶段"

例如：

错误：

```text
2026-07-07 18:42
```

正确：

```text
2026-07-07 18:42
第一次独自驾驶美国西部公路的傍晚。
```

---

## 4.2 Place Quality / 空间质量

### 定义

记录这个瞬间发生在哪里。

但位置不是 GPS。

位置是：

空间记忆。

### 数据

包含：

- location
- city
- country
- place name

后台可保存：

- latitude
- longitude

### 展示原则

用户看到：

```text
Flagstaff, Arizona
```

而不是：

```text
35.1982,-111.6513
```

### 地图原则

地图不是导航。

地图是：

空间印记。

---

## 4.3 Visual Quality / 视觉质量

### 定义

照片不是附件。

照片是 Moment 的视觉入口。

### 原则

一张代表性照片 > 十张无意义照片。

### 系统能力

支持：

- photo
- video
- screenshot

未来 AI 可辅助：

- 精选代表照片
- 去除重复照片
- 生成视觉故事

### 质量判断

高质量照片：

- 有情绪
- 有环境
- 有故事

低质量照片：

- 重复
- 无意义截图
- 单纯记录

---

## 4.4 Words Quality / 语言质量

### 定义

用户留下的一句话，是 Moment 的声音。

### 不要求

不要求长文章。

不要求日记。

### 最佳状态

一句真实的话。

例如：

```text
今天第一次感觉旅程真正开始。
```

### 输入方式

支持：

- typing
- voice
- AI transcription

---

## 4.5 Emotion Quality / 情绪质量

### 定义

这是 JourneyOS 最重要的长期价值。

机器可以知道：

去了哪里。

但是只有人知道：

为什么重要。

### 情绪识别

情绪标签不是用户填写。

AI 可以辅助识别：

- freedom
- peace
- surprise
- joy
- gratitude
- nostalgia

中文：

- 自由
- 平静
- 惊喜
- 感动
- 怀念

### 注意

情绪不是评分。

不是：

```text
开心 90%
悲伤 20%
```

情绪是：

理解。

---

## 4.6 Context Quality / 背景质量

### 定义

为什么这一刻值得保存。

Context 可以来自：

- Journey 背景
- 人物
- 事件
- 目标
- 关系

例如：

普通照片：

```text
一杯咖啡。
```

Context：

```text
这是孩子第一次独立选择早餐的早晨。
```

价值完全不同。

---

## 4.7 Memory Quality / 记忆质量

### 定义

Moment 最终是否能够成为未来值得打开的记忆。

Memory Quality 是综合结果。

考虑：

- 时间
- 地点
- 视觉
- 文字
- 情绪
- 背景

---

# 5. Moment Quality Score / 瞬间质量评分

注意：

这个评分不是给用户看的。

不是排行榜。

只是系统内部判断。

建议：

```text
Moment Quality Score

Time       15%
Place      15%
Visual     20%
Words      15%
Emotion    20%
Context    15%

Total      100%
```

V1 不实现评分算法。

评分仅作为未来内部判断框架，不成为用户界面。

---

# 6. User Experience Principle / 用户体验原则

不要要求用户填写全部信息。

Moment 必须自然产生。

最低质量：

- 一张照片
- 或一句话
- 或一段声音

完整 Moment：

```text
照片 + 时间 + 地点 + 情绪 + 文字
```

---

# 7. AI Role in Moment / AI 在 Moment 中的角色

AI 不创造 Moment。

AI 不替代体验。

AI 只负责：

## Capture Assistance

帮助捕捉。

## Memory Enhancement

帮助丰富。

## Story Formation

帮助连接。

## Future Inspiration

帮助发现未来可能。

---

# 8. Moment Growth Model / Moment 成长模型

Moment 不是静态对象。

Moment 可以持续成长。

生命周期：

```text
Capture

↓

Moment

↓

Enriched Moment

↓

Memory

↓

Story

↓

Journey Book
```

例如：

```text
18:42 创建 Moment：
照片。

晚上：
增加一句话。

第二天：
增加语音。

旅行结束：
形成 Story。
```

---

# 9. Forbidden Design / 禁止设计

JourneyOS 不允许：

- 强制填写表单
- 强制分类
- 强制标签
- 强制评价
- 强制评分

因为：

真实记忆不是表格。

---

# 10. Final Product Judgment / 最终产品判断标准

任何功能新增前必须回答：

是否帮助用户产生更好的 Moment？

如果：

否。

删除。

---

# 11. JourneyOS Final Principle / 最终原则

JourneyOS 不保存照片。

保存照片背后的那一刻。

JourneyOS 不保存地点。

保存人在那个地方的经历。

JourneyOS 不保存文字。

保存人在那个时间想说的话。

---

# Final Statement

Every Moment matters.

每一个当下，都值得被认真保存。

JourneyOS exists to preserve meaningful moments.

---

# V1 Implementation Boundary / V1 实现边界

第一阶段只实现：

1. Moment 数据模型
2. Moment 创建流程
3. Moment 展示方式
4. Moment 与时间轴关联

不实现：

- Moment Quality Score 算法
- 用户可见评分
- 强制补全表单
- AI 质量判断

Framework 的价值是约束 JourneyOS 不走向数据管理系统。

Moment Quality 是产品灵魂，不是功能堆叠。
