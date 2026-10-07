import './style.css';
import { Engine } from './core/Engine';
import { WORLDS } from './worlds/registry';

const viewport = document.getElementById('viewport')!;
const ui = document.getElementById('ui')!;

const engine = new Engine(viewport, ui, WORLDS);
// Deep link: ?world=jazz-mansion | futuristic-cliff  (add &debug for the lil-gui panel)
void engine.start(new URLSearchParams(location.search).get('world'));

if (import.meta.env.DEV) (window as unknown as { cinewalk: Engine }).cinewalk = engine;
