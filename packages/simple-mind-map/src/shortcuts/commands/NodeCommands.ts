import type { Command } from '../types';
import type { MindMap } from '../../MindMap';
import type { ShortcutManager } from '../ShortcutManager';
import type { NodeData } from '../../types';

/**
 * 节点操作命令基类
 */
abstract class BaseNodeCommand implements Command {
  public abstract id: string;
  public abstract name: string;
  public abstract description: string;

  constructor(protected mindMap: MindMap) {}

  public abstract execute(): void;

  public canExecute(): boolean {
    return this.mindMap.getSelectedNode() !== null;
  }
}

/**
 * 插入下级节点命令
 * 快捷键：Tab / Insert
 */
export class InsertChildNodeCommand extends BaseNodeCommand {
  public id = 'node.insertChild';
  public name = '插入下级节点';
  public description = '在当前选中节点下方插入子节点';

  public execute(): void {
    const selectedNode = this.mindMap.getSelectedNode();
    if (!selectedNode) return;

    const newNode = this.mindMap.addNode(selectedNode.id, '新节点');
    if (newNode) {
      this.mindMap.setActiveNode(newNode);
    }
  }
}

/**
 * 插入同级节点命令
 * 快捷键：Enter
 */
export class InsertSiblingNodeCommand extends BaseNodeCommand {
  public id = 'node.insertSibling';
  public name = '插入同级节点';
  public description = '在当前节点同级位置插入新节点';

  public execute(): void {
    const selectedNode = this.mindMap.getSelectedNode();
    if (!selectedNode?.parent) return;

    const newNode = this.mindMap.insertSiblingNode(selectedNode.id, '新节点');
    if (newNode) {
      this.mindMap.setActiveNode(newNode);
    }
  }

  public canExecute(): boolean {
    const selectedNode = this.mindMap.getSelectedNode();
    return selectedNode !== null && selectedNode.parent !== null;
  }
}

/**
 * 插入父节点命令
 * 快捷键：Shift+Tab
 */
export class InsertParentNodeCommand extends BaseNodeCommand {
  public id = 'node.insertParent';
  public name = '插入父节点';
  public description = '在当前节点上方插入父节点';

  public execute(): void {
    const selectedNode = this.mindMap.getSelectedNode();
    if (!selectedNode?.parent) return;

    const newNode = this.mindMap.insertParentNode(selectedNode.id, '新节点');
    if (newNode) {
      this.mindMap.setActiveNode(newNode);
    }
  }

  public canExecute(): boolean {
    const selectedNode = this.mindMap.getSelectedNode();
    return selectedNode !== null && selectedNode.parent !== null;
  }
}

/**
 * 删除节点命令
 * 快捷键：Delete / Backspace
 */
export class DeleteNodeCommand extends BaseNodeCommand {
  public id = 'node.delete';
  public name = '删除节点';
  public description = '删除当前选中的节点及其所有子节点（支持批量删除）';

  public execute(): void {
    const allSelectedNodes = this.mindMap.getAllSelectedNodes();
    if (allSelectedNodes.length === 0) return;

    const removedCount = this.mindMap.removeSelectedNodes();
    if (removedCount > 0) {
      console.log(`已删除 ${removedCount} 个节点`);
    }
  }

  public canExecute(): boolean {
    const allSelectedNodes = this.mindMap.getAllSelectedNodes();
    if (allSelectedNodes.length === 0) return false;
    return allSelectedNodes.some((node) => node.parent !== null);
  }
}

/**
 * 上移节点命令
 * 快捷键：Cmd/Ctrl+Up
 */
export class MoveNodeUpCommand extends BaseNodeCommand {
  public id = 'node.moveUp';
  public name = '上移节点';
  public description = '将当前节点在同级节点中上移一位';

  public execute(): void {
    const selectedNode = this.mindMap.getSelectedNode();
    if (!selectedNode?.parent) return;

    const siblings = selectedNode.parent.children;
    const currentIndex = siblings.indexOf(selectedNode);

    if (currentIndex > 0) {
      [siblings[currentIndex - 1], siblings[currentIndex]] = [siblings[currentIndex], siblings[currentIndex - 1]];
      this.mindMap.relayout();
    }
  }

  public canExecute(): boolean {
    const selectedNode = this.mindMap.getSelectedNode();
    if (!selectedNode?.parent) return false;

    const siblings = selectedNode.parent.children;
    return siblings.indexOf(selectedNode) > 0;
  }
}

/**
 * 下移节点命令
 * 快捷键：Cmd/Ctrl+Down
 */
export class MoveNodeDownCommand extends BaseNodeCommand {
  public id = 'node.moveDown';
  public name = '下移节点';
  public description = '将当前节点在同级节点中下移一位';

  public execute(): void {
    const selectedNode = this.mindMap.getSelectedNode();
    if (!selectedNode?.parent) return;

    const siblings = selectedNode.parent.children;
    const currentIndex = siblings.indexOf(selectedNode);

    if (currentIndex < siblings.length - 1) {
      [siblings[currentIndex], siblings[currentIndex + 1]] = [siblings[currentIndex + 1], siblings[currentIndex]];
      this.mindMap.relayout();
    }
  }

  public canExecute(): boolean {
    const selectedNode = this.mindMap.getSelectedNode();
    if (!selectedNode?.parent) return false;

    const siblings = selectedNode.parent.children;
    return siblings.indexOf(selectedNode) < siblings.length - 1;
  }
}

/**
 * 剪贴板数据类型
 */
interface ClipboardData {
  type: 'node' | 'nodes';
  data: NodeData | NodeData[];
}

