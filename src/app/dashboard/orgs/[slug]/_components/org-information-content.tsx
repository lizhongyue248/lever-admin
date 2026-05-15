"use client"

import type { ColumnDef } from "@tanstack/react-table"
import { FolderInput, Loader2, UserMinus, UserPlus } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"

import { DataPagination } from "@/components/data-pagination"
import { DataTable } from "@/components/data-table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { api, type RouterOutputs } from "@/trpc/react"
import { formatDate, formatRelativeTime } from "../_lib/org-format"
import { OrgEmptyState } from "./org-empty-state"
import { OrganizationTree, type OrganizationTreeNode } from "./organization-tree"

type TreeData = RouterOutputs["org"]["department"]["list"]
type MembersData = RouterOutputs["org"]["department"]["member"]["list"]
type MemberItem = MembersData["items"][number]
type TreeNode = OrganizationTreeNode
type OrganizationRole = "admin" | "member" | "owner"

const selectClassName =
  "h-9 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"

export const OrgInformationContent = ({
  canManage,
  initialMembers,
  isPlatformAdmin,
  slug,
  tree
}: {
  canManage: boolean
  initialMembers: MembersData
  isPlatformAdmin: boolean
  slug: string
  tree: TreeData
}) => {
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(tree.selectedNodeId ?? tree.nodes[0]?.id ?? null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [departmentName, setDepartmentName] = useState("")
  const [managerUserId, setManagerUserId] = useState("")
  const [description, setDescription] = useState("")
  const [renameNode, setRenameNode] = useState<TreeNode | null>(null)
  const [renameName, setRenameName] = useState("")
  const [deleteNode, setDeleteNode] = useState<TreeNode | null>(null)
  const [assignMember, setAssignMember] = useState<MemberItem | null>(null)
  const [assignDepartmentId, setAssignDepartmentId] = useState("")
  const [removeMember, setRemoveMember] = useState<MemberItem | null>(null)
  const [page, setPage] = useState(1)
  const [addUserOpen, setAddUserOpen] = useState(false)
  const [addUserEmail, setAddUserEmail] = useState("")
  const [addUserName, setAddUserName] = useState("")
  const [addUserRole, setAddUserRole] = useState<OrganizationRole>("member")
  const [addUserDepartmentId, setAddUserDepartmentId] = useState("")
  const utils = api.useUtils()
  const departments = api.org.department.list.useQuery({ slug }, { initialData: tree })
  const selectedTree = departments.data ?? tree
  const selectedNode = selectedTree.nodes.find((node) => node.id === selectedNodeId) ?? selectedTree.nodes[0] ?? null
  const departmentOptions = selectedTree.nodes.filter((node) => node.type === "department")
  const members = api.org.department.member.list.useQuery(
    { departmentId: selectedNodeId ?? undefined, page, pageSize: 10, search: "", securityStatus: "all", slug },
    {
      enabled: Boolean(selectedNodeId),
      initialData: page === 1 && selectedNodeId === (tree.selectedNodeId ?? tree.nodes[0]?.id) ? initialMembers : undefined,
      placeholderData: (previousData) => previousData
    }
  )
  const refreshOrganizationData = async () => {
    await Promise.all([
      departments.refetch(),
      members.refetch(),
      utils.org.management.getOverview.invalidate({ slug }),
      utils.adminOrg.getOverview.invalidate(),
      utils.adminOrg.list.invalidate()
    ])
  }
  const createDepartment = api.org.department.create.useMutation({
    onError: (error) => toast.error(error.message || "添加部门失败。"),
    onSuccess: async (result) => {
      toast.success("部门已添加。")
      setDepartmentName("")
      setManagerUserId("")
      setDescription("")
      setDialogOpen(false)
      if (result.department?.id) {
        setSelectedNodeId(result.department.id)
      }
      await refreshOrganizationData()
    }
  })
  const renameDepartment = api.org.department.rename.useMutation({
    onError: (error) => toast.error(error.message || "重命名部门失败。"),
    onSuccess: async () => {
      toast.success("部门名称已更新。")
      setRenameNode(null)
      setRenameName("")
      await refreshOrganizationData()
    }
  })
  const deleteDepartment = api.org.department.delete.useMutation({
    onError: (error) => toast.error(error.message || "删除部门失败。"),
    onSuccess: async () => {
      toast.success("部门已删除。")
      setDeleteNode(null)
      setSelectedNodeId(selectedTree.nodes[0]?.id ?? null)
      await refreshOrganizationData()
    }
  })
  const assignDepartment = api.org.department.member.assign.useMutation({
    onError: (error) => toast.error(error.message || "分配部门失败。"),
    onSuccess: async () => {
      toast.success("成员已分配到部门。")
      setAssignMember(null)
      setAssignDepartmentId("")
      await refreshOrganizationData()
    }
  })
  const removeOrganizationMember = api.org.member.remove.useMutation({
    onError: (error) => toast.error(error.message || "移除成员失败。"),
    onSuccess: async () => {
      toast.success("成员已移除。")
      setRemoveMember(null)
      await refreshOrganizationData()
    }
  })
  const addOrganizationMember = api.org.member.addExistingOrCreate.useMutation({
    onError: (error) => toast.error(error.message || "新增用户失败。"),
    onSuccess: async (result) => {
      toast.success(result.createdUser ? "账号已创建并加入组织。" : "用户已加入组织。")
      setAddUserOpen(false)
      setAddUserEmail("")
      setAddUserName("")
      setAddUserRole("member")
      setAddUserDepartmentId("")
      await refreshOrganizationData()
    }
  })
  const memberData = members.data ?? initialMembers
  const parentLabel = selectedNode?.type === "department" ? selectedNode.name : `${selectedTree.nodes[0]?.name ?? "当前组织"}（公司根节点）`
  const openAssignDialog = (item: MemberItem) => {
    setAssignMember(item)
    setAssignDepartmentId(departmentOptions[0]?.id ?? "")
  }
  const memberColumns: Array<ColumnDef<MemberItem>> = [
    {
      cell: ({ row }) => (
        <div>
          <div className="font-medium">{row.original.name}</div>
          <div className="text-muted-foreground text-xs">{row.original.email}</div>
        </div>
      ),
      header: "成员",
      size: 220
    },
    { cell: ({ row }) => <Badge variant="secondary">{row.original.role}</Badge>, header: "角色", size: 100 },
    { cell: ({ row }) => row.original.departmentNames, header: "所属部门", size: 160 },
    { cell: ({ row }) => formatDate(row.original.joinedAt), header: "加入时间", size: 130 },
    { cell: ({ row }) => formatRelativeTime(row.original.lastLoginAt), header: "最后登录", size: 130 },
    { cell: () => "正常", header: "安全状态", size: 110 },
    {
      cell: ({ row }) => <MemberRowActions canManage={canManage} item={row.original} onAssign={openAssignDialog} onRemove={setRemoveMember} />,
      header: "操作",
      size: 110
    }
  ]

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(280px,1fr)_minmax(0,2fr)]">
      <OrganizationTree
        canManage={canManage}
        nodes={selectedTree.nodes}
        onCreateDepartment={() => setDialogOpen(true)}
        onDeleteDepartment={(node) => setDeleteNode(node)}
        onRenameDepartment={(node) => {
          setRenameNode(node)
          setRenameName(node.name)
        }}
        onSelect={setSelectedNodeId}
        selectedId={selectedNodeId}
      />
      {selectedNode ? (
        <Card className="rounded-lg py-0 shadow-sm">
          <CardHeader className="flex flex-row items-start justify-between gap-3 px-5 pt-5 pb-0">
            <div className="space-y-1">
              <CardTitle className="text-base">{selectedNode.name}成员</CardTitle>
              <p className="text-muted-foreground text-xs">
                {selectedNode.memberCount} 成员 · {selectedNode.riskCount} 异常登录 · {selectedNode.invitationCount} 个邀请
              </p>
            </div>
            {isPlatformAdmin ? (
              <Button aria-label="新增用户" onClick={() => setAddUserOpen(true)} size="icon-sm" title="新增用户" type="button" variant="outline">
                <UserPlus className="size-4" />
              </Button>
            ) : null}
          </CardHeader>
          <CardContent className="p-5">
            {members.isFetching ? (
              <div className="flex h-40 items-center justify-center text-muted-foreground">
                <Loader2 className="mr-2 size-4 animate-spin" />
                正在加载成员
              </div>
            ) : memberData.items.length > 0 ? (
              <>
                <div className="hidden md:block">
                  <DataTable
                    columns={memberColumns}
                    data={memberData.items}
                    getRowId={(row) => row.memberId}
                    maxHeightClassName="max-h-[520px]"
                    minWidthClassName="min-w-[960px]"
                  />
                </div>
                <div className="space-y-3 md:hidden">
                  {memberData.items.map((item) => (
                    <div className="rounded-lg border p-4" key={item.memberId}>
                      <div className="font-medium">{item.name}</div>
                      <div className="text-muted-foreground text-xs">{item.email}</div>
                      <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                        <span>角色：{item.role}</span>
                        <span>部门：{item.departmentNames}</span>
                        <span>加入：{formatDate(item.joinedAt)}</span>
                        <span>登录：{formatRelativeTime(item.lastLoginAt)}</span>
                        <span>状态：正常</span>
                      </div>
                      {canManage ? (
                        <div className="mt-4 flex justify-end gap-2">
                          {item.departmentNames === "未分配" ? (
                            <Button aria-label={`分配 ${item.name} 到部门`} onClick={() => openAssignDialog(item)} size="icon-sm" title="分配部门" type="button" variant="outline">
                              <FolderInput className="size-3.5" />
                            </Button>
                          ) : null}
                          <Button aria-label={`从组织移除 ${item.name}`} onClick={() => setRemoveMember(item)} size="icon-sm" title="移除成员" type="button" variant="destructive">
                            <UserMinus className="size-3.5" />
                          </Button>
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground text-sm">该组织节点暂无成员。</div>
            )}
            <DataPagination
              className="mt-4"
              disabled={members.isFetching}
              itemCount={memberData.items.length}
              onPageChange={setPage}
              page={memberData.page}
              pageCount={memberData.pageCount}
              pageSize={10}
              total={memberData.items.length}
            />
          </CardContent>
        </Card>
      ) : (
        <OrgEmptyState description="从左侧组织树选择公司根节点或部门后，这里会显示成员列表、加入时间、最后登录时间和安全状态。" title="还没有选择节点" />
      )}
      <Dialog onOpenChange={setDialogOpen} open={dialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>添加部门</DialogTitle>
            <DialogDescription>部门属于当前公司内部组织架构，不会创建新的组织 slug。</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="department-parent">上级部门</Label>
              <Input id="department-parent" readOnly value={parentLabel} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="department-name">部门名称</Label>
              <Input id="department-name" onChange={(event) => setDepartmentName(event.target.value)} placeholder="例如：产品研发部" value={departmentName} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="department-manager">负责人（可选用户 ID）</Label>
              <Input id="department-manager" onChange={(event) => setManagerUserId(event.target.value)} placeholder="留空则暂不指定负责人" value={managerUserId} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="department-description">部门说明（可选）</Label>
              <Textarea id="department-description" onChange={(event) => setDescription(event.target.value)} placeholder="说明该部门职责范围" value={description} />
            </div>
          </div>
          <DialogFooter>
            <Button disabled={createDepartment.isPending} onClick={() => setDialogOpen(false)} type="button" variant="outline">
              取消
            </Button>
            <Button
              disabled={createDepartment.isPending || !departmentName.trim()}
              onClick={() =>
                createDepartment.mutate({
                  description,
                  managerUserId,
                  name: departmentName,
                  parentDepartmentId: selectedNode?.type === "department" ? selectedNode.id : undefined,
                  slug
                })
              }
              type="button"
            >
              {createDepartment.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
              确认添加
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog onOpenChange={(open) => !open && setRenameNode(null)} open={Boolean(renameNode)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>重命名部门</DialogTitle>
            <DialogDescription>只修改当前公司内部部门名称，不影响组织 slug 或成员身份。</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="department-current-name">当前部门</Label>
              <Input id="department-current-name" readOnly value={renameNode?.name ?? ""} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="department-rename-name">新名称</Label>
              <Input id="department-rename-name" onChange={(event) => setRenameName(event.target.value)} value={renameName} />
            </div>
          </div>
          <DialogFooter>
            <Button disabled={renameDepartment.isPending} onClick={() => setRenameNode(null)} type="button" variant="outline">
              取消
            </Button>
            <Button
              disabled={renameDepartment.isPending || !renameNode || !renameName.trim()}
              onClick={() => renameNode && renameDepartment.mutate({ departmentId: renameNode.id, name: renameName, slug })}
              type="button"
            >
              {renameDepartment.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
              保存名称
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog onOpenChange={(open) => !open && setDeleteNode(null)} open={Boolean(deleteNode)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>删除部门</DialogTitle>
            <DialogDescription>第一版只允许删除没有子部门且没有成员归属的空部门。</DialogDescription>
          </DialogHeader>
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-destructive text-sm">
            删除后部门统计会刷新。若该部门仍存在子部门或成员归属，系统会阻止删除并提示先处理。
          </div>
          <div className="space-y-2">
            <Label htmlFor="department-delete-name">目标部门</Label>
            <Input id="department-delete-name" readOnly value={deleteNode?.name ?? ""} />
          </div>
          <DialogFooter>
            <Button disabled={deleteDepartment.isPending} onClick={() => setDeleteNode(null)} type="button" variant="outline">
              取消
            </Button>
            <Button
              disabled={deleteDepartment.isPending || !deleteNode}
              onClick={() => deleteNode && deleteDepartment.mutate({ departmentId: deleteNode.id, slug })}
              type="button"
              variant="destructive"
            >
              {deleteDepartment.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
              删除部门
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog onOpenChange={(open) => !open && setAssignMember(null)} open={Boolean(assignMember)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>分配部门</DialogTitle>
            <DialogDescription>仅对当前未分配部门的成员开放。</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="assign-member-name">成员</Label>
              <Input id="assign-member-name" readOnly value={assignMember ? `${assignMember.name} · ${assignMember.email}` : ""} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="assign-department">目标部门</Label>
              <select className={selectClassName} id="assign-department" onChange={(event) => setAssignDepartmentId(event.target.value)} value={assignDepartmentId}>
                {departmentOptions.map((node) => (
                  <option key={node.id} value={node.id}>
                    {node.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button disabled={assignDepartment.isPending} onClick={() => setAssignMember(null)} type="button" variant="outline">
              取消
            </Button>
            <Button
              disabled={assignDepartment.isPending || !assignMember || !assignDepartmentId}
              onClick={() => assignMember && assignDepartment.mutate({ departmentId: assignDepartmentId, memberId: assignMember.memberId, slug })}
              type="button"
            >
              {assignDepartment.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
              确认分配
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog onOpenChange={(open) => !open && setRemoveMember(null)} open={Boolean(removeMember)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>移除成员</DialogTitle>
            <DialogDescription>移除后该用户将不再属于当前组织，部门归属也会同步清理。</DialogDescription>
          </DialogHeader>
          <div className="rounded-lg border p-3 text-sm">{removeMember ? `${removeMember.name} · ${removeMember.email}` : ""}</div>
          <DialogFooter>
            <Button disabled={removeOrganizationMember.isPending} onClick={() => setRemoveMember(null)} type="button" variant="outline">
              取消
            </Button>
            <Button
              disabled={removeOrganizationMember.isPending || !removeMember}
              onClick={() => removeMember && removeOrganizationMember.mutate({ memberId: removeMember.memberId, slug })}
              type="button"
              variant="destructive"
            >
              {removeOrganizationMember.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
              确认移除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog onOpenChange={setAddUserOpen} open={addUserOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>新增用户到当前组织</DialogTitle>
            <DialogDescription>平台超级管理员可添加已有平台用户；邮箱不存在时会创建新账号并加入当前组织。</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="add-user-email">邮箱</Label>
              <Input id="add-user-email" onChange={(event) => setAddUserEmail(event.target.value)} value={addUserEmail} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="add-user-name">姓名（创建新账号时必填）</Label>
              <Input id="add-user-name" onChange={(event) => setAddUserName(event.target.value)} value={addUserName} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="add-user-role">组织角色</Label>
              <select className={selectClassName} id="add-user-role" onChange={(event) => setAddUserRole(event.target.value as OrganizationRole)} value={addUserRole}>
                <option value="member">Member</option>
                <option value="admin">Admin</option>
                <option value="owner">Owner</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="add-user-department">初始部门（可选）</Label>
              <select className={selectClassName} id="add-user-department" onChange={(event) => setAddUserDepartmentId(event.target.value)} value={addUserDepartmentId}>
                <option value="">不分配部门</option>
                {departmentOptions.map((node) => (
                  <option key={node.id} value={node.id}>
                    {node.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button disabled={addOrganizationMember.isPending} onClick={() => setAddUserOpen(false)} type="button" variant="outline">
              取消
            </Button>
            <Button
              disabled={addOrganizationMember.isPending || !addUserEmail.trim()}
              onClick={() =>
                addOrganizationMember.mutate({
                  departmentId: addUserDepartmentId,
                  email: addUserEmail,
                  name: addUserName,
                  role: addUserRole,
                  slug
                })
              }
              type="button"
            >
              {addOrganizationMember.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
              加入组织
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

const MemberRowActions = ({
  canManage,
  item,
  onAssign,
  onRemove
}: {
  canManage: boolean
  item: MemberItem
  onAssign: (item: MemberItem) => void
  onRemove: (item: MemberItem) => void
}) => (
  <div className="flex justify-end gap-2">
    {canManage && item.departmentNames === "未分配" ? (
      <Button aria-label={`分配 ${item.name} 到部门`} onClick={() => onAssign(item)} size="icon-sm" title="分配部门" type="button" variant="outline">
        <FolderInput className="size-3.5" />
      </Button>
    ) : null}
    {canManage ? (
      <Button aria-label={`从组织移除 ${item.name}`} onClick={() => onRemove(item)} size="icon-sm" title="移除成员" type="button" variant="destructive">
        <UserMinus className="size-3.5" />
      </Button>
    ) : null}
  </div>
)
