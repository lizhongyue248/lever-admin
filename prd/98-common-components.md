# 98 公共组件规范

本文档定义 `lever-admin` 中可跨页面复用的公共组件范围、使用方式、引用方式和 PRD 书写要求。后续新增或修改页面 PRD 时，必须说明该页面使用了哪些公共组件；即使暂不使用公共组件，也需要写明“不使用公共组件”及原因。

## 目标

- 统一跨页面高频 UI 和交互，减少各页面重复实现。
- 保持表格、分页、弹窗、状态展示等基础体验一致。
- 让页面 PRD 在设计阶段就明确哪些能力来自公共组件，哪些能力由页面局部组件负责。
- 降低后续重构成本，避免同类功能在多个页面各写一套。

## 适用范围

公共组件适用于跨两个及以上页面、跨不同业务域或后续预计复用的 UI/交互能力，例如：

- 表格容器、表头、滚动视口和行渲染。
- 分页控件、页码输入和每页条数切换。
- 通用空态、错误态、加载态。
- 通用确认弹窗、危险操作提示。
- 通用筛选器、搜索框组合、刷新按钮组。
- 跨页面一致的详情 Sheet、状态 Badge、复制按钮等。

不适合作为公共组件的内容：

- 只服务单个页面的业务表单。
- 与单个 tRPC procedure 强绑定的业务逻辑。
- 页面专属布局、文案、字段映射、权限判断和 mutation 操作。
- 尚未出现复用需求且抽象边界不清晰的临时 UI。

## 文件位置

全局公共组件放在：

```txt
src/components/
```

shadcn/ui 基础组件放在：

```txt
src/components/ui/
```

页面局部组件仍放在各自路由目录：

```txt
src/app/<route>/_components/
```

判断规则：

- 跨多个页面复用：放入 `src/components/`。
- 只在一个 route group 内复用：放入该 route group 的 `_components/`。
- 只在单个页面使用：放入该页面自己的 `_components/`。
- shadcn/ui primitive：放入或引用 `src/components/ui/`。

## 当前公共组件

### `DataPagination`

路径：

```txt
src/components/data-pagination.tsx
```

作用：

- 提供统一分页控件。
- 首页、上一页、下一页、末页均为图标按钮。
- 页码使用数字输入框，输入后按 Enter 跳转。
- 支持可选每页条数下拉。
- 保持分页按钮可访问名称，便于键盘使用和 E2E 测试。

引用方式：

```tsx
import { DataPagination } from "@/components/data-pagination"
```

典型用法：

```tsx
<DataPagination
  disabled={query.isFetching}
  itemCount={data.items.length}
  onPageChange={setPage}
  onPageSizeChange={(nextPageSize) => {
    setPageSize(nextPageSize)
    setPage(1)
  }}
  page={data.page}
  pageCount={data.pageCount}
  pageSize={pageSize}
  pageSizeOptions={[10, 20, 50]}
  total={data.total}
/>
```

页面职责：

- 页面负责维护 `page`、`pageSize` 和筛选状态。
- 页面负责切换筛选条件或每页条数时回到第一页。
- 服务端接口负责限制最大 `pageSize`。

公共组件职责：

- 渲染分页 UI。
- 处理页码输入、Enter 提交和页码范围纠正。
- 渲染可访问的图标按钮和每页条数菜单。

### `DataTable`

路径：

```txt
src/components/data-table.tsx
```

作用：

- 提供统一桌面表格容器。
- 内部基于 `@tanstack/react-table`。
- 统一表头、行、单元格渲染。
- 提供固定表头和单一滚动视口。
- 支持横向滚动条可见，避免被分页区遮挡。
- 支持行点击和行内按钮/菜单事件隔离。

引用方式：

```tsx
import { type ColumnDef } from "@tanstack/react-table"
import { DataTable } from "@/components/data-table"
```

典型用法：

```tsx
const columns: Array<ColumnDef<UserRow>> = [
  {
    cell: ({ row }) => (
      <div>
        <div className="font-medium">{row.original.name}</div>
        <div className="text-muted-foreground text-xs">{row.original.email}</div>
      </div>
    ),
    header: "用户",
    size: 260
  }
]

<DataTable
  columns={columns}
  data={items}
  getRowId={(row) => row.id}
  minWidthClassName="min-w-[860px]"
  onRowClick={(row) => onOpen(row.id)}
  rowTestId={(row) => `user-row-${row.id}`}
/>
```

