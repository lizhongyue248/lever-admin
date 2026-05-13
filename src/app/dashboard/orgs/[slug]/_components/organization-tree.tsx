"use client"

import { ChevronDown, ChevronRight, Circle, FolderPlus, Pencil, Trash2, TriangleAlert } from "lucide-react"
import type * as React from "react"
import { useEffect, useMemo, useState } from "react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"

export type OrganizationTreeNode = {
  depth: number
  id: string
  invitationCount: number
  memberCount: number
  name: string
  parentId: null | string
  riskCount: number
  slug: string
  status: string
  type: "department" | "organization"
}

type TreeRowProps = {
  childrenByParent: Map<null | string, OrganizationTreeNode[]>
  expanded: Set<string>
  node: OrganizationTreeNode
  onOpenContextMenu: (event: React.MouseEvent, node: OrganizationTreeNode) => void
  onSelect: (nodeId: string) => void
  selectedId: null | string
  toggle: (nodeId: string) => void
}

type ContextMenuState = {
  node: OrganizationTreeNode
  x: number
  y: number
}

const TreeRow = ({ childrenByParent, expanded, node, onOpenContextMenu, onSelect, selectedId, toggle }: TreeRowProps) => {
  const children = childrenByParent.get(node.id) ?? []
  const hasChildren = children.length > 0
  const isExpanded = expanded.has(node.id)
  const selected = selectedId === node.id

  return (
    <Collapsible onOpenChange={() => toggle(node.id)} open={isExpanded}>
      <div
        aria-selected={selected}
        className={cn("group relative flex h-8 items-center gap-1 rounded-md pr-2 text-sm transition-colors hover:bg-muted/70", selected && "bg-primary/10 text-primary")}
        onContextMenu={(event) => onOpenContextMenu(event, node)}
        role="treeitem"
        style={{ paddingLeft: 8 + node.depth * 18 }}
        tabIndex={0}
      >
        {selected ? <span className="absolute left-0 h-5 w-1 rounded-full bg-primary" /> : null}
        <CollapsibleTrigger asChild disabled={!hasChildren}>
          <Button aria-label={hasChildren ? "展开或折叠组织节点" : "叶子节点"} className="size-6 shrink-0 p-0" size="icon" type="button" variant="ghost">
            {hasChildren ? (
              isExpanded ? (
                <ChevronDown className="size-3.5" />
              ) : (
                <ChevronRight className="size-3.5" />
              )
            ) : (
              <Circle className="size-1.5 fill-current text-muted-foreground" />
            )}
          </Button>
        </CollapsibleTrigger>
        <button className="flex min-w-0 flex-1 items-center gap-2 text-left" onClick={() => onSelect(node.id)} type="button">
          <span className="size-2.5 shrink-0 rounded-[4px] bg-primary/15" />
          <span className="truncate font-medium">{node.name}</span>
        </button>
        <span className="shrink-0 text-muted-foreground text-xs">{node.memberCount}</span>
        {node.invitationCount > 0 ? (
          <Badge className="h-5 px-1.5 text-[10px]" variant="secondary">
            {node.invitationCount}
          </Badge>
        ) : null}
        {node.riskCount > 0 ? <TriangleAlert className="size-3.5 shrink-0 text-destructive" /> : null}
      </div>
      {hasChildren ? (
        <CollapsibleContent>
          <div className="border-muted border-l">
            {children.map((child) => (
              <TreeRow
                childrenByParent={childrenByParent}
                expanded={expanded}
                key={child.id}
                node={child}
                onOpenContextMenu={onOpenContextMenu}
                onSelect={onSelect}
                selectedId={selectedId}
                toggle={toggle}
              />
            ))}
          </div>
        </CollapsibleContent>
      ) : null}
    </Collapsible>
  )
}

