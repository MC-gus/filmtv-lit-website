// 後台自訂欄位「照片構圖」：拖曳預覽或用滑桿調整照片位置與放大
// 存成「左右,上下,放大」字串，例如 "50,20,1.30"；空白＝預設（以照片上緣為準）
(function () {
  var h = window.h;
  var DEF = [50, 0, 1];
  function parse(v) {
    var p = String(v || '').split(',').map(parseFloat);
    return DEF.map(function (d, i) { return isFinite(p[i]) ? p[i] : d; });
  }
  function clamp(v, a, b) { return Math.min(b, Math.max(a, v)); }

  var PhotoCrop = createClass({
    photoUrl: function () {
      var name = this.props.field.get('photo_field') || 'photo';
      var path = this.props.entry && this.props.entry.getIn(['data', name]);
      if (!path) return '';
      try {
        var asset = this.props.getAsset(path, this.props.field);
        var url = asset && (asset.url || String(asset));
        if (url && url.indexOf('[object') !== 0) return url;
      } catch (e) { /* 取不到預覽就用原路徑 */ }
      return path;
    },
    save: function (x, y, z) {
      this.props.onChange(Math.round(x) + ',' + Math.round(y) + ',' + z.toFixed(2));
    },
    startDrag: function (e) {
      e.preventDefault();
      var self = this;
      var rect = e.currentTarget.getBoundingClientRect();
      var v = parse(this.props.value);
      var sx = e.clientX, sy = e.clientY;
      function move(ev) {
        var dx = ((ev.clientX - sx) / rect.width) * 100 / v[2];
        var dy = ((ev.clientY - sy) / rect.height) * 100 / v[2];
        self.save(clamp(v[0] - dx, 0, 100), clamp(v[1] - dy, 0, 100), v[2]);
      }
      function up() {
        window.removeEventListener('pointermove', move);
        window.removeEventListener('pointerup', up);
      }
      window.addEventListener('pointermove', move);
      window.addEventListener('pointerup', up);
    },
    render: function () {
      var self = this;
      var v = parse(this.props.value), x = v[0], y = v[1], z = v[2];
      var url = this.photoUrl();
      var frames = this.props.field.get('frames');
      frames = frames && frames.toJS ? frames.toJS() : [{ ratio: '3 / 4', label: '預覽' }];
      var wrap = { className: this.props.classNameWrapper, id: this.props.forID };

      if (!url) return h('div', wrap, h('p', { style: { margin: 0, color: '#666' } }, '請先在上方「照片」欄位上傳照片，再回來調整構圖。'));

      var imgStyle = {
        width: '100%', height: '100%', objectFit: 'cover', pointerEvents: 'none', userSelect: 'none',
        objectPosition: x + '% ' + y + '%', transform: 'scale(' + z + ')', transformOrigin: x + '% ' + y + '%',
      };
      function slider(label, val, min, max, step, onSet, fmt) {
        return h('label', { style: { display: 'block', margin: '10px 0' } },
          h('span', { style: { display: 'flex', justifyContent: 'space-between', fontSize: '14px', marginBottom: '4px' } }, label, h('b', null, fmt(val))),
          h('input', { type: 'range', min: min, max: max, step: step, value: val, 'aria-label': label, style: { width: '100%', minHeight: '28px' },
            onChange: function (ev) { onSet(parseFloat(ev.target.value)); } }));
      }

      return h('div', wrap,
        h('p', { style: { margin: '0 0 10px', fontSize: '13px', color: '#666' } }, '在預覽圖上按住拖曳可移動照片，或用下方滑桿調整。前台照片會照這裡的構圖顯示。'),
        h('div', { style: { display: 'flex', gap: '16px', flexWrap: 'wrap', marginBottom: '6px' } },
          frames.map(function (f) {
            return h('figure', { key: f.label, style: { margin: 0, width: '160px' } },
              h('div', { onPointerDown: self.startDrag, style: { aspectRatio: f.ratio, overflow: 'hidden', background: '#111', borderRadius: '4px', cursor: 'grab', touchAction: 'none' } },
                h('img', { src: url, alt: '', draggable: false, style: imgStyle })),
              h('figcaption', { style: { fontSize: '12px', color: '#555', textAlign: 'center', marginTop: '4px' } }, f.label));
          })),
        slider('左右位置', x, 0, 100, 1, function (n) { self.save(n, y, z); }, function (n) { return Math.round(n) + '%'; }),
        slider('上下位置', y, 0, 100, 1, function (n) { self.save(x, n, z); }, function (n) { return Math.round(n) + '%'; }),
        slider('放大', z, 1, 2.5, 0.05, function (n) { self.save(x, y, n); }, function (n) { return Math.round(n * 100) + '%'; }),
        h('button', { type: 'button', onClick: function () { self.props.onChange(''); },
          style: { marginTop: '6px', padding: '8px 14px', border: '1px solid #ccc', borderRadius: '4px', background: '#fff', cursor: 'pointer', minHeight: '40px' } }, '恢復預設'));
    },
  });

  CMS.registerWidget('photo-crop', PhotoCrop);
})();
