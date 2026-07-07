# JOURNEYOS 宪法 — 精简改进建议

用途：为每条宪法条款添加可操作的“验收问题”（Acceptance Checks）与简短的文案建议，便于设计/开发评审时快速判定是否符合原则。

核心宣言（建议 1–2 行，便于在 README 和 UI 中引用）
- EN: Keep the journey. Not the noise.
- CN: 留下旅程，而不是喧嚣。

针对条款的验收问题与简短建议

ARTICLE 0 - KEEP THE JOURNEY. NOT THE NOISE.
- 验收问题：这个改动是否减少了展示或互动的噪音？是否把注意力拉回到瞬间（Moment）？
- 建议文案（简短）: "Preserve moments; remove distraction."

ARTICLE 1 - LESS IS MORE
- 验收问题：此功能是否可以删减？是否能合并或隐藏为默认关闭？
- 建议：在所有新 feature 的 PR 模板中加入“必要性说明（Why this preserves memory）”。

ARTICLE 2 - THE BEAUTY OF LESS
- 验收问题：界面是否保持安静与呼吸感？是否移除了多余标签或徽章？
- 建议：在 UI 变更审批中加入“视觉噪音检查表”。

ARTICLE 3 - LOCAL FIRST
- 验收问题：数据的默认存储位置是否为本地？云同步是否为显式开启？
- 建议：在 `CONTRIBUTING.md` 和 `README.md` 明确“本地优先”策略与实现检查点。

ARTICLE 4 - PRIVACY BY DEFAULT
- 验收问题：任何默认可见项是否为私密？分享是否需要显式确认与回顾？
- 建议：实现分享前的隐私预览（审查步）并在策略中强制说明。

ARTICLE 5 - MEMORY BEFORE FEATURES
- 验收问题：该功能是否直接增加记忆价值？是否降低认知负担？
- 建议：在 feature spec 添加“Memory Impact”字段并在评审中评分（内部参考）。

ARTICLE 6 - AI MUST BE INVISIBLE
- 验收问题：AI 输出是否为建议草稿且保留原始文本？AI 是否被显式标记为草稿？
- 建议：前端在采纳任何 AI 建议前必须展示“原文 → 建议 → 采纳/编辑/忽略”的流程。

ARTICLE 7 - SHARING IS A GIFT
- 验收问题：分享是否需要用户主动操作并提供隐私复核？分享 UI 是否极简优雅？
- 建议：把分享放在次级动作菜单，加入“分享意图”说明步骤。

ARTICLE 8 - THE JOURNEY IS THE HERO
- 验收问题：信息层次是否以时间/地点/体验/记忆为首要？UI 元素是否服从这些维度？
- 建议：在主要视图（Moment、Day、Journey）只呈现四要素（Time/Place/Photo/Memory）为默认布局。

ARTICLE 9 - ONE PERSON FIRST
- 验收问题：功能是否针对单一用户体验优化？是否避免团队/企业复杂性？
- 建议：标注任何多人/协作功能为“高级/实验性”，且默认关闭。

ARTICLE 10 - EVERY SCREEN MUST BREATHE
- 验收问题：加载 3 秒内能否理解当前页面？屏幕是否有足够空白与视觉焦点？
- 建议：把“3 秒可理解”加入设计验收标准并在可用性评审中验证。

FINAL PRINCIPLE
- 验收问题：这个改动是否是为了让人更好地经历与记住旅程，而不是提升使用软件的技巧？
- 建议：把此句作为 README 与产品启动页的首要价值宣言。

快速执行项（首批）
- 在项目根 README 顶部加入“宪法摘要”与链接到此文件。
- 在 `CONTRIBUTING.md` / PR 模板加入“Memory Impact / Privacy Check / Local-First” 三项必答字段。
- 在 `app/` 关键视图的设计任务中加入“3 秒理解”与“四要素优先”的验收准则。

------
如需，我可以把这些建议直接内嵌回 `JOURNEYOS_CONSTITUTION.md`（替换或附加），或创建对应的 PR/commit。请选择下一步。