export const OrganizationTree = ({
  canManage = false,
  nodes,
  onCreateDepartment,
  onDeleteDepartment,
  onRenameDepartment,
  onSelect,
  selectedId
}: {
  canManage?: boolean
  nodes: OrganizationTreeNode[]
  onCreateDepartment: () => void
  onDeleteDepartment?: (node: OrganizationTreeNode) => void
  onRenameDepartment?: (node: OrganizationTreeNode) => void
  onSelect: (nodeId: string) => void
  selectedId: null | string
}) => {
  const childrenByParent = useMemo(() => {
    const map = new Map<null | string, OrganizationTreeNode[]>()
    for (const node of nodes) {
      const siblings = map.get(node.parentId) ?? []
      siblings.push(node)
      map.set(node.parentId, siblings)
    }
    return map
  }, [nodes])
  const [expanded, setExpanded] = useState(() => new Set(nodes.filter((node) => node.depth === 0 || node.riskCount > 0).map((node) => node.id)))
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null)
  const roots = childrenByParent.get(null) ?? nodes.filter((node) => node.depth === 0)

  useEffect(() => {
    if (!contextMenu) {
      return
    }

    const close = () => setContextMenu(null)
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        close()
      }
    }

    window.addEventListener("click", close)
    window.addEventListener("keydown", closeOnEscape)

    return () => {
      window.removeEventListener("click", close)
      window.removeEventListener("keydown", closeOnEscape)
    }
  }, [contextMenu])

  const toggle = (nodeId: string) => {
    setExpanded((current) => {
      const next = new Set(current)

      if (next.has(nodeId)) {
        next.delete(nodeId)
      } else {
        next.add(nodeId)
      }

      return next
    })
  }

  const openContextMenu = (event: React.MouseEvent, node: OrganizationTreeNode) => {
    if (!canManage || node.type !== "department") {
      return
    }

    event.preventDefault()
    onSelect(node.id)
    setContextMenu({ node, x: event.clientX, y: event.clientY })
  }

  return (
    <Card className="rounded-lg py-0 shadow-sm">
      <CardHeader className="flex flex-row items-start justify-between gap-3 px-4 pt-4 pb-0">
        <div className="space-y-1">
          <h2 className="font-semibold text-base">组织结构</h2>
          <p className="text-muted-foreground text-xs">展开、折叠并选择公司或部门节点。</p>
        </div>
        <Button aria-label="添加部门" onClick={onCreateDepartment} size="icon" title="添加部门" type="button">
          <FolderPlus className="size-4" />
        </Button>
      </CardHeader>
      <CardContent className="p-4">
        <ScrollArea className="h-[548px] rounded-lg border bg-background p-2">
          <div className="space-y-0.5" role="tree">
            {roots.map((node) => (
              <TreeRow
                childrenByParent={childrenByParent}
                expanded={expanded}
                key={node.id}
                node={node}
                onOpenContextMenu={openContextMenu}
                onSelect={onSelect}
                selectedId={selectedId}
                toggle={toggle}
              />
            ))}
          </div>
        </ScrollArea>
        <p className="mt-3 text-muted-foreground text-xs">紧凑树行：32px 行高，支持展开、折叠和选择。</p>
      </CardContent>
      {contextMenu ? (
        <div
          className="fixed z-50 min-w-36 rounded-md border bg-popover p-1 text-popover-foreground shadow-md"
          onClick={(event) => event.stopPropagation()}
          role="menu"
          style={{ left: contextMenu.x, top: contextMenu.y }}
        >
          <button
            className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent focus:bg-accent focus:outline-none"
            onClick={() => {
              setContextMenu(null)
              onRenameDepartment?.(contextMenu.node)
            }}
            role="menuitem"
            type="button"
          >
            <Pencil className="size-4 text-muted-foreground" />
            重命名部门
          </button>
          <button
            className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-destructive text-sm hover:bg-destructive/10 focus:bg-destructive/10 focus:outline-none"
            onClick={() => {
              setContextMenu(null)
              onDeleteDepartment?.(contextMenu.node)
            }}
            role="menuitem"
            type="button"
          >
            <Trash2 className="size-4" />
            删除部门
          </button>
        </div>
      ) : null}
    </Card>
  )
}
