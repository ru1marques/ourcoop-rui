// Keep the original selects as the source of truth for the map's filter handlers.
(() => {
  const controls = document.querySelector('.resources-filters');
  const widgets = [];
  controls.querySelectorAll('select').forEach((select) => {
    const label = select.closest('label');
    const caption = label.firstChild.textContent.trim();
    const wrapper = document.createElement('div');
    wrapper.className = 'resource-selector';
    const trigger = document.createElement('button');
    trigger.type = 'button';
    trigger.className = 'resource-selector-trigger';
    trigger.id = `${select.id}-trigger`;
    trigger.setAttribute('aria-label', caption);
    trigger.setAttribute('aria-haspopup', 'listbox');
    trigger.setAttribute('aria-expanded', 'false');
    const list = document.createElement('div');
    list.className = 'resource-selector-options';
    list.id = `${select.id}-options`;
    list.setAttribute('role', 'listbox');
    list.setAttribute('aria-label', caption);
    list.hidden = true;
    trigger.setAttribute('aria-controls', list.id);
    label.after(wrapper);
    wrapper.append(label, trigger, list);
    // Retain an accessible caption, removing the duplicate native control from focus.
    select.hidden = true;
    label.htmlFor = trigger.id;
    const close = () => { list.hidden = true; trigger.setAttribute('aria-expanded', 'false'); };
    const sync = () => {
      trigger.textContent = select.selectedOptions[0]?.textContent || '';
      list.querySelectorAll('[role="option"]').forEach((option, index) => {
        option.setAttribute('aria-selected', String(index === select.selectedIndex));
      });
    };
    [...select.options].forEach((option, index) => {
      const item = document.createElement('button');
      item.type = 'button'; item.setAttribute('role', 'option');
      item.textContent = option.textContent;
      item.addEventListener('click', () => {
        select.selectedIndex = index;
        select.dispatchEvent(new Event('change', { bubbles: true }));
        close(); trigger.focus();
      });
      list.append(item);
    });
    const open = () => {
      widgets.forEach(widget => widget.close());
      list.hidden = false; trigger.setAttribute('aria-expanded', 'true');
      list.children[select.selectedIndex]?.focus();
    };
    trigger.addEventListener('click', () => list.hidden ? open() : close());
    wrapper.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') { close(); trigger.focus(); }
      if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
        event.preventDefault();
        if (list.hidden) { open(); return; }
        const items = [...list.children];
        const index = items.indexOf(document.activeElement);
        const next = event.key === 'Home' ? 0 : event.key === 'End' ? items.length - 1 : (index + (event.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length;
        items[next]?.focus();
      }
    });
    wrapper.addEventListener('focusout', event => { if (!wrapper.contains(event.relatedTarget)) close(); });
    document.addEventListener('click', event => { if (!wrapper.contains(event.target)) close(); });
    select.addEventListener('change', sync);
    widgets.push({ close, sync }); sync();
  });
  document.querySelector('#our-reset-filters').addEventListener('click', () => widgets.forEach(widget => { widget.close(); widget.sync(); }));
})();

// Switch views through the original control, preserving the map's rendering code.
(() => {
  const select = document.querySelector('#our-view');
  const container = document.querySelector('.resources-map-view');
  const nativeLabel = select.closest('label');
  nativeLabel.hidden = true;
  const switcher = document.createElement('div');
  switcher.className = 'resources-view-switcher';
  switcher.setAttribute('role', 'group');
  switcher.setAttribute('aria-label', 'Resource visualization');
  container.append(switcher);
  const buttons = [];
  const addButton = (parent, value, title) => {
    const button = document.createElement('button');
    button.type = 'button';button.textContent = title;
    button.dataset.view = value;
    button.addEventListener('click', () => {
      select.value = value;
      select.dispatchEvent(new Event('change', { bubbles: true }));
    });
    buttons.push(button);parent.append(button);
  };
  addButton(switcher, 'geo', 'Network view');
  addButton(switcher, 'bank', 'List view');
  addButton(switcher, 'network', 'Abstract');
  addButton(switcher, 'cosmic', 'Cosmic');
  const sync = () => buttons.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.view === select.value)));
  select.addEventListener('change', sync);sync();
})();
