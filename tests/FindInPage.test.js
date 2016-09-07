import assert from 'power-assert';
import FindInPage from '../lib/FindInPage';

describe('FindInPage', function() {
  describe('find', function() {
    const windowInner = {
      width: 400,
      height: 400
    };
    const scrollBarSize = 15;
    let baseElement;
    let findInPage;
    let foundLog = [];
    let waitForSelectionChange;
    let waitForRectsChange;
    let wait = (ms) => {
      return new Promise(resolve => {
        setTimeout(() => resolve('timeout'), ms);
      });
    }
    
    before(() => {
      let body = document.getElementsByTagName('body')[0];
      while (body.firstChild) {
        body.removeChild(body.firstChild);
      }
      window.resizeTo(
        windowInner.width + (window.outerWidth - window.innerWidth),
        windowInner.height + (window.outerHeight - window.innerHeight)
      );
      
      return new Promise(resolve => {
        let timer = setInterval(() => {
          if (window.innerWidth == windowInner.width) {
            clearInterval(timer);
            resolve();
          }
        }, 100);
      });
    });
    
    beforeEach(() => {
      baseElement = document.createElement('div');
      document.body.appendChild(baseElement);
      findInPage = new FindInPage();
      findInPage.on('did-find', state => foundLog.push(state));
      
      waitForSelectionChange = () => {
        return new Promise(resolve => {
          findInPage.once('did-change-selection', () => {
            resolve('did-change-selection');
          });
        });
      }
      waitForRectsChange = () => {
        return new Promise(resolve => {
          findInPage.once('did-change-rects', () => {
            resolve('did-change-rects');
          });
        });
      }
    });
    
    afterEach(function() {
      findInPage.clear();
      baseElement.parentNode.removeChild(baseElement);
      window.getSelection().removeAllRanges();
      foundLog = [];
    });
    
    it('select every repeated texts, continue circulate through', async () => {
      let selection;
      let selectionRange;
      let selectionPositions = [];
      
      baseElement.innerHTML = `ぴかぴかぴか`;
      
      findInPage.find({text: 'ぴか', direction: 1});
      assert(foundLog[0].current == 0);
      assert(foundLog[0].total == 3);
      await waitForSelectionChange();
      selection = window.getSelection();
      assert(selection.toString() == 'ぴか');
      assert(selection.rangeCount == 1);
      selectionRange = selection.getRangeAt(0);
      selectionPositions[0] = selectionRange.startOffset;
      
      findInPage.find({text: 'ぴか', direction: 1});
      assert(foundLog[1].current == 1);
      assert(foundLog[1].total == 3);
      await waitForSelectionChange();
      selection = window.getSelection();
      assert(selection.toString() == 'ぴか');
      assert(selection.rangeCount == 1);
      selectionRange = selection.getRangeAt(0);
      selectionPositions[1] = selectionRange.startOffset;
      assert(selectionPositions[1] - selectionPositions[0] >= 2);
      
      findInPage.find({text: 'ぴか', direction: 1});
      assert(foundLog[2].current == 2);
      assert(foundLog[2].total == 3);
      await waitForSelectionChange();
      selection = window.getSelection();
      assert(selection.toString() == 'ぴか');
      assert(selection.rangeCount == 1);
      selectionRange = selection.getRangeAt(0);
      selectionPositions[2] = selectionRange.startOffset;
      assert(selectionPositions[2] - selectionPositions[1] >= 2);
      
      findInPage.find({text: 'ぴか', direction: 1});
      assert(foundLog[3].current == 0);
      assert(foundLog[3].total == 3);
      await waitForSelectionChange();
      selection = window.getSelection();
      assert(selection.toString() == 'ぴか');
      assert(selection.rangeCount == 1);
      selectionRange = selection.getRangeAt(0);
      assert(selectionPositions[0] === selectionRange.startOffset);
      
      findInPage.find({text: 'ぴか', direction: -1});
      assert(foundLog[4].current == 2);
      assert(foundLog[4].total == 3);
      await waitForSelectionChange();
      selection = window.getSelection();
      assert(selection.toString() == 'ぴか');
      assert(selection.rangeCount == 1);
      selectionRange = selection.getRangeAt(0);
      assert(selectionPositions[2] === selectionRange.startOffset);
      
      findInPage.find({text: 'ぴか', direction: -1});
      assert(foundLog[5].current == 1);
      assert(foundLog[5].total == 3);
      await waitForSelectionChange();
      selection = window.getSelection();
      assert(selection.toString() == 'ぴか');
      assert(selection.rangeCount == 1);
      selectionRange = selection.getRangeAt(0);
      assert(selectionPositions[1] === selectionRange.startOffset);
      
      findInPage.find({text: 'ぴか', direction: -1});
      assert(foundLog[6].current == 0);
      assert(foundLog[6].total == 3);
      await waitForSelectionChange();
      selection = window.getSelection();
      assert(selection.toString() == 'ぴか');
      assert(selection.rangeCount == 1);
      selectionRange = selection.getRangeAt(0);
      assert(selectionPositions[0] === selectionRange.startOffset);
    });
    
    it('should select any texts when no match', async () => {
      let selection;
      baseElement.innerHTML = `ぴかぴかぴか`;
      
      findInPage.find({text: 'ぽ', direction: 1});
      assert(foundLog[0].current == -1);
      assert(foundLog[0].total == 0);
      assert(await Promise.race([waitForSelectionChange(), wait(100)]) == 'timeout');
      selection = window.getSelection();
      assert(selection.rangeCount == 0);
      
      findInPage.find({text: 'ぽ', direction: 1});
      assert(foundLog[0].current == -1);
      assert(foundLog[0].total == 0);
      assert(await Promise.race([waitForSelectionChange(), wait(100)]) == 'timeout');
      selection = window.getSelection();
      assert(selection.rangeCount == 0);
    });
    
    it('should select any texts when matched range has no valid rect', async () => {
      let selection;
      baseElement.innerHTML = `
        ぴか<span style="display:none">かくれぴか！！</span>ぴか
      `;
      
      findInPage.find({text: 'ぴか', direction: 1});
      assert(foundLog[0].current == 0);
      assert(foundLog[0].total == 3);
      await Promise.all([waitForRectsChange(), waitForSelectionChange()]);
      selection = window.getSelection();
      assert(selection.toString() == 'ぴか');
      assert(selection.rangeCount == 1);
      
      findInPage.find({text: 'ぴか', direction: 1});
      assert(foundLog[1].current == 1);
      assert(foundLog[1].total == 3);
      await Promise.all([waitForRectsChange(), waitForSelectionChange()]);
      selection = window.getSelection();
      assert(selection.rangeCount == 0);
    });
    
    it('should scroll window vertically to found text', async () => {
      assert(window.innerHeight == 400);
      
      let selection;
      baseElement.innerHTML = `
        <style>
          * {margin: 0; padding: 0;}
          body {width: 1200px}
          .keyword {padding-top: 800px; line-height: 30px;}
        </style>
        <div class="keyword">ぴか</div>
      `;
      
      findInPage.find({text: 'ぴか', direction: 1});
      assert(foundLog[0].current == 0);
      assert(foundLog[0].total == 1);
      await Promise.all([waitForRectsChange(), waitForSelectionChange()]);
      assert(window.scrollY == 430 + scrollBarSize);
      
      selection = window.getSelection();
      assert(selection.toString() == 'ぴか');
      assert(selection.rangeCount == 1);
    });
    
    it('should scroll window horizontally to found text', async () => {
      assert(window.innerWidth == 400);
      
      let selection;
      baseElement.innerHTML = `
        <style>
          * {margin: 0; padding: 0;}
          .keyword {padding-left: 800px; font-size: 20px; width: 40px;}
        </style>
        <div class="keyword">ぴか</div>
      `;
      
      findInPage.find({text: 'ぴか', direction: 1});
      assert(foundLog[0].current == 0);
      assert(foundLog[0].total == 1);
      await Promise.all([waitForRectsChange(), waitForSelectionChange()]);
      assert(window.scrollX == 440);
      
      selection = window.getSelection();
      assert(selection.toString() == 'ぴか');
      assert(selection.rangeCount == 1);
    });
    
    it('should scroll window to found text', async () => {
      assert(window.innerWidth == 400);
      
      let selection;
      baseElement.innerHTML = `
        <style>
          * {margin: 0; padding: 0;}
          .keyword {
            padding-top: 800px;
            padding-left: 800px;
            line-height: 30px;
            font-size: 20px;
            width: 40px;
          }
        </style>
        <div class="keyword">ぴか</div>
      `;
      
      findInPage.find({text: 'ぴか', direction: 1});
      assert(foundLog[0].current == 0);
      assert(foundLog[0].total == 1);
      await Promise.all([waitForRectsChange(), waitForSelectionChange()]);
      assert(window.scrollY == 430 + scrollBarSize);
      assert(window.scrollX == 440 + scrollBarSize);
      
      selection = window.getSelection();
      assert(selection.toString() == 'ぴか');
      assert(selection.rangeCount == 1);
    });
    
    it('should scroll overflow area horizontally to found text', async () => {
      assert(window.innerWidth == 400);
      
      let selection;
      baseElement.innerHTML = `
        <style>
          * {margin: 0; padding: 0;}
          body {
            width: 840px;
          }
          .wrapper {
            overflow: scroll;
            width: 200px;
          }
          .keyword {
            padding-left: 400px;
            font-size: 20px;
            width: 40px;
          }
        </style>
        <div class="wrapper">
          <div class="keyword">ぴか</div>
        </div>
      `;
      
      findInPage.find({text: 'ぴか', direction: 1});
      assert(foundLog[0].current == 0);
      assert(foundLog[0].total == 1);
      await Promise.all([waitForRectsChange(), waitForSelectionChange()]);
      assert(window.scrollX == 0);
      
      let wrapper = document.querySelector('.wrapper');
      assert(wrapper.scrollLeft == 240 + scrollBarSize);
      
      selection = window.getSelection();
      assert(selection.toString() == 'ぴか');
      assert(selection.rangeCount == 1);
    });
    
    it('should scroll overflow area vertically to found text', async () => {
      assert(window.innerHeight == 400);
      
      let selection;
      baseElement.innerHTML = `
        <style>
          * {margin: 0; padding: 0;}
          body {
            height: 800px;
          }
          .wrapper {
            overflow: scroll;
            width: 100px;
            height: 100px;
          }
          .keyword {
            padding-top: 200px;
            font-size: 20px;
            line-height: 30px;
            width: 40px;
          }
        </style>
        <div class="wrapper">
          <div class="keyword">ぴか</div>
        </div>
      `;
      
      findInPage.find({text: 'ぴか', direction: 1});
      assert(foundLog[0].current == 0);
      assert(foundLog[0].total == 1);
      await Promise.all([waitForRectsChange(), waitForSelectionChange()]);
      assert(window.scrollY == 0);
      
      let wrapper = document.querySelector('.wrapper');
      assert(wrapper.scrollTop == 130 + scrollBarSize);
      
      selection = window.getSelection();
      assert(selection.toString() == 'ぴか');
      assert(selection.rangeCount == 1);
    });
    
    it('should scroll overflow area to found text', async () => {
      assert(window.innerWidth == 400);
      assert(window.innerHeight == 400);
      
      let selection;
      baseElement.innerHTML = `
        <style>
          * {margin: 0; padding: 0;}
          body {
            width: 800px;
            height: 800px;
          }
          .wrapper {
            overflow: scroll;
            width: 100px;
            height: 100px;
          }
          .keyword {
            padding-left: 200px;
            padding-top: 200px;
            font-size: 20px;
            line-height: 40px;
            width: 40px;
          }
        </style>
        <div class="wrapper">
          <div class="keyword">ぴか</div>
        </div>
      `;
      
      findInPage.find({text: 'ぴか', direction: 1});
      assert(foundLog[0].current == 0);
      assert(foundLog[0].total == 1);
      await Promise.all([waitForRectsChange(), waitForSelectionChange()]);
      assert(window.scrollX == 0);
      assert(window.scrollY == 0);
      
      let wrapper = document.querySelector('.wrapper');
      assert(wrapper.scrollTop == 140 + scrollBarSize);
      assert(wrapper.scrollLeft == 140 + scrollBarSize);
      
      selection = window.getSelection();
      assert(selection.toString() == 'ぴか');
      assert(selection.rangeCount == 1);
    });
    
    it('should scroll nested overflow area to found text', async () => {
      assert(window.innerWidth == 400);
      assert(window.innerHeight == 400);
      
      let selection;
      baseElement.innerHTML = `
        <style>
          * {margin: 0; padding: 0;}
          body {
            width: 800px;
            height: 800px;
          }
          .wrapper {
            overflow: scroll;
            width: 100px;
            height: 100px;
          }
          .child {
            margin-left: 100px;
            margin-top: 100px;
          }
          .keyword {
            padding-left: 200px;
            padding-top: 200px;
            font-size: 20px;
            line-height: 40px;
            width: 40px;
          }
        </style>
        <div class="wrapper parent">
          <div class="wrapper child">
            <div class="keyword">ぴか</div>
          </div>
        </div>
      `;
      
      findInPage.find({text: 'ぴか', direction: 1});
      
      assert(foundLog[0].current == 0);
      assert(foundLog[0].total == 1);
      await Promise.all([waitForRectsChange(), waitForSelectionChange()]);
      assert(window.scrollX == 0);
      assert(window.scrollY == 0);
      
      let parent = document.querySelector('.parent');
      assert(parent.scrollTop == 100 + scrollBarSize);
      assert(parent.scrollLeft == 100);
      
      let child = document.querySelector('.child');
      assert(child.scrollTop == 140 + scrollBarSize);
      assert(child.scrollLeft == 140 + scrollBarSize);
      
      selection = window.getSelection();
      assert(selection.toString() == 'ぴか');
      assert(selection.rangeCount == 1);
    });
    
    it('should scroll both window and overflow area to found text', async () => {
      assert(window.innerWidth == 400);
      assert(window.innerHeight == 400);
      
      let selection;
      baseElement.innerHTML = `
        <style>
          * {margin: 0; padding: 0;}
          .wrapper {
            overflow: scroll;
            width: 100px;
            height: 100px;
            margin-left: 400px;
            margin-top: 400px;
          }
          .keyword {
            padding-left: 200px;
            padding-top: 200px;
            font-size: 20px;
            line-height: 40px;
            width: 40px;
          }
        </style>
        <div class="wrapper">
          <div class="keyword">ぴか</div>
        </div>
      `;
      
      findInPage.find({text: 'ぴか', direction: 1});
      
      assert(foundLog[0].current == 0);
      assert(foundLog[0].total == 1);
      await Promise.all([waitForRectsChange(), waitForSelectionChange()]);
      assert(window.scrollX == 100);
      assert(window.scrollY == 100 + scrollBarSize);
      
      let wrapper = document.querySelector('.wrapper');
      assert(wrapper.scrollTop == 140 + scrollBarSize);
      assert(wrapper.scrollLeft == 140 + scrollBarSize);
      
      selection = window.getSelection();
      assert(selection.toString() == 'ぴか');
      assert(selection.rangeCount == 1);
    });
  });
});