/**
 * 复制节点命令
 * 快捷键：Cmd/Ctrl+C
 */
export class CopyNodeCommand extends BaseNodeCommand {
  public id = 'node.copy';
  public name = '复制节点';
  public description = '复制当前选中的节点（包含所有子节点，支持批量复制）';

  constructor(
    mindMap: MindMap,
    private getShortcutManager: () => ShortcutManager
  ) {
    super(mindMap);
  }

  public execute(): void {
    const copiedData = this.mindMap.copySelectedNodes();
    if (copiedData.length === 0) return;

    const clipboard: ClipboardData = {
      type: 'nodes',
      data: copiedData,
    };

    this.getShortcutManager().setClipboard(clipboard);
    console.log(`已复制 ${copiedData.length} 个节点到剪贴板`);
  }

  public canExecute(): boolean {
    return this.mindMap.getAllSelectedNodes().length > 0;
  }
}

/**
 * 粘贴节点命令
 * 快捷键：Cmd/Ctrl+V
 */
export class PasteNodeCommand extends BaseNodeCommand {
  public id = 'node.paste';
  public name = '粘贴节点';
  public description = '将剪贴板中的节点粘贴为当前节点的子节点（支持批量粘贴）';

  constructor(
    mindMap: MindMap,
    private getShortcutManager: () => ShortcutManager
  ) {
    super(mindMap);
  }

  public execute(): void {
    const selectedNode = this.mindMap.getSelectedNode();
    if (!selectedNode) return;

    const clipboard = this.getShortcutManager().getClipboard() as ClipboardData | null;
    if (!clipboard || (clipboard.type !== 'node' && clipboard.type !== 'nodes')) {
      console.warn('剪贴板中没有节点数据');
      return;
    }

    const nodesToPaste = clipboard.type === 'nodes'
      ? (clipboard.data as NodeData[])
      : [clipboard.data as NodeData];

    nodesToPaste.forEach((nodeData) => {
      // 使用 pasteNodeData 递归粘贴完整的节点数据（包含子节点）
      this.mindMap.pasteNodeData(selectedNode.id, nodeData);
    });

    console.log(`已粘贴 ${nodesToPaste.length} 个节点`);
  }

  public canExecute(): boolean {
    if (!super.canExecute()) return false;

    const clipboard = this.getShortcutManager().getClipboard() as ClipboardData | null;
    return clipboard !== null && (clipboard.type === 'node' || clipboard.type === 'nodes');
  }
}

/**
 * 切换节点展开/收起命令
 * 快捷键：Space
 */
export class ToggleNodeExpandCommand extends BaseNodeCommand {
  public id = 'node.toggleExpand';
  public name = '切换展开/收起';
  public description = '切换当前选中节点的展开/收起状态';

  public execute(): void {
    const selectedNode = this.mindMap.getSelectedNode();
    if (!selectedNode) return;

    selectedNode.expanded = !selectedNode.expanded;
    this.mindMap.render();
  }

  public canExecute(): boolean {
    const selectedNode = this.mindMap.getSelectedNode();
    return selectedNode !== null && selectedNode.children.length > 0;
  }
}

/**
 * 展开节点命令
 */
export class ExpandNodeCommand extends BaseNodeCommand {
  public id = 'node.expand';
  public name = '展开节点';
  public description = '展开当前选中的节点';

  public execute(): void {
    const selectedNode = this.mindMap.getSelectedNode();
    if (!selectedNode) return;

    selectedNode.expanded = true;
    this.mindMap.render();
  }

  public canExecute(): boolean {
    const selectedNode = this.mindMap.getSelectedNode();
    return selectedNode !== null && selectedNode.children.length > 0 && !selectedNode.expanded;
  }
}

/**
 * 收起节点命令
 */
export class CollapseNodeCommand extends BaseNodeCommand {
  public id = 'node.collapse';
  public name = '收起节点';
  public description = '收起当前选中的节点';

  public execute(): void {
    const selectedNode = this.mindMap.getSelectedNode();
    if (!selectedNode) return;

    selectedNode.expanded = false;
    this.mindMap.render();
  }

  public canExecute(): boolean {
    const selectedNode = this.mindMap.getSelectedNode();
    return selectedNode !== null && selectedNode.children.length > 0 && selectedNode.expanded;
  }
}

/**
 * 展开所有节点命令
 */
export class ExpandAllCommand implements Command {
  public id = 'canvas.expandAll';
  public name = '展开所有';
  public description = '展开所有节点';

  constructor(private mindMap: MindMap) {}

  public execute(): void {
    this.mindMap.expandAll();
  }

  public canExecute(): boolean {
    return true;
  }
}

/**
 * 折叠所有节点命令
 */
export class CollapseAllCommand implements Command {
  public id = 'canvas.collapseAll';
  public name = '折叠所有';
  public description = '折叠所有节点（保留第一层）';

  constructor(private mindMap: MindMap) {}

  public execute(): void {
    this.mindMap.collapseAll();
  }

  public canExecute(): boolean {
    return true;
  }
}

/**
 * 切换展开/折叠所有节点命令
 */
export class ToggleExpandAllCommand implements Command {
  public id = 'canvas.toggleExpandAll';
  public name = '切换展开/折叠所有';
  public description = '智能切换所有节点的展开/折叠状态';

  private isAllExpanded = true;

  constructor(private mindMap: MindMap) {}

  public execute(): void {
    if (this.isAllExpanded) {
      this.mindMap.collapseAll();
      this.isAllExpanded = false;
    } else {
      this.mindMap.expandAll();
      this.isAllExpanded = true;
    }
  }

  public canExecute(): boolean {
    return true;
  }
}
