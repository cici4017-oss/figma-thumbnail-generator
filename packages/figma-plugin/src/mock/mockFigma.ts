/**
 * 실제 Figma 플러그인 전역 API(`figma.*`)의 아주 작은 부분집합을 흉내 낸 인메모리 모의 구현.
 *
 * 목적: renderer.ts / assetResolver.ts가 실제로 호출하는 API만 재현해서, 회사 Figma 파일이나
 * 데스크톱 앱 없이도(=이 저장소만으로) 렌더링/에셋 매핑 로직을 로컬(Node)에서 그대로 검증하기
 * 위함이다. Figma API 전체를 재구현하는 것이 목적이 아니다.
 *
 * 사용법: 테스트 시작 시 `installMockFigma()`를 호출해 `globalThis.figma`를 이 모의 구현으로
 * 바꾼 뒤, renderer.ts/assetResolver.ts를 평소처럼 import해서 쓰면 된다 — 그 파일들은 코드를
 * 전혀 바꾸지 않는다 (테스트 대상 코드와 실제 배포 코드가 100% 동일하다는 뜻).
 */

let idCounter = 1;
function nextId(): string {
  return `mock:${idCounter++}`;
}

export type MockNodeType = 'PAGE' | 'FRAME' | 'RECTANGLE';

export interface MockFill {
  type: string;
  imageHash?: string;
  [key: string]: unknown;
}

export class MockNode {
  id = nextId();
  name: string;
  type: MockNodeType;
  x = 0;
  y = 0;
  width = 0;
  height = 0;
  children: MockNode[] = [];
  parent: MockNode | null = null;
  fills: MockFill[] | symbol = [];

  constructor(type: MockNodeType, name: string) {
    this.type = type;
    this.name = name;
  }

  appendChild(node: MockNode): void {
    node.parent?.children.splice(node.parent.children.indexOf(node), 1);
    node.parent = this;
    this.children.push(node);
  }

  findOne(predicate: (n: MockNode) => boolean): MockNode | null {
    for (const child of this.children) {
      if (predicate(child)) return child;
      const nested = child.findOne(predicate);
      if (nested) return nested;
    }
    return null;
  }

  clone(): MockNode {
    const copy = new MockNode(this.type, this.name);
    copy.x = this.x;
    copy.y = this.y;
    copy.width = this.width;
    copy.height = this.height;
    copy.fills = Array.isArray(this.fills) ? this.fills.map((f) => ({ ...f })) : this.fills;
    for (const child of this.children) {
      const childCopy = child.clone();
      copy.appendChild(childCopy);
    }
    return copy;
  }

  remove(): void {
    if (this.parent) {
      this.parent.children = this.parent.children.filter((c) => c !== this);
      this.parent = null;
    }
  }

  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
  }

  async loadAsync(): Promise<void> {
    // 모의 구현에서는 항상 이미 메모리에 있으므로 아무것도 할 필요가 없다.
  }

  /**
   * 실제 이미지를 인코딩하지 않는 아주 단순한 모의 구현 — exportRenderer.ts가 "어떤 노드를
   * 어떤 포맷/크기로 export했는지"만 결정론적으로 확인할 수 있으면 충분하다.
   */
  async exportAsync(settings?: { format?: string }): Promise<Uint8Array> {
    const marker = `${settings?.format ?? 'PNG'}:${this.name}:${this.width}x${this.height}`;
    return new TextEncoder().encode(marker);
  }
}

export const MOCK_FIGMA_MIXED = Symbol('figma.mixed');

export interface MockFigmaHandle {
  figma: unknown;
  root: MockNode;
  currentPage: MockNode;
  /** 테스트에서 트리를 직접 조립할 때 쓰는 헬퍼 */
  addPage(name: string): MockNode;
}

/**
 * `globalThis.figma`를 모의 구현으로 교체한다. 반환값의 root/currentPage/addPage로
 * 테스트 fixture(mockTemplate.ts 등)를 조립한 뒤, renderer.ts/assetResolver.ts를 그대로 호출한다.
 */
export function installMockFigma(): MockFigmaHandle {
  const root = new MockNode('PAGE', '(document root)');
  const currentPage = new MockNode('PAGE', 'Page 1');
  root.appendChild(currentPage);

  let selection: MockNode[] = [];
  const notified: string[] = [];

  const mockFigma = {
    root: {
      get children() {
        return root.children;
      },
    },
    get currentPage() {
      // renderer.ts/assetResolver.ts가 실제로 쓰는 것만 노출한다: findOne, selection.
      // (spread로 currentPage의 다른 필드를 흉내내지 않는다 — 클래스 메서드는 얕은 복사로
      // 옮겨지지 않아서 오히려 "있는 것처럼 보이는데 실제로는 없는" 상태가 되기 쉽다.)
      return {
        findOne: (predicate: (n: MockNode) => boolean) => currentPage.findOne(predicate),
        get selection() {
          return selection;
        },
        set selection(nodes: MockNode[]) {
          selection = nodes;
        },
      };
    },
    mixed: MOCK_FIGMA_MIXED,
    getNodeById(id: string): MockNode | null {
      return root.findOne((n) => n.id === id);
    },
    async getNodeByIdAsync(id: string): Promise<MockNode | null> {
      return root.findOne((n) => n.id === id);
    },
    createPage(): MockNode {
      const page = new MockNode('PAGE', 'Page');
      root.appendChild(page);
      return page;
    },
    createRectangle(): MockNode {
      return new MockNode('RECTANGLE', 'Rectangle');
    },
    viewport: {
      scrollAndZoomIntoView(_nodes: MockNode[]) {
        // no-op: 시각적 렌더링은 검증 대상이 아님
      },
    },
    notify(message: string) {
      notified.push(message);
    },
  };

  (globalThis as { figma?: unknown }).figma = mockFigma;

  return {
    figma: mockFigma,
    root,
    currentPage,
    addPage(name: string) {
      const page = new MockNode('PAGE', name);
      root.appendChild(page);
      return page;
    },
  };
}

export function uninstallMockFigma(): void {
  delete (globalThis as { figma?: unknown }).figma;
}
