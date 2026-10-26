/* Malý runtime pro šablonu webu Gimmi: {{díry}}, <sc-for>, <sc-if>, onClick/onSubmit, setState s jemnou aktualizací DOM. */
(function () {
  'use strict';

  function DCLogic(props) {
    this.props = props || {};
    this.state = {};
  }
  DCLogic.prototype.setState = function (patch) {
    Object.assign(this.state, typeof patch === 'function' ? patch(this.state) : patch);
    if (this.__schedule) this.__schedule();
  };
  DCLogic.prototype.forceUpdate = function () {
    if (this.__schedule) this.__schedule();
  };
  window.DCLogic = DCLogic;

  function lookup(ctx, path) {
    path = path.trim();
    if (path === 'true') return true;
    if (path === 'false') return false;
    var parts = path.split('.');
    var v = ctx;
    for (var i = 0; i < parts.length; i++) {
      if (v == null) return undefined;
      v = v[parts[i]];
    }
    return v;
  }
  var WHOLE = /^\s*\{\{([^}]*)\}\}\s*$/;
  function interp(str, ctx) {
    return str.replace(/\{\{([^}]*)\}\}/g, function (_, p) {
      var v = lookup(ctx, p);
      return v == null || typeof v === 'function' ? '' : String(v);
    });
  }

  function build(src, ctx, out) {
    var kids = src.childNodes;
    for (var i = 0; i < kids.length; i++) {
      var n = kids[i];
      if (n.nodeType === 3) { out.appendChild(document.createTextNode(interp(n.nodeValue, ctx))); continue; }
      if (n.nodeType !== 1) continue;
      var tag = n.localName;
      if (tag === 'sc-for') {
        var list = lookup(ctx, (n.getAttribute('list') || '').replace(/[{}]/g, '')) || [];
        var as = n.getAttribute('as') || 'item';
        for (var j = 0; j < list.length; j++) {
          var c = Object.create(ctx); c[as] = list[j]; c.$index = j;
          build(n, c, out);
        }
        continue;
      }
      if (tag === 'sc-if') {
        if (lookup(ctx, (n.getAttribute('value') || '').replace(/[{}]/g, ''))) build(n, ctx, out);
        continue;
      }
      var el = document.createElementNS(n.namespaceURI, tag);
      el.__h = {};
      for (var a = 0; a < n.attributes.length; a++) {
        var at = n.attributes[a];
        var name = at.name, val = at.value;
        if (name.indexOf('hint-') === 0) continue;
        var m = WHOLE.exec(val);
        if (/^on[a-z]+$/i.test(name)) {
          var fn = m ? lookup(ctx, m[1]) : null;
          if (typeof fn === 'function') el.__h[name.slice(2).toLowerCase()] = fn;
          continue;
        }
        if (m) {
          var raw = lookup(ctx, m[1]);
          if (raw === false || raw == null) { if (name === 'disabled' || name === 'required') continue; }
          if (raw === true && (name === 'disabled' || name === 'required')) { el.setAttribute(name, ''); continue; }
          el.setAttribute(name, raw == null ? '' : String(raw));
        } else {
          el.setAttribute(name, interp(val, ctx));
        }
      }
      build(n.content || n, ctx, el);
      out.appendChild(el);
    }
  }

  function bind(el) {
    if (!el.__bound) el.__bound = {};
    var h = el.__h || {};
    Object.keys(h).forEach(function (evt) {
      if (el.__bound[evt]) return;
      el.__bound[evt] = true;
      el.addEventListener(evt, function (e) {
        var f = el.__h && el.__h[evt];
        if (f) f(e);
      });
    });
  }

  function patch(oldEl, newEl) {
    // atributy
    var i;
    for (i = oldEl.attributes.length - 1; i >= 0; i--) {
      var an = oldEl.attributes[i].name;
      if (!newEl.hasAttribute(an)) oldEl.removeAttribute(an);
    }
    for (i = 0; i < newEl.attributes.length; i++) {
      var at = newEl.attributes[i];
      if (oldEl.getAttribute(at.name) !== at.value) oldEl.setAttribute(at.name, at.value);
    }
    oldEl.__h = newEl.__h;
    bind(oldEl);
    patchChildren(oldEl, newEl);
  }

  function patchChildren(oldP, newP) {
    var o = Array.prototype.slice.call(oldP.childNodes);
    var n = Array.prototype.slice.call(newP.childNodes);
    for (var i = 0; i < n.length; i++) {
      var a = o[i], b = n[i];
      if (!a) { oldP.appendChild(b); walkBind(b); continue; }
      if (a.nodeType !== b.nodeType || (a.nodeType === 1 && a.localName !== b.localName)) {
        oldP.replaceChild(b, a); walkBind(b); continue;
      }
      if (a.nodeType === 3) { if (a.nodeValue !== b.nodeValue) a.nodeValue = b.nodeValue; continue; }
      if (a.nodeType === 1) patch(a, b);
    }
    for (var k = o.length - 1; k >= n.length; k--) oldP.removeChild(o[k]);
  }

  function walkBind(node) {
    if (node.nodeType !== 1) return;
    bind(node);
    for (var i = 0; i < node.children.length; i++) walkBind(node.children[i]);
  }

  window.mountDC = function (root, tplEl, Component, props) {
    var comp = new Component(props || {});
    if (!comp.state) comp.state = {};
    var queued = false;
    function render() {
      queued = false;
      var vals = comp.renderVals();
      var frag = document.createElement('div');
      build(tplEl.content, vals, frag);
      if (!root.__mounted) {
        while (frag.firstChild) root.appendChild(frag.firstChild);
        walkBind(root);
        root.__mounted = true;
      } else {
        patchChildren(root, frag);
      }
    }
    comp.__schedule = function () {
      if (queued) return;
      queued = true;
      (window.requestAnimationFrame || setTimeout)(render);
    };
    render();
    if (comp.componentDidMount) comp.componentDidMount();
    window.addEventListener('pagehide', function () { if (comp.componentWillUnmount) comp.componentWillUnmount(); });
    return comp;
  };
})();
