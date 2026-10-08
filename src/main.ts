// ABOUTME: 应用入口：渲染外壳并管理三个 Tab 的切换与懒加载
import { TABS, activateTab, renderShell } from './components/header';
import type { TabId } from './components/header';
import { renderSpeciesIntro } from './components/tab1-species';
import { renderDatasetIntro } from './components/tab2-dataset';
import { renderExplore } from './components/tab3-explore';
import type { ExploreTab } from './components/tab3-explore';

export function initApp(): void {
  const app = document.getElementById('app');
  if (!app) {
    console.error('App element not found');
    return;
  }

  renderShell(app);

  const panelSpecies = document.getElementById('panel-species');
  const panelDataset = document.getElementById('panel-dataset');
  const panelExplore = document.getElementById('panel-explore');
  if (!panelSpecies || !panelDataset || !panelExplore) return;

  renderSpeciesIntro(panelSpecies);

  const root: HTMLElement = app;
  const panels: Record<TabId, HTMLElement> = {
    species: panelSpecies,
    dataset: panelDataset,
    explore: panelExplore,
  };
  const inited: Record<TabId, boolean> = { species: true, dataset: false, explore: false };
  let exploreTab: ExploreTab | null = null;
  let current: TabId = 'species';

  function show(tab: TabId): void {
    current = tab;
    for (const t of TABS) {
      panels[t.id].classList.toggle('hidden', t.id !== tab);
    }
    activateTab(root, tab);

    if (!inited[tab]) {
      if (tab === 'dataset') {
        renderDatasetIntro(panels.dataset);
        inited.dataset = true;
      } else if (tab === 'explore') {
        exploreTab = renderExplore(panels.explore);
        inited.explore = true;
      }
    }
    if (tab === 'explore') exploreTab?.onShow();
  }

  const nav = document.getElementById('tab-nav');
  nav?.addEventListener('click', (e: Event) => {
    const btn = (e.target as HTMLElement).closest<HTMLElement>('button[data-tab]');
    if (!btn) return;
    const id = btn.dataset.tab as TabId | undefined;
    if (id && id !== current) show(id);
  });

  show('species');
}
