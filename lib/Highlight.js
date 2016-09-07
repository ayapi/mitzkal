const EventEmitter = require('events').EventEmitter;
const diff = require('deep-diff').diff;
const getScrollbarSize = require('scrollbar-size');

class Highlight extends EventEmitter {
  constructor(range) {
    super();
    
    this.range = range;
    this.selection = null;
    this.target = null;
    this.rects = [];
    this.timer = setInterval(this.update.bind(this), 60);
    
    this.scroll();
  }
  scroll() {
    let {target, rects} = this.getNodeHasValidRects(this.range);
    if (rects.length == 0) {
      return;
    }
    
    function shouldScrollVertically(el) {
      return (
        el === window
        ||
        (
          el.scrollHeight !== el.clientHeight
          &&
          el.clientHeight !== 0
          &&
          window.getComputedStyle(el).overflowY !== 'visible'
        )
      );
    }
    function shouldScrollHorizontally(el) {
      return (
        el === window
        ||
        (
          el.scrollWidth !== el.clientWidth
          &&
          el.clientWidth !== 0
          &&
          window.getComputedStyle(el).overflowX !== 'visible'
        )
      );
    }
    
    // TODO targetがRangeだと複数のElementを持ってることがぁる
    
    let parent = this.getParent(target);
    while (true) {
      if (!parent) {
        break;
      }
      if (parent.tagName === 'BODY') {
        parent = window;
      }
      
      // TODO parentがwindow以外の場合スタイルがちがぅことがぁる？
      let barSize = getScrollbarSize();
      
      let parentAbsoluteRect;
      if (parent === window) {
        parentAbsoluteRect = {
          left: window.scrollX,
          top: window.scrollY,
          right: window.innerWidth,
          bottom: window.innerHeight,
          width: window.innerWidth,
          height: window.innerHeight
        }
      } else {
        parentAbsoluteRect = parent.getBoundingClientRect();
      }
      
      let destY = 0;
      let destX = 0;
      
      let targetRect = rects.find(rect => {
        return rect.width != 0 && rect.height != 0
      }) || rects[0];
      
      let targetAbsoluteRect = {
        left: targetRect.left + window.scrollX,
        right: targetRect.right + window.scrollX,
        top: targetRect.top + window.scrollY,
        bottom: targetRect.bottom + window.scrollY,
        width: targetRect.width,
        height: targetRect.height
      };
      let targetRelativeRect = Object.assign({}, targetAbsoluteRect);
      
      if (shouldScrollVertically(parent)) {
        let parentH, scrollY;
        
        if (parent === window) {
          parentH = window.innerHeight;
          scrollY = window.scrollY;
        } else {
          parentH = parentAbsoluteRect.height;
          scrollY = parent.scrollTop;
          
          targetRelativeRect.top = targetAbsoluteRect.top - parentAbsoluteRect.top;
          targetRelativeRect.bottom = targetRelativeRect.top + targetRelativeRect.height;
        }
        
        if (targetRelativeRect.top >= 0 && targetRelativeRect.bottom <= parentH - barSize) {
          destY = scrollY;
        } else if (targetRelativeRect.height > parentH) {
          destY = targetRelativeRect.top;
        } else {
          destY = (targetRelativeRect.top + targetRelativeRect.height / 2) - (parentH / 2) + barSize;
        }
      }
      
      if (shouldScrollHorizontally(parent)) {
        let parentW, scrollX;
        
        if (parent === window) {
          parentW = window.innerWidth;
          scrollX = window.scrollY;
        } else {
          parentW = parentAbsoluteRect.width;
          scrollX = parent.scrollLeft;
          
          targetRelativeRect.left = targetAbsoluteRect.left - parentAbsoluteRect.left;
          targetRelativeRect.right = targetRelativeRect.left + targetRelativeRect.width;
        }
        
        if (targetRelativeRect.left >= 0 && targetRelativeRect.right <= parentW - barSize) {
          destX = scrollX;
        } else if (targetRelativeRect.left < 0) {
          destX = targetRelativeRect.left;
        } else if (targetRelativeRect.right > parentW - barSize) {
          if (targetRelativeRect.width > parentW - barSize) {
            destX = targetRelativeRect.left;
          } else {
            destX = (targetRelativeRect.right - parentW + barSize);
          }
        }
      }
      
      if (parent === window) {
        parent.scrollTo(destX, destY);
      } else {
        parent.scrollLeft = destX;
        parent.scrollTop = destY;
      }
      
      rects = this.getNodeHasValidRects(target).rects;
      parent = this.getParent(parent);
    }
  }
  update() {
    const {target, rects} = this.getNodeHasValidRects(this.range);
    
    if (diff(rects, this.rects)) {
      this.rects = rects;
      this.emit('did-change-rects', rects);
    }
    
    if (!this.selection || (
      this.selection.isCollapsed && this.range.getClientRects().length
    )) {
      this.selection = window.getSelection();
      this.selection.removeAllRanges();
      this.selection.addRange(this.range);
      
      this.focusAncestor(this.range.startContainer);
      this.emit('did-change-selection');
    }
  }
  focusAncestor(target) {
    document.activeElement.blur();
    while(true) {
      target.focus();
      if (document.activeElement == target) {
        break;
      }
      if (target.parentNode.nodeType != 1) {
        break;
      }
      target = target.parentNode;
    }
  }
  getNodeHasValidRects(target) {
    let rects;
    while(!rects) {
      // Windowsインストーラー版atomのelectronのバージョンぁがるまでspreadゎ保留
      // rects = [... target.getClientRects()];
      rects = [].slice.call(target.getClientRects());
      let areCollapsed = rects.every((rect) => {
        return rect.width == 0 && rect.height == 0;
      });
      if (areCollapsed || rects.length == 0) {
        let parent = this.getParent(target);
        if (parent.nodeType != 1) { // documentとかまで到達した
          break;
        }
        target = parent;
      }
    }
    return {
      target: target,
      rects: rects.map(r => {
        return {
          top: r.top,
          left: r.left,
          bottom: r.bottom,
          right: r.right,
          width: r.width,
          height: r.height
        }
      })
    };
  }
  getParent(target) {
    if (target instanceof Range) {
      return target.commonAncestorContainer;
    } else {
      return target.parentNode;
    }
  }
  destroy() {
    clearInterval(this.timer);
    this.range.detach();
    this.range = null;
    this.target = null;
    this.rects = null;
    this.emit('did-destroy');
    this.removeAllListeners();
  }
}

module.exports = Highlight;
