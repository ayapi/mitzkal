class HighlightElement extends HTMLElement {
  get rects() {
    return this._rects;
  }
  set rects(rects) {
    this._rects = rects;
    
    this.ensureChildrenCount(rects.length);
    if (rects.length > 1) {
      rects = rects.filter(rect => rect.width != 0 && rect.height != 0);
    }
    rects.forEach((rect, i) => {
      const div = this.shadowRoot.children[i + 1];
      const borderTop = this.getBorderWidth(div, 'top');
      const top = rect.top + window.scrollY - borderTop;
      const borderLeft = this.getBorderWidth(div, 'left');
      const left = rect.left + window.scrollX - borderLeft;
      div.style.top = Math.max(0, top) + 'px';
      div.style.left = Math.max(0, left) + 'px';
      div.style.width = Math.max(10, rect.width) + 'px';
      div.style.height = Math.max(10, rect.height) + 'px';
    });
  }
  constructor() {
    super();
    this._rects = [];
  }
  initialize() {
    this.model = null;
  }
  setModel(model) {
    this.removeAllChildren();
    this.model = model;
    model.on('did-change-rects', rects => this.rects = rects);
    model.once('did-destroy', () => this.model = null);
  }
  createdCallback() {
    const root = this.createShadowRoot();
    root.innerHTML = `
      <style>
        :host {
          pointer-events: none;
        }
        div {
          position:absolute;
          pointer-events: none;
          box-sizing: content-box;
          background: rgba(255,255,0, .3);
          border: 2px dotted #ff0;
        }
        div:first-of-type:not(:only-of-type) {
          border-right-width: 0;
        }
        div:last-of-type:not(:only-of-type) {
          border-left-width: 0;
        }
        div:not(:first-of-type):not(:last-of-type) {
          border-left-width: 0;
          border-right-width: 0;
        }
      </style>
    `;
  }
  ensureChildrenCount(count) {
    const divCount = this.shadowRoot.children.length - 1;
    if (divCount > count) {
      let diff = divCount - count;
      for (var i = 0; i < diff; i++) {
        this.shadowRoot.removeChild(this.shadowRoot.querySelector('div'));
      }
    }
    if (divCount < count) {
      let diff = count - divCount;
      for (var i = 0; i < diff; i++) {
        const div = document.createElement('div');
        this.shadowRoot.appendChild(div);
      }
    }
  }
  getBorderWidth(el, where) {
    let str = window
      .getComputedStyle(el, null)
      .getPropertyValue(`border-${where}-width`)
      .replace(/[^0-9.]/g, '');
    return parseInt(str, 10);
  }
  removeAllChildren() {
    [].slice.call(this.shadowRoot.querySelectorAll('div')).forEach(div => {
      this.shadowRoot.removeChild(div);
    });
  }
}

module.exports = HighlightElement = document.registerElement(
  'mitzkal-highlight',
  {prototype: HighlightElement.prototype}
)