页面职责：

- 页面定义业务列 `columns`。
- 页面定义字段格式化、状态 Badge、行操作按钮和权限控制。
- 页面保留移动端卡片列表或页面专属响应式结构。
- 页面处理筛选、查询、mutation、详情 Sheet 和 toast。

公共组件职责：

- 使用 TanStack Table 渲染列、表头、行和单元格。
- 统一滚动视口、固定表头和表格基础样式。
- 提供 `rowTestId`、`onRowClick`、`minWidthClassName`、`maxHeightClassName` 等通用扩展点。

## 页面 PRD 写法要求

后续新增或修改任何页面级 PRD 时，必须包含“公共组件使用”说明。推荐放在“页面布局”或“实现要点”中。

页面使用公共组件时，写法示例：

```markdown
## 公共组件使用

- 桌面表格使用 `src/components/data-table.tsx` 的共享 `DataTable`，页面只定义业务列、行操作和移动端卡片。
- 分页控件使用 `src/components/data-pagination.tsx` 的共享 `DataPagination`，页面负责维护 `page`、`pageSize` 和筛选状态。
```

页面不使用公共组件时，写法示例：

```markdown
## 公共组件使用

- 本页不使用共享表格或共享分页组件，因为第一版没有列表或分页交互。
- 如后续新增表格、分页或通用状态展示，应优先评估 `98-common-components.md` 中定义的公共组件。
```

如果页面需要新增公共组件，PRD 必须说明：

- 新公共组件名称。
- 放置路径。
- 复用范围。
- 页面负责什么，公共组件负责什么。
- 与现有公共组件的关系，是否替代或扩展已有组件。
- 对应 E2E 或验收标准如何覆盖。

## 设计要求

- 公共组件的视觉样式应参考现有 Dashboard 设计稿和 `prd/component-design.pen`。
- 公共组件不得绑定单个页面文案、业务接口或权限规则。
- 公共组件必须支持浅色和暗色模式。
- 图标按钮必须提供 `aria-label` 或等价可访问名称。
- 固定尺寸或密集控件需要设置稳定宽高，避免 hover、loading 或数据变化造成布局跳动。
- 表格类组件必须保证表头、横向滚动条和分页区不会互相遮挡。

## 实现要求

- 公共组件默认放在 `src/components/`。
- 组件应使用严格 TypeScript 类型，不使用 `any`。
- 跨页面表格优先使用 TanStack Table。
- 常见 primitive 优先引用 `src/components/ui/` 中的 shadcn/ui 组件。
- 组件内部只处理通用交互，不直接调用 tRPC、不做页面跳转、不写业务 toast。
- 组件 props 应保持稳定、明确，避免传入整页业务上下文。
- 如果组件包含行点击，同时包含行内按钮、菜单或链接，必须阻止交互元素触发行点击。

## E2E 与验收要求

公共组件不要求单独建立组件测试；第一阶段继续以 Playwright E2E 验证真实页面行为。

页面使用公共组件时，应在对应页面 E2E 中覆盖：

- 公共分页：首页、上一页、下一页、末页、页码输入和每页条数切换。
- 公共表格：表格可见、行可点击、行内操作按钮可用、表头固定、滚动区域不遮挡分页。
- 可访问名称：图标按钮可以通过 `getByRole` 定位。
- 空态、加载态、错误态仍由页面按 PRD 展示。

## 维护规则

- 修改公共组件行为时，必须同步更新本文档。
- 页面 PRD 中提到公共组件行为时，应与本文档保持一致。
- 如果页面因特殊需求偏离公共组件规范，必须在页面 PRD 中写明原因和差异。
- 新增公共组件前先搜索现有 `src/components/` 和 `src/components/ui/`，避免重复造轮子。
- 公共组件一旦影响多个页面，修改时必须运行相关页面的 E2E 或至少运行覆盖该组件核心行为的页面 E2E。
